import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { arrayUnion, collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  HALLOWEEN,
  REJECTION_CHECKS,
  canKeepIdea,
  ideasFromBasket,
  missingChecks,
  prepareCapture,
  REMIND_AFTER_DAYS,
} from "@/domain/basket";
import type {
  Capture,
  CaptureKind,
  CheckItem,
  CheckKind,
  Commit,
  Connection,
  Idea,
  Insight,
  Metric,
  MetricKey,
  Note,
  Plan,
  Project,
  Signal,
  StoreEvent,
} from "@/domain/model";
import { seedProjects, seedSignals } from "@/domain/seed";

import { firebase } from "./firebase";

const LOCAL_KEY = "projects.workspace.v1";

export type Workspace = {
  projects: Project[];
  signals: Signal[];
  metrics: Metric[];
  events: StoreEvent[];
  commits: Commit[];
  captures: Capture[];
  ideas: Idea[];
  /** This studio starts on Pro. Billing is not connected, so the flag is a product gate, not a charge. */
  plan: Plan;
  insight: Insight | null;
};

type ListKey = Exclude<keyof Workspace, "insight" | "plan">;

const ID_FIELD: Record<ListKey, "id" | "sha"> = {
  projects: "id",
  signals: "id",
  metrics: "id",
  events: "id",
  commits: "sha",
  captures: "id",
  ideas: "id",
};

function seedWorkspace(): Workspace {
  return {
    projects: seedProjects(),
    signals: seedSignals(),
    metrics: [],
    events: [],
    commits: [],
    captures: [],
    ideas: [],
    plan: "pro",
    insight: null,
  };
}

function hydrateWorkspace(parsed: Partial<Workspace>): Workspace {
  const base = seedWorkspace();
  return {
    ...base,
    ...parsed,
    projects: Array.isArray(parsed.projects) && parsed.projects.length > 0 ? parsed.projects : base.projects,
    signals: Array.isArray(parsed.signals) ? parsed.signals : base.signals,
    metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
    commits: Array.isArray(parsed.commits) ? parsed.commits : [],
    captures: Array.isArray(parsed.captures) ? parsed.captures : [],
    ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
    plan: parsed.plan === "free" ? "free" : "pro",
    insight: parsed.insight ?? null,
  };
}

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function upsert<T>(list: T[], item: T, key: keyof T): T[] {
  const index = list.findIndex((entry) => entry[key] === item[key]);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export type Credentials = {
  github?: { token: string };
  vercel?: { token: string; teamId?: string };
  appstore?: { issuerId: string; keyId: string; privateKey: string };
  supabase?: { accessToken: string };
};

type Status = { busy: "analyze" | "sync" | null; error: string | null };

type StoreValue = Workspace & {
  ready: boolean;
  mode: "local" | "cloud";
  email: string | null;
  cloudAvailable: boolean;
  status: Status;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addProject: (input: Pick<Project, "name" | "tagline" | "stage" | "nextStep">) => string;
  toggleCheck: (projectId: string, checkId: string) => void;
  addCheck: (projectId: string, label: string, owner: CheckItem["owner"], kind?: CheckKind) => void;
  addNote: (projectId: string, body: string) => void;
  addCapture: (input: { title: string; body: string; url: string; kind: CaptureKind; projectId: string | null }) => void;
  updateCapture: (id: string, patch: Partial<Pick<Capture, "read" | "category" | "kind">>) => void;
  removeCapture: (id: string) => void;
  mintIdeas: () => number;
  keepIdea: (id: string) => boolean;
  applyIdea: (id: string) => boolean;
  setPlan: (plan: Plan) => void;
  addSeasonChecks: () => number;
  addRejectionWork: (projectId: string) => void;
  addConnection: (projectId: string, connection: Connection) => void;
  removeConnection: (projectId: string, kind: Connection["kind"], ref: string) => void;
  addMetric: (projectId: string, key: MetricKey, value: number) => void;
  addEvent: (event: Omit<StoreEvent, "id" | "at">) => void;
  markRead: (signalId: string) => void;
  markAllRead: () => void;
  saveCredentials: (patch: Credentials) => Promise<void>;
  analyze: () => Promise<void>;
  sync: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetLocal: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(seedWorkspace);
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ busy: null, error: null });
  // Actions read the newest workspace without being rebuilt on every change.
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  }, [workspace]);
  const fb = firebase();

  // Local-first: hydrate from AsyncStorage, fall back to the seeded studio.
  useEffect(() => {
    AsyncStorage.getItem(LOCAL_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Workspace>;
        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          setWorkspace(hydrateWorkspace(parsed));
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(workspace)).catch(() => undefined);
  }, [workspace, ready]);

  // Cloud mode: every collection under users/{uid} streams into the same workspace shape.
  useEffect(() => {
    if (!fb) return;
    let stops: (() => void)[] = [];
    const stopAuth = onAuthStateChanged(fb.auth, (user) => {
      stops.forEach((stop) => stop());
      stops = [];
      setUid(user?.uid ?? null);
      setEmail(user?.email ?? null);
      if (!user) return;

      const root = (name: string) => collection(fb.db, "users", user.uid, name);
      const uploaded = new Set<ListKey>();
      (Object.keys(ID_FIELD) as ListKey[]).forEach((key) => {
        stops.push(
          onSnapshot(root(key), (snapshot) => {
            // An empty cloud collection must not wipe a local list. Upload once, then wait for the echo.
            if (snapshot.empty) {
              if (!uploaded.has(key)) {
                uploaded.add(key);
                const local = latest.current[key];
                if (local.length > 0) {
                  const batch = writeBatch(fb.db);
                  for (const item of local) {
                    const id = String((item as Record<string, unknown>)[ID_FIELD[key]]);
                    batch.set(doc(fb.db, "users", user.uid, key, id), item);
                  }
                  void batch.commit();
                }
              }
              return;
            }
            const rows = snapshot.docs.map((item) => item.data());
            setWorkspace((current) => ({ ...current, [key]: rows }));
          }),
        );
      });
      stops.push(
        onSnapshot(doc(fb.db, "users", user.uid, "insights", "latest"), (snapshot) => {
          setWorkspace((current) => ({ ...current, insight: snapshot.exists() ? (snapshot.data() as Insight) : current.insight }));
        }),
      );
      stops.push(
        onSnapshot(doc(fb.db, "users", user.uid, "desk", "profile"), (snapshot) => {
          if (!snapshot.exists()) {
            void setDoc(doc(fb.db, "users", user.uid, "desk", "profile"), { plan: latest.current.plan });
            return;
          }
          const plan = snapshot.data().plan === "free" ? "free" : "pro";
          setWorkspace((current) => ({ ...current, plan }));
        }),
      );
    });
    return () => {
      stops.forEach((stop) => stop());
      stopAuth();
    };
  }, [fb]);

  const put = useCallback(
    <K extends ListKey>(key: K, item: Workspace[K][number]) => {
      const idField = ID_FIELD[key];
      setWorkspace((current) => ({
        ...current,
        [key]: upsert(current[key] as Workspace[K][number][], item, idField as keyof Workspace[K][number]),
      }));
      if (fb && uid) {
        const id = String((item as Record<string, unknown>)[idField]);
        void setDoc(doc(fb.db, "users", uid, key, id), item);
      }
    },
    [fb, uid],
  );

  const drop = useCallback(
    (key: "captures" | "ideas", id: string) => {
      setWorkspace((current) => ({
        ...current,
        [key]: current[key].filter((item) => item.id !== id),
      }));
      if (fb && uid) void deleteDoc(doc(fb.db, "users", uid, key, id));
    },
    [fb, uid],
  );

  const replaceIdeas = useCallback(
    (items: Idea[]) => {
      const previous = latest.current.ideas;
      setWorkspace((current) => ({ ...current, ideas: items }));
      if (!fb || !uid) return;
      const nextIds = new Set(items.map((item) => item.id));
      const batch = writeBatch(fb.db);
      for (const item of items) batch.set(doc(fb.db, "users", uid, "ideas", item.id), item);
      for (const item of previous) {
        if (!nextIds.has(item.id)) batch.delete(doc(fb.db, "users", uid, "ideas", item.id));
      }
      void batch.commit();
    },
    [fb, uid],
  );

  const withProject = useCallback(
    (id: string, change: (project: Project) => Project) => {
      const project = latest.current.projects.find((item) => item.id === id);
      if (!project) return;
      put("projects", { ...change(project), lastActivityAt: new Date().toISOString() });
    },
    [put],
  );

  const callable = useCallback(
    async (name: "analyze" | "syncSources", busy: Status["busy"]) => {
      if (!fb || !uid) {
        setStatus({ busy: null, error: "Bu özellik için Firebase ile giriş yap." });
        return;
      }
      setStatus({ busy, error: null });
      try {
        // A Claude analysis can outlast the SDK's 70s default.
        await httpsCallable(fb.functions, name, { timeout: 300_000 })();
        setStatus({ busy: null, error: null });
      } catch (error) {
        setStatus({ busy: null, error: error instanceof Error ? error.message : "İstek başarısız." });
      }
    },
    [fb, uid],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...workspace,
      ready,
      mode: uid ? "cloud" : "local",
      email,
      cloudAvailable: Boolean(fb),
      status,
      updateProject: (id, patch) => withProject(id, (project) => ({ ...project, ...patch })),
      addProject: (input) => {
        const id = newId();
        const now = new Date().toISOString();
        put("projects", {
          ...input,
          id,
          hue: Math.floor(Math.random() * 360),
          priority: latest.current.projects.length,
          platforms: [],
          connections: [],
          checks: [],
          notes: [],
          startedAt: now,
          lastActivityAt: now,
          archived: false,
        });
        return id;
      },
      toggleCheck: (projectId, checkId) =>
        withProject(projectId, (project) => ({
          ...project,
          checks: project.checks.map((item) => (item.id === checkId ? { ...item, done: !item.done } : item)),
        })),
      addCheck: (projectId, label, owner, kind) =>
        withProject(projectId, (project) => ({
          ...project,
          checks: [...project.checks, { id: newId(), label, done: false, owner, ...(kind ? { kind } : {}) }],
        })),
      addNote: (projectId, body) =>
        withProject(projectId, (project) => {
          const note: Note = { id: newId(), body, createdAt: new Date().toISOString(), author: "you" };
          return { ...project, notes: [note, ...project.notes] };
        }),
      addConnection: (projectId, connection) =>
        withProject(projectId, (project) => ({
          ...project,
          connections: [...project.connections.filter((item) => !(item.kind === connection.kind && item.ref === connection.ref)), connection],
        })),
      removeConnection: (projectId, kind, ref) =>
        withProject(projectId, (project) => ({
          ...project,
          connections: project.connections.filter((item) => !(item.kind === kind && item.ref === ref)),
        })),
      addMetric: (projectId, key, metricValue) => {
        const previous = latest.current.metrics
          .filter((item) => item.projectId === projectId && item.key === key)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
        put("metrics", {
          id: newId(),
          projectId,
          key,
          value: metricValue,
          previous: previous?.value ?? null,
          period: "week",
          source: "manual",
          recordedAt: new Date().toISOString(),
        });
      },
      addEvent: (event) => {
        const at = new Date().toISOString();
        put("events", { ...event, id: newId(), at });
        // A hand-logged rejection is as urgent as a synced one.
        if (event.kind === "rejected" || event.kind === "deploy_failed") {
          const name = latest.current.projects.find((item) => item.id === event.projectId)?.name ?? "Proje";
          put("signals", {
            id: newId(),
            projectId: event.projectId,
            source: event.source,
            severity: "critical",
            title: event.kind === "rejected" ? `${name} ${event.version} reddedildi` : `${name} deploy başarısız`,
            body: event.detail,
            createdAt: at,
            read: false,
            dedupeKey: `${event.source}:${event.projectId}:${event.kind}:${event.version}`,
          });
        }
      },
      markRead: (signalId) => {
        const signal = latest.current.signals.find((item) => item.id === signalId);
        if (signal && !signal.read) put("signals", { ...signal, read: true });
      },
      markAllRead: () => {
        for (const signal of latest.current.signals) if (!signal.read) put("signals", { ...signal, read: true });
      },
      addCapture: (input) => {
        const title = input.title.trim();
        const body = input.body.trim();
        if (!title && !body) return;
        const prepared = prepareCapture({ ...input, title, body });
        const item: Capture = {
          id: newId(),
          title: title || body.slice(0, 80),
          body,
          url: input.url.trim(),
          kind: prepared.kind,
          category: prepared.category,
          projectId: input.projectId,
          read: false,
          createdAt: new Date().toISOString(),
          remindAfterDays: REMIND_AFTER_DAYS,
        };
        put("captures", item);
      },
      updateCapture: (id, patch) => {
        const current = latest.current.captures.find((item) => item.id === id);
        if (!current) return;
        put("captures", { ...current, ...patch });
      },
      removeCapture: (id) => drop("captures", id),
      mintIdeas: () => {
        const now = new Date().toISOString();
        const kept = latest.current.ideas.filter((item) => item.kept);
        const fresh: Idea[] = ideasFromBasket(latest.current.captures, latest.current.projects).map((item) => ({
          ...item,
          id: newId(),
          createdAt: now,
          kept: false,
        }));
        replaceIdeas([...kept, ...fresh]);
        return fresh.length;
      },
      keepIdea: (id) => {
        const idea = latest.current.ideas.find((item) => item.id === id);
        if (!idea || idea.kept) return Boolean(idea?.kept);
        const kept = latest.current.ideas.filter((item) => item.kept).length;
        if (!canKeepIdea(latest.current.plan, kept)) return false;
        put("ideas", { ...idea, kept: true });
        return true;
      },
      applyIdea: (id) => {
        const idea = latest.current.ideas.find((item) => item.id === id);
        if (!idea) return false;
        const keptOthers = latest.current.ideas.filter((item) => item.kept && item.id !== id).length;
        if (!canKeepIdea(latest.current.plan, keptOthers)) return false;
        const now = new Date().toISOString();
        if (idea.target === "new" || !idea.projectId) {
          const projectId = newId();
          put("projects", {
            id: projectId,
            name: idea.title.slice(0, 42),
            tagline: "Sepetten açıldı",
            hue: Math.floor(Math.random() * 360),
            stage: "idea",
            priority: latest.current.projects.length,
            nextStep: idea.body.slice(0, 180),
            platforms: [],
            connections: [],
            checks: [{ id: newId(), label: "Fikri bir cümlelik ürüne indir", done: false, owner: "you", kind: "task" }],
            notes: [{ id: newId(), body: idea.body, createdAt: now, author: "you" }],
            startedAt: now,
            lastActivityAt: now,
            archived: false,
          });
          put("ideas", { ...idea, kept: true, projectId, target: "new" });
          return true;
        }
        withProject(idea.projectId, (project) => ({
          ...project,
          nextStep: idea.title,
          checks: project.checks.some((item) => item.label === idea.title)
            ? project.checks
            : [...project.checks, { id: newId(), label: idea.title, done: false, owner: "you" as const, kind: "task" as const }],
          notes: [{ id: newId(), body: idea.body, createdAt: now, author: "you" as const }, ...project.notes],
        }));
        put("ideas", { ...idea, kept: true });
        return true;
      },
      setPlan: (plan) => {
        setWorkspace((current) => ({ ...current, plan }));
        if (fb && uid) void setDoc(doc(fb.db, "users", uid, "desk", "profile"), { plan }, { merge: true });
      },
      addSeasonChecks: () => {
        let added = 0;
        for (const project of latest.current.projects) {
          if (project.archived || project.stage !== "live") continue;
          const extra = missingChecks(project, HALLOWEEN.checks);
          if (extra.length === 0) continue;
          added += extra.length;
          withProject(project.id, (current) => ({
            ...current,
            checks: [
              ...current.checks,
              ...extra.map((item) => ({ id: newId(), label: item.label, done: false, owner: item.owner, kind: item.kind })),
            ],
          }));
        }
        return added;
      },
      addRejectionWork: (projectId) => {
        const project = latest.current.projects.find((item) => item.id === projectId);
        if (!project) return;
        const extra = missingChecks(project, REJECTION_CHECKS);
        if (extra.length === 0) return;
        withProject(projectId, (current) => ({
          ...current,
          checks: [
            ...current.checks,
            ...extra.map((item) => ({ id: newId(), label: item.label, done: false, owner: item.owner, kind: item.kind })),
          ],
        }));
      },
      saveCredentials: async (patch) => {
        if (!fb || !uid) throw new Error("Anahtarlar yalnızca Firebase hesabında saklanır. Önce giriş yap.");
        // private/* is write-only for the client (firestore.rules); only Functions read it back.
        await setDoc(doc(fb.db, "users", uid, "private", "credentials"), patch, { merge: true });
      },
      analyze: () => callable("analyze", "analyze"),
      sync: () => callable("syncSources", "sync"),
      signIn: async (address, password) => {
        if (!fb) throw new Error("Firebase ayarı yok.");
        await signInWithEmailAndPassword(fb.auth, address, password);
      },
      signUp: async (address, password) => {
        if (!fb) throw new Error("Firebase ayarı yok.");
        await createUserWithEmailAndPassword(fb.auth, address, password);
      },
      signOut: async () => {
        if (fb) await firebaseSignOut(fb.auth);
      },
      resetLocal: () => setWorkspace(seedWorkspace()),
    }),
    [workspace, ready, uid, email, fb, status, put, drop, replaceIdeas, withProject, callable],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export async function savePushToken(token: string) {
  const fb = firebase();
  const user = fb?.auth.currentUser;
  if (!fb || !user) return;
  await setDoc(doc(fb.db, "users", user.uid, "private", "credentials"), { expoPushTokens: arrayUnion(token) }, { merge: true });
}
