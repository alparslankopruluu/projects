import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc, type Firestore } from "firebase/firestore";

import type { DeskNote } from "@/domain/notes";
import {
  buildInvite,
  claimBlock,
  grantFromInvite,
  parseInvite,
  type Grant,
  type Invite,
  type ShareKind,
  type ShareRole,
} from "@/domain/share";

function cloudError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code.includes("permission-denied")) return new Error("Bulut bu daveti henüz kabul etmiyor. Kurallar yayında olmayabilir.");
  if (error instanceof Error) return error;
  return new Error(fallback);
}

function invitePayload(invite: Invite) {
  return {
    ...invite,
    expiresAt: Timestamp.fromDate(new Date(invite.expiresAt)),
  };
}

export async function createCloudInvite(
  db: Firestore,
  input: { ownerId: string; kind: ShareKind; targetId: string; role: ShareRole; label: string; note?: DeskNote },
): Promise<Invite> {
  try {
    if (input.kind === "note") {
      if (!input.note || input.note.id !== input.targetId) throw new Error("Not bulunamadı.");
      await setDoc(doc(db, "users", input.ownerId, "notes", input.note.id), input.note);
    }
    const invite = buildInvite({
      kind: input.kind,
      targetId: input.targetId,
      ownerId: input.ownerId,
      role: input.role,
      label: input.label,
      now: new Date(),
    });
    await setDoc(doc(db, "invites", invite.code), invitePayload(invite));
    return invite;
  } catch (error) {
    throw cloudError(error, "Davet açılamadı.");
  }
}

export async function redeemCloudInvite(db: Firestore, uid: string, rawCode: string): Promise<Grant> {
  const code = rawCode.trim().toUpperCase();
  if (code.length < 16) throw new Error("Kod geçersiz.");
  try {
    const ref = doc(db, "invites", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Kod bulunamadı.");
    const invite = parseInvite(snap.id, snap.data() as Record<string, unknown>);
    if (!invite) throw new Error("Kod geçersiz.");
    const block = claimBlock(invite, uid, new Date());
    if (block) throw new Error(block);
    await updateDoc(ref, { claimedBy: uid });
    const grant = grantFromInvite({ ...invite, claimedBy: uid }, uid, new Date());
    if (!grant) throw new Error("Bu davet kapatıldı.");
    await setDoc(doc(db, "users", grant.ownerId, "grants", grant.id), grant);
    await setDoc(doc(db, "users", uid, "grants", grant.id), grant);
    return grant;
  } catch (error) {
    throw cloudError(error, "Katılınamadı.");
  }
}

export async function setCloudGrantRole(db: Firestore, grant: Grant, role: ShareRole) {
  try {
    await updateDoc(doc(db, "users", grant.ownerId, "grants", grant.id), { role });
    await updateDoc(doc(db, "users", grant.memberId, "grants", grant.id), { role });
  } catch (error) {
    throw cloudError(error, "Rol değişmedi.");
  }
}

export async function removeCloudGrant(db: Firestore, grant: Grant) {
  try {
    if (grant.code) await updateDoc(doc(db, "invites", grant.code), { revoked: true }).catch(() => undefined);
    await deleteDoc(doc(db, "users", grant.ownerId, "grants", grant.id));
    await deleteDoc(doc(db, "users", grant.memberId, "grants", grant.id)).catch(() => undefined);
  } catch (error) {
    throw cloudError(error, "Kaldırılamadı.");
  }
}
