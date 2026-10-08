import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
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
import { parseClaudeBilling, type ClaudeBilling } from "@/domain/billing";
import { mergeNoteDocs, noteLabel, parseDeskNote, toDeskNote, type DeskNote } from "@/domain/notes";
import { parseGrant, parseInvite, type Grant, type Invite, type ShareKind, type ShareRole } from "@/domain/share";
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
import { createCloudInvite, redeemCloudInvite, removeCloudGrant, setCloudGrantRole } from "./sharing";

const LOCAL_KEY = "projects.workspace.v1";

export type Workspace = {
  projects: Project[];
  signals: Signal[];
  metrics: Metric[];
  events: StoreEvent[];
  commits: Commit[];
  captures: Capture[];
  ideas: Idea[];
  /** This studio starts on Pro for the idea cap. It does not open Claude. */
  plan: Plan;
  /** Server-owned. Null until the billing document says this account paid. */
  claudeBilling: ClaudeBilling | null;
  insight: Insight | null;
  /** Invites this account created. Not part of the uploaded workspace. */
  invites: Invite[];
  /** Canonical grants for people I invited, and grants other people gave me. */
  grants: Grant[];
  /** Projects opened by an invite. Never written into this account's projects. */
  sharedProjects: Project[];
  sharedNotes: DeskNote[];
};

type ListKey = Exclude<keyof Workspace, "insight" | "plan" | "claudeBilling" | "invites" | "grants" | "sharedProjects" | "sharedNotes">;

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
    claudeBilling: null,
    insight: null,
    invites: [],
    grants: [],
    sharedProjects: [],
    sharedNotes: [],
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
    claudeBilling: null,
    insight: parsed.insight ?? null,
    invites: [],
    grants: [],
    sharedProjects: [],
    sharedNotes: [],
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
  uid: string | null;
  email: string | null;
  cloudAvailable: boolean;
  status: Status;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addProject: (input: Pick<Project, "name" | "tagline" | "stage" | "nextStep">) => string;
  toggleCheck: (projectId: string, checkId: string) => void;
  addCheck: (projectId: string, label: string, owner: CheckItem["owner"], kind?: CheckKind) => void;
  addNote: (projectId: string, body: string) => void;
  updateNote: (projectId: string, noteId: string, patch: Partial<Pick<Note, "body" | "title" | "alarmAt">>) => void;
  deleteNote: (projectId: string, noteId: string) => void;
  createInvite: (kind: ShareKind, targetId: string, role: ShareRole) => Promise<Invite>;
  redeemInvite: (code: string) => Promise<Grant>;
  setGrantRole: (grantId: string, role: ShareRole) => Promise<void>;
  removeGrant: (grantId: string) => Promise<void>;
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
  const noteMirror = useRef<DeskNote[]>([]);
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
    const stored = { ...workspace, invites: [], grants: [], sharedProjects: [], sharedNotes: [], claudeBilling: null };
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(stored)).catch(() => undefined);
  }, [workspace, ready]);

  // Cloud mode: every collection under users/{uid} streams into the same workspace shape.
  useEffect(() => {
    if (!fb) return;
    let stops: (() => void)[] = [];
    let generation = 0;
    const stopAuth = onAuthStateChanged(fb.auth, (user) => {
      stops.forEach((stop) => stop());
      stops = [];
      setUid(user?.uid ?? null);
      setEmail(user?.email ?? null);
      if (!user) {
        noteMirror.current = [];
        setWorkspace((current) => ({ ...current, claudeBilling: null, invites: [], grants: [], sharedProjects: [], sharedNotes: [] }));
        return;
      }

      const root = (name: string) => collection(fb.db, "users", user.uid, name);
      const uploaded = new Set<ListKey>();
      const gen = ++generation;
      const writeMirrors = (notes: DeskNote[]) => {
        if (notes.length === 0) return;
        const batch = writeBatch(fb.db);
        for (const note of notes.slice(0, 400)) batch.set(doc(fb.db, "users", user.uid, "notes", note.id), note);
        void batch.commit();
      };
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
              if (key === "projects") writeMirrors(latest.current.projects.flatMap((project) => project.notes.map((note) => toDeskNote(note, project.id, project.name))));
              return;
            }
            const rows = snapshot.docs.map((item) => item.data());
            if (key === "projects") {
              const projects = rows as Project[];
              const known = new Set(noteMirror.current.map((note) => note.id));
              writeMirrors(projects.flatMap((project) => project.notes.filter((note) => !known.has(note.id)).map((note) => toDeskNote(note, project.id, project.name))));
              setWorkspace((current) => ({ ...current, projects: mergeNoteDocs(projects, noteMirror.current) }));
              return;
            }
            setWorkspace((current) => ({ ...current, [key]: rows }));
          }),
        );
      });
      stops.push(
        onSnapshot(root("notes"), (snapshot) => {
          noteMirror.current = snapshot.docs.flatMap((item) => {
            const parsed = parseDeskNote(item.id, item.data() as Record<string, unknown>);
            return parsed ? [parsed] : [];
          });
          setWorkspace((current) => ({ ...current, projects: mergeNoteDocs(current.projects, noteMirror.current) }));
        }, () => undefined),
      );
      stops.push(
        onSnapshot(query(collection(fb.db, "invites"), where("ownerId", "==", user.uid)), (snapshot) => {
          const invites = snapshot.docs.flatMap((item) => {
            const parsed = parseInvite(item.id, item.data() as Record<string, unknown>);
            return parsed ? [parsed] : [];
          });
          setWorkspace((current) => ({ ...current, invites }));
        }, () => undefined),
      );
      stops.push(
        onSnapshot(root("grants"), (snapshot) => {
          void (async () => {
            const rows: Grant[] = [];
            for (const item of snapshot.docs) {
              const parsed = parseGrant(item.id, item.data() as Record<string, unknown>);
              if (!parsed) continue;
              if (parsed.ownerId === user.uid) {
                rows.push(parsed);
                continue;
              }
              const canonical = await getDoc(doc(fb.db, "users", parsed.ownerId, "grants", parsed.id)).catch(() => null);
              const confirmed = canonical?.exists() ? parseGrant(canonical.id, canonical.data() as Record<string, unknown>) : null;
              if (confirmed && confirmed.memberId === user.uid) rows.push(confirmed);
            }
            if (gen !== generation) return;
            setWorkspace((current) => ({ ...current, grants: rows }));
          })();
        }, () => undefined),
      );
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
      stops.push(
        onSnapshot(doc(fb.db, "users", user.uid, "billing", "claude"), (snapshot) => {
          setWorkspace((current) => ({ ...current, claudeBilling: snapshot.exists() ? parseClaudeBilling(snapshot.data()) : null }));
        }),
      );
    });
    return () => {
      stops.forEach((stop) => stop());
      stopAuth();
    };
  }, [fb]);

  useEffect(() => {
    if (!fb || !uid) return;
    const received = workspace.grants.filter((grant) => grant.ownerId !== uid && grant.memberId === uid);
    setWorkspace((current) => ({
      ...current,
      sharedProjects: current.sharedProjects.filter((project) => received.some((grant) => grant.kind === "project" && grant.targetId === project.id)),
      sharedNotes: current.sharedNotes.filter((note) => received.some((grant) => grant.kind === "note" && grant.targetId === note.id)),
    }));
    const stops = received.map((grant) =>
      onSnapshot(
        doc(fb.db, "users", grant.ownerId, grant.kind === "project" ? "projects" : "notes", grant.targetId),
        (snapshot) => {
          if (grant.kind === "project") {
            setWorkspace((current) => {
              const rest = current.sharedProjects.filter((project) => project.id !== grant.targetId);
              if (!snapshot.exists()) return { ...current, sharedProjects: rest };
              const data = snapshot.data() as Project;
              return {
                ...current,
                sharedProjects: [...rest, { ...data, id: grant.targetId, notes: data.notes ?? [], checks: data.checks ?? [], connections: data.connections ?? [], platforms: data.platforms ?? [] }],
              };
            });
            return;
          }
          const parsed = snapshot.exists() ? parseDeskNote(grant.targetId, snapshot.data() as Record<string, unknown>) : null;
          setWorkspace((current) => {
            const rest = current.sharedNotes.filter((note) => note.id !== grant.targetId);
            return parsed ? { ...current, sharedNotes: [...rest, parsed] } : { ...current, sharedNotes: rest };
          });
        },
        () => {
          setWorkspace((current) => ({
            ...current,
            sharedProjects: current.sharedProjects.filter((project) => project.id !== grant.targetId),
            sharedNotes: current.sharedNotes.filter((note) => note.id !== grant.targetId),
          }));
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [fb, uid, workspace.grants]);

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
      const owned = latest.current.projects.find((item) => item.id === id);
      const nextOf = (project: Project) => ({ ...change(project), lastActivityAt: new Date().toISOString() });
      if (owned) {
        const next = nextOf(owned);
        if (fb && uid) {
          const previous = new Map(owned.notes.map((note) => [note.id, note]));
          for (const note of next.notes) {
            const before = previous.get(note.id);
            if (before && before.body === note.body && before.title === note.title && before.alarmAt === note.alarmAt && before.author === note.author) continue;
            void setDoc(doc(fb.db, "users", uid, "notes", note.id), toDeskNote(note, next.id, next.name));
          }
          for (const noteId of previous.keys()) {
            if (!next.notes.some((note) => note.id === noteId)) void deleteDoc(doc(fb.db, "users", uid, "notes", noteId));
          }
        }
        put("projects", next);
        return;
      }
      const grant = latest.current.grants.find((item) => item.kind === "project" && item.targetId === id && item.memberId === uid && item.role === "edit");
      const shared = latest.current.sharedProjects.find((item) => item.id === id);
      if (!grant || !shared || !fb || !uid) return;
      const next = nextOf(shared);
      setWorkspace((current) => ({
        ...current,
        sharedProjects: current.sharedProjects.map((item) => (item.id === id ? next : item)),
      }));
      void updateDoc(doc(fb.db, "users", grant.ownerId, "projects", id), {
        nextStep: next.nextStep,
        checks: next.checks,
        notes: next.notes,
        stage: next.stage,
        tagline: next.tagline,
        lastActivityAt: next.lastActivityAt,
      });
      const previous = new Map(shared.notes.map((note) => [note.id, note]));
      for (const note of next.notes) {
        const before = previous.get(note.id);
        if (before && before.body === note.body && before.title === note.title && before.alarmAt === note.alarmAt) continue;
        if (!before) continue;
        void updateDoc(doc(fb.db, "users", grant.ownerId, "notes", note.id), {
          body: note.body,
          ...(note.title !== undefined ? { title: note.title } : {}),
          ...(note.alarmAt !== undefined ? { alarmAt: note.alarmAt } : {}),
        }).catch(() => undefined);
      }
    },
    [fb, uid, put],
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
      uid,
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
      updateNote: (projectId, noteId, patch) => {
        const clean: Partial<Pick<Note, "body" | "title" | "alarmAt">> = {};
        if (patch.body !== undefined) {
          const body = patch.body.trim();
          if (!body) return;
          clean.body = body;
        }
        if (patch.title !== undefined) clean.title = patch.title.trim().slice(0, 60);
        if (patch.alarmAt !== undefined) clean.alarmAt = patch.alarmAt;
        if (Object.keys(clean).length === 0) return;
        const onProject = latest.current.projects.some((item) => item.id === projectId) || latest.current.sharedProjects.some((item) => item.id === projectId);
        if (onProject) {
          withProject(projectId, (project) => ({
            ...project,
            notes: project.notes.map((note) => (note.id === noteId ? { ...note, ...clean } : note)),
          }));
          return;
        }
        const grant = latest.current.grants.find((item) => item.kind === "note" && item.targetId === noteId && item.memberId === uid && item.role === "edit");
        if (!grant || !fb) return;
        setWorkspace((current) => ({
          ...current,
          sharedNotes: current.sharedNotes.map((note) => (note.id === noteId ? { ...note, ...clean } : note)),
        }));
        void updateDoc(doc(fb.db, "users", grant.ownerId, "notes", noteId), clean);
      },
      deleteNote: (projectId, noteId) => {
        if (!latest.current.projects.some((item) => item.id === projectId)) return;
        withProject(projectId, (project) => ({ ...project, notes: project.notes.filter((note) => note.id !== noteId) }));
      },
      createInvite: async (kind, targetId, role) => {
        if (!fb || !uid) throw new Error("Paylaşmak için giriş yap.");
        if (kind === "project") {
          const project = latest.current.projects.find((item) => item.id === targetId);
          if (!project) throw new Error("Bu projeyi yalnızca sahibi paylaşabilir.");
          await setDoc(doc(fb.db, "users", uid, "projects", project.id), project);
          return createCloudInvite(fb.db, { ownerId: uid, kind, targetId, role, label: project.name.trim() || "Proje" });
        }
        const project = latest.current.projects.find((item) => item.notes.some((note) => note.id === targetId));
        const note = project?.notes.find((item) => item.id === targetId);
        if (!project || !note) throw new Error("Bu notu yalnızca sahibi paylaşabilir.");
        return createCloudInvite(fb.db, {
          ownerId: uid,
          kind: "note",
          targetId: note.id,
          role,
          label: noteLabel(note),
          note: toDeskNote(note, project.id, project.name),
        });
      },
      redeemInvite: async (code) => {
        if (!fb || !uid) throw new Error("Katılmak için giriş yap.");
        return redeemCloudInvite(fb.db, uid, code);
      },
      setGrantRole: async (grantId, role) => {
        if (!fb || !uid) throw new Error("Paylaşmak için giriş yap.");
        const grant = latest.current.grants.find((item) => item.id === grantId && item.ownerId === uid);
        if (!grant) throw new Error("Bunu yalnızca sahibi değiştirebilir.");
        await setCloudGrantRole(fb.db, grant, role);
      },
      removeGrant: async (grantId) => {
        if (!fb || !uid) throw new Error("Paylaşmak için giriş yap.");
        const grant = latest.current.grants.find((item) => item.id === grantId && item.ownerId === uid);
        if (!grant) throw new Error("Bunu yalnızca sahibi kaldırabilir.");
        await removeCloudGrant(fb.db, grant);
      },
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
