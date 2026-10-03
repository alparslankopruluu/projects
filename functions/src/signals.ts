import type { DocumentSnapshot } from "firebase-admin/firestore";
import { col, db } from "./admin.js";
import type { Signal } from "./model.js";
import type { SignalDraft } from "./types.js";
import { hashId } from "./util.js";

export const signalIdFor = (dedupeKey: string) => hashId(dedupeKey);

/**
 * Upsert signals by dedupeKey (doc id = hash of dedupeKey).
 * New signals start unread; existing ones keep their `read` flag and original `createdAt`
 * and only get their title/body/severity refreshed.
 */
export async function upsertSignals(uid: string, drafts: SignalDraft[], now = new Date()): Promise<number> {
  if (drafts.length === 0) return 0;
  // Last draft wins if the same key appears twice in one run.
  const byKey = new Map<string, SignalDraft>();
  for (const d of drafts) byKey.set(d.dedupeKey, d);

  const refs = [...byKey.keys()].map((k) => col(uid, "signals").doc(signalIdFor(k)));
  const existing = new Map<string, DocumentSnapshot>();
  for (let i = 0; i < refs.length; i += 300) {
    const snaps = await db.getAll(...refs.slice(i, i + 300));
    for (const s of snaps) existing.set(s.id, s);
  }

  const writer = db.bulkWriter();
  let created = 0;
  for (const [key, draft] of byKey) {
    const id = signalIdFor(key);
    const ref = col(uid, "signals").doc(id);
    const prev = existing.get(id);
    if (prev?.exists) {
      writer.set(
        ref,
        { title: draft.title, body: draft.body, severity: draft.severity, projectId: draft.projectId, source: draft.source },
        { merge: true },
      );
    } else {
      const signal: Signal = { ...draft, id, read: false, createdAt: now.toISOString() };
      writer.set(ref, signal);
      created++;
    }
  }
  await writer.close();
  return created;
}
