import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { arrayUnion, collection, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type {
  CheckItem,
  Commit,
  Connection,
  Insight,
  Metric,
  MetricKey,
  Note,
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
  insight: Insight | null;
};

type ListKey = Exclude<keyof Workspace, "insight">;

const ID_FIELD: Record<ListKey, "id" | "sha"> = {
  projects: "id",
  signals: "id",
  metrics: "id",
  events: "id",
  commits: "sha",
};

function seedWorkspace(): Workspace {
  return { projects: seedProjects(), signals: seedSignals(), metrics: [], events: [], commits: [], insight: null };
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
  addCheck: (projectId: string, label: string, owner: CheckItem["owner"]) => void;
  addNote: (projectId: string, body: string) => void;
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
          setWorkspace({ ...seedWorkspace(), ...parsed } as Workspace);
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
      let migrated = false;
      (Object.keys(ID_FIELD) as ListKey[]).forEach((key) => {
        stops.push(
          onSnapshot(root(key), (snapshot) => {
            if (key === "projects" && snapshot.empty && !migrated) {
              migrated = true;
              const batch = writeBatch(fb.db);
              const local = latest.current;
              for (const project of local.projects) batch.set(doc(fb.db, "users", user.uid, "projects", project.id), project);
              for (const signal of local.signals) batch.set(doc(fb.db, "users", user.uid, "signals", signal.id), signal);
              for (const metric of local.metrics) batch.set(doc(fb.db, "users", user.uid, "metrics", metric.id), metric);
              void batch.commit();
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
      addCheck: (projectId, label, owner) =>
        withProject(projectId, (project) => ({
          ...project,
          checks: [...project.checks, { id: newId(), label, done: false, owner }],
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
    [workspace, ready, uid, email, fb, status, put, withProject, callable],
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
