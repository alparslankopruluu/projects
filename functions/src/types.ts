import type { Commit, Connection, Project, Signal, StoreEvent } from "./model.js";

// Shape of users/{uid}/private/credentials. Written by the client, never readable by it (see firestore.rules).
export type Credentials = {
  github?: { token: string };
  vercel?: { token: string; teamId?: string };
  appstore?: { issuerId: string; keyId: string; privateKey: string };
  supabase?: { accessToken: string };
  expoPushTokens?: string[];
};

// A signal before it is stored: id, read and createdAt are assigned by upsertSignals.
export type SignalDraft = Omit<Signal, "id" | "read" | "createdAt">;

export type AdapterContext = {
  project: Project;
  connection: Connection;
  credentials: Credentials;
  now: Date;
};

export type AdapterResult = {
  commits: Commit[];
  events: StoreEvent[];
  signals: SignalDraft[];
  // Fields to merge into the project document (stage, platforms, lastActivityAt…).
  projectPatch: Partial<Pick<Project, "stage" | "platforms" | "lastActivityAt">>;
};

export type SourceAdapter = (ctx: AdapterContext) => Promise<AdapterResult>;

export const emptyResult = (): AdapterResult => ({ commits: [], events: [], signals: [], projectPatch: {} });
