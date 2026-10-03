import { logger } from "firebase-functions";
import { col, credentialsDoc, db } from "./admin.js";
import { SOURCE_LABEL, type Connection, type Project } from "./model.js";
import { stallSignals } from "./rules.js";
import { upsertSignals } from "./signals.js";
import { ADAPTERS } from "./sources/index.js";
import type { Credentials, SignalDraft } from "./types.js";
import { errorMessage, truncate } from "./util.js";

export type SyncSummary = {
  projects: number;
  connectionsSynced: number;
  connectionsFailed: number;
  commits: number;
  events: number;
  newSignals: number;
};

export async function loadCredentials(uid: string): Promise<Credentials> {
  const doc = await credentialsDoc(uid).get();
  return (doc.data() as Credentials | undefined) ?? {};
}

export async function loadProjects(uid: string): Promise<Project[]> {
  const snap = await col(uid, "projects").get();
  return snap.docs
    .map((d) => ({ ...(d.data() as Project), id: d.id }))
    .filter((p) => !p.archived);
}

/** All uids that have users/{uid}/private/credentials. */
export async function usersWithCredentials(): Promise<string[]> {
  const snap = await db.collectionGroup("private").select().get();
  const uids = new Set<string>();
  for (const d of snap.docs) {
    const uid = d.ref.parent.parent?.id;
    if (d.id === "credentials" && uid) uids.add(uid);
  }
  return [...uids];
}

/** Pulls every API connection of every project, writes results, then runs the stall rule. */
export async function syncUser(uid: string, now = new Date()): Promise<SyncSummary> {
  const [credentials, projects] = await Promise.all([loadCredentials(uid), loadProjects(uid)]);
  const summary: SyncSummary = {
    projects: projects.length,
    connectionsSynced: 0,
    connectionsFailed: 0,
    commits: 0,
    events: 0,
    newSignals: 0,
  };
  const signals: SignalDraft[] = [];
  const writer = db.bulkWriter();
  const updated: Project[] = [];

  for (const project of projects) {
    const next: Project = { ...project, connections: [...(project.connections ?? [])], platforms: [...(project.platforms ?? [])] };
    let changed = false;

    for (const [i, connection] of next.connections.entries()) {
      if (connection.mode !== "api") continue;
      const adapter = ADAPTERS[connection.kind];
      if (!adapter) continue;
      try {
        const r = await adapter({ project: next, connection, credentials, now });
        for (const c of r.commits) writer.set(col(uid, "commits").doc(c.sha), c);
        for (const e of r.events) writer.set(col(uid, "events").doc(e.id), e);
        signals.push(...r.signals);
        Object.assign(next, r.projectPatch);
        next.connections[i] = { ...connection, lastSyncAt: now.toISOString() } satisfies Connection;
        changed = true;
        summary.connectionsSynced++;
        summary.commits += r.commits.length;
        summary.events += r.events.length;
      } catch (err) {
        // One broken source must not fail the whole sync: surface it as an info signal instead.
        summary.connectionsFailed++;
        const label = SOURCE_LABEL[connection.kind];
        const msg = errorMessage(err);
        logger.warn("adapter failed", { uid, projectId: project.id, kind: connection.kind, error: msg });
        signals.push({
          projectId: project.id,
          source: connection.kind,
          severity: "info",
          title: `${label} senkronu başarısız: ${truncate(msg, 120)}`,
          body: `${project.name} · ${label} (${connection.ref}): ${truncate(msg, 500)}`,
          dedupeKey: `sync-error:${project.id}:${connection.kind}:${connection.ref}`,
        });
      }
    }

    if (changed) {
      writer.set(
        col(uid, "projects").doc(project.id),
        {
          connections: next.connections,
          platforms: next.platforms,
          stage: next.stage,
          lastActivityAt: next.lastActivityAt,
        },
        { merge: true },
      );
    }
    updated.push(next);
  }

  await writer.close();
  signals.push(...stallSignals(updated, now));
  summary.newSignals = await upsertSignals(uid, signals, now);
  logger.info("sync done", { uid, ...summary });
  return summary;
}
