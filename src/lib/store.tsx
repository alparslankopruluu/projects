"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { createBrief } from "./brief";
import { step, withChecks } from "./checks";
import { inferBusiness } from "./ops";
import { connectFirebase, readStoredConfig } from "./firebase";
import { seedProjects } from "./seed";
import type { Attention, Note, Project } from "./types";

const LOCAL_KEY = "projects.shelf.v1";
const TOKEN_KEY = "projects.githubToken";
const EVENT = "projects-shelf";
const SERVER_PROJECTS = sorted(seedProjects());

type ShelfContextValue = {
  mode: "local" | "firebase";
  email: string | null;
  projects: Project[];
  githubToken: string;
  setGithubToken: (token: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  reorder: (fromId: string, toId: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  addProject: (input: {
    name: string;
    reason: string;
    attention: Attention;
    version: string;
    status: string;
    repo: string;
  }) => string;
  removeProject: (id: string) => void;
  addNote: (projectId: string, body: string, visibility: Note["visibility"]) => void;
  removeNote: (projectId: string, noteId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutShelf: () => Promise<void>;
};

const ShelfContext = createContext<ShelfContextValue | null>(null);

function sorted(projects: Project[]) {
  return [...projects].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "tr"));
}

function withPriority(projects: Project[]) {
  return projects.map((project, index) => ({ ...project, priority: index }));
}

function readProjects(raw: string | null): Project[] {
  if (!raw) return SERVER_PROJECTS;
  try {
    const parsed = JSON.parse(raw) as Project[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SERVER_PROJECTS;
    return sorted(parsed.map((project) => ({ ...withChecks(project), businessType: inferBusiness(project) })));
  } catch {
    return SERVER_PROJECTS;
  }
}

let cachedRaw: string | null = null;
let cachedProjects: Project[] = SERVER_PROJECTS;

function getSnapshot() {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (raw === cachedRaw) return cachedProjects;
  cachedRaw = raw;
  cachedProjects = readProjects(raw);
  return cachedProjects;
}

function getServerSnapshot() {
  return SERVER_PROJECTS;
}

let cachedToken = "";
let cachedTokenRaw: string | null = null;

function getTokenSnapshot() {
  const raw = window.localStorage.getItem(TOKEN_KEY) ?? "";
  if (raw === cachedTokenRaw) return cachedToken;
  cachedTokenRaw = raw;
  cachedToken = raw;
  return cachedToken;
}

function getTokenServer() {
  return "";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function writeLocal(projects: Project[]) {
  const raw = JSON.stringify(projects);
  window.localStorage.setItem(LOCAL_KEY, raw);
  cachedRaw = raw;
  cachedProjects = projects;
  window.dispatchEvent(new Event(EVENT));
}

function writeToken(token: string) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  cachedTokenRaw = token;
  cachedToken = token;
  window.dispatchEvent(new Event(EVENT));
}

function slug(name: string) {
  const base = name
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "proje";
}

export function ShelfProvider({ children }: { children: ReactNode }) {
  const projects = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const githubToken = useSyncExternalStore(subscribe, getTokenSnapshot, getTokenServer);
  const [mode, setMode] = useState<"local" | "firebase">("local");
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(LOCAL_KEY)) writeLocal(SERVER_PROJECTS);

    const config = readStoredConfig();
    if (!config) return;

    const { auth, db } = connectFirebase(config);
    let stopSnap: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user: User | null) => {
      stopSnap?.();
      stopSnap = undefined;
      if (!user) {
        setMode("local");
        setEmail(null);
        setUid(null);
        return;
      }
      setEmail(user.email);
      setUid(user.uid);
      setMode("firebase");
      stopSnap = onSnapshot(
        collection(db, "users", user.uid, "projects"),
        (snapshot) => {
          if (snapshot.empty) {
            const initial = getSnapshot();
            writeLocal(initial);
            for (const project of initial) {
              void setDoc(doc(db, "users", user.uid, "projects", project.id), project);
            }
            return;
          }
          writeLocal(sorted(snapshot.docs.map((item) => item.data() as Project)));
        },
        () => undefined,
      );
    });

    return () => {
      stopSnap?.();
      stopAuth();
    };
  }, []);

  const persistOne = useCallback(
    (project: Project) => {
      const config = readStoredConfig();
      if (!uid || !config) return;
      const { db } = connectFirebase(config);
      void setDoc(doc(db, "users", uid, "projects", project.id), project);
    },
    [uid],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      const list = getSnapshot().map((project) => (project.id === id ? { ...project, ...patch } : project));
      writeLocal(list);
      const updated = list.find((project) => project.id === id);
      if (updated) persistOne(updated);
    },
    [persistOne],
  );

  const reorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const list = sorted(getSnapshot());
      const from = list.findIndex((project) => project.id === fromId);
      const to = list.findIndex((project) => project.id === toId);
      if (from < 0 || to < 0) return;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      const next = withPriority(list);
      writeLocal(next);
      for (const project of next) persistOne(project);
    },
    [persistOne],
  );

  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const list = sorted(getSnapshot());
      const index = list.findIndex((project) => project.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return;
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
      const next = withPriority(list);
      writeLocal(next);
      for (const project of next) persistOne(project);
    },
    [persistOne],
  );

  const addProject = useCallback(
    (input: {
      name: string;
      reason: string;
      attention: Attention;
      version: string;
      status: string;
      repo: string;
    }) => {
      const current = getSnapshot();
      const taken = new Set(current.map((project) => project.id));
      let id = slug(input.name);
      let n = 2;
      while (taken.has(id)) id = `${slug(input.name)}-${n++}`;
      const platforms = [{ os: "ios" as const, version: input.version || "—", status: input.status || "Taslak" }];
      const submitted = input.attention === "live" || input.attention === "ready" || input.attention === "waiting_review" || input.attention === "review_message";
      const repo = input.repo.trim();
      const project: Project = {
        id,
        name: input.name.trim(),
        reason: input.reason.trim(),
        attention: input.attention,
        priority: current.length,
        repo,
        firebaseProject: "",
        stack: "",
        platforms,
        links: repo ? [{ label: "GitHub", url: `https://github.com/${repo}` }] : [],
        checks: [
          step("app_store", "App Store", submitted, "you"),
          ...(input.attention === "review_message"
            ? [step("review", "İnceleme mesajı", false, "you" as const)]
            : input.attention === "waiting_review"
              ? [step("review", "İnceleme", false, "apple" as const)]
              : []),
          step("google_play", "Google Play", false, "later"),
          step("web", "Web", false, "later"),
          step("ads", "Reklam", false, "later"),
        ],
        notes: [],
        members: [{ email: email ?? "kprl884@gmail.com", role: "owner" }],
        briefUpdatedAt: null,
        lastCommitSha: null,
        brief: createBrief({
          name: input.name.trim(),
          reason: input.reason.trim() || "Not yok.",
          platforms,
          repo,
          stack: "",
          open: input.reason.trim() ? [input.reason.trim()] : ["İlk notu yaz."],
        }),
      };
      const next = withPriority(sorted([...current, project]));
      writeLocal(next);
      persistOne(next.find((item) => item.id === id) ?? project);
      return id;
    },
    [email, persistOne],
  );

  const removeProject = useCallback(
    (id: string) => {
      const next = withPriority(sorted(getSnapshot().filter((project) => project.id !== id)));
      writeLocal(next);
      for (const project of next) persistOne(project);
      const config = readStoredConfig();
      if (uid && config) {
        const { db } = connectFirebase(config);
        void deleteDoc(doc(db, "users", uid, "projects", id));
      }
    },
    [persistOne, uid],
  );

  const addNote = useCallback(
    (projectId: string, body: string, visibility: Note["visibility"]) => {
      const text = body.trim();
      if (!text) return;
      const note: Note = {
        id: crypto.randomUUID(),
        body: text,
        createdAt: new Date().toISOString(),
        visibility,
      };
      const list = getSnapshot().map((project) =>
        project.id === projectId ? { ...project, notes: [...project.notes, note] } : project,
      );
      writeLocal(list);
      const updated = list.find((project) => project.id === projectId);
      if (updated) persistOne(updated);
    },
    [persistOne],
  );

  const removeNote = useCallback(
    (projectId: string, noteId: string) => {
      const list = getSnapshot().map((project) =>
        project.id === projectId
          ? { ...project, notes: project.notes.filter((note) => note.id !== noteId) }
          : project,
      );
      writeLocal(list);
      const updated = list.find((project) => project.id === projectId);
      if (updated) persistOne(updated);
    },
    [persistOne],
  );

  const setGithubToken = useCallback((token: string) => {
    writeToken(token);
  }, []);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    const config = readStoredConfig();
    if (!config) throw new Error("Önce Firebase ayarını kaydet.");
    const { auth } = connectFirebase(config);
    await signInWithEmailAndPassword(auth, nextEmail, password);
  }, []);

  const signUp = useCallback(async (nextEmail: string, password: string) => {
    const config = readStoredConfig();
    if (!config) throw new Error("Önce Firebase ayarını kaydet.");
    const { auth } = connectFirebase(config);
    await createUserWithEmailAndPassword(auth, nextEmail, password);
  }, []);

  const signOutShelf = useCallback(async () => {
    const config = readStoredConfig();
    if (!config) return;
    const { auth } = connectFirebase(config);
    await signOut(auth);
    setMode("local");
    setEmail(null);
    setUid(null);
  }, []);

  const value = useMemo<ShelfContextValue>(
    () => ({
      mode,
      email,
      projects,
      githubToken,
      setGithubToken,
      updateProject,
      reorder,
      move,
      addProject,
      removeProject,
      addNote,
      removeNote,
      signIn,
      signUp,
      signOutShelf,
    }),
    [
      mode,
      email,
      projects,
      githubToken,
      setGithubToken,
      updateProject,
      reorder,
      move,
      addProject,
      removeProject,
      addNote,
      removeNote,
      signIn,
      signUp,
      signOutShelf,
    ],
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}

export function useShelf() {
  const value = useContext(ShelfContext);
  if (!value) throw new Error("useShelf must be used inside ShelfProvider");
  return value;
}
