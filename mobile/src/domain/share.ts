// Invite codes and grants. Firestore rules repeat these checks; this module is what the app decides before it writes.

export type ShareKind = "project" | "note";
export type ShareRole = "view" | "edit";

export type Invite = {
  code: string;
  kind: ShareKind;
  targetId: string;
  ownerId: string;
  role: ShareRole;
  /** Project name or note title. Never the note body. */
  label: string;
  expiresAt: string;
  claimedBy: string | null;
  revoked: boolean;
  createdAt: string;
};

export type Grant = {
  id: string;
  kind: ShareKind;
  targetId: string;
  ownerId: string;
  memberId: string;
  role: ShareRole;
  code: string;
  label: string;
  createdAt: string;
};

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 16;
export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
export const LABEL_MAX = 60;

export const PROJECT_EDIT_FIELDS = ["nextStep", "checks", "notes", "stage", "tagline", "lastActivityAt"] as const;

export function grantId(kind: ShareKind, targetId: string, memberId: string) {
  return `${kind}_${targetId}_${memberId}`;
}

export function cleanLabel(input: string) {
  const trimmed = input.trim().slice(0, LABEL_MAX);
  return trimmed || "Not";
}

export function inviteExpiry(now: Date) {
  return new Date(now.getTime() + INVITE_TTL_MS).toISOString();
}

function randomUnit() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 256;
  }
  return Math.random();
}

export function makeInviteCode(next: () => number = randomUnit) {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const unit = next();
    const index = Math.min(CODE_ALPHABET.length - 1, Math.floor(unit * CODE_ALPHABET.length));
    code += CODE_ALPHABET[index];
  }
  return code;
}

export function buildInvite(input: {
  kind: ShareKind;
  targetId: string;
  ownerId: string;
  role: ShareRole;
  label: string;
  now: Date;
  code?: string;
}): Invite {
  return {
    code: input.code ?? makeInviteCode(),
    kind: input.kind,
    targetId: input.targetId,
    ownerId: input.ownerId,
    role: input.role,
    label: cleanLabel(input.label),
    expiresAt: inviteExpiry(input.now),
    claimedBy: null,
    revoked: false,
    createdAt: input.now.toISOString(),
  };
}

/** Why this person cannot claim the code. Null means the claim can proceed. */
export function claimBlock(invite: Invite, uid: string, now: Date): string | null {
  if (invite.revoked) return "Bu davet kapatıldı.";
  if (invite.claimedBy) return "Bu kod kullanılmış.";
  if (!Number.isFinite(Date.parse(invite.expiresAt)) || Date.parse(invite.expiresAt) <= now.getTime()) return "Bu kodun süresi dolmuş.";
  if (invite.ownerId === uid) return "Kendi davetini kullanamazsın.";
  if (invite.code.length < CODE_LENGTH) return "Kod geçersiz.";
  return null;
}

/** A removed person must not be able to build the grant again from the same code. */
export function grantFromInvite(invite: Invite, memberId: string, now: Date): Grant | null {
  if (invite.revoked || invite.claimedBy !== memberId) return null;
  if (Date.parse(invite.expiresAt) <= now.getTime()) return null;
  return {
    id: grantId(invite.kind, invite.targetId, memberId),
    kind: invite.kind,
    targetId: invite.targetId,
    ownerId: invite.ownerId,
    memberId,
    role: invite.role,
    code: invite.code,
    label: cleanLabel(invite.label),
    createdAt: now.toISOString(),
  };
}

export function canEditRole(role: ShareRole | "owner" | null) {
  return role === "owner" || role === "edit";
}

function asIso(value: unknown): string | null {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
}

function asRole(value: unknown): ShareRole | null {
  return value === "view" || value === "edit" ? value : null;
}

function asKind(value: unknown): ShareKind | null {
  return value === "project" || value === "note" ? value : null;
}

export function parseInvite(code: string, data: Record<string, unknown>): Invite | null {
  const kind = asKind(data.kind);
  const role = asRole(data.role);
  const expiresAt = asIso(data.expiresAt);
  const createdAt = asIso(data.createdAt) ?? expiresAt;
  if (!kind || !role || !expiresAt || !createdAt) return null;
  if (typeof data.ownerId !== "string" || typeof data.targetId !== "string" || !data.ownerId || !data.targetId) return null;
  if (typeof data.label !== "string") return null;
  if (data.revoked !== false && data.revoked !== true) return null;
  const claimedBy = data.claimedBy == null ? null : typeof data.claimedBy === "string" ? data.claimedBy : null;
  if (data.claimedBy != null && claimedBy == null) return null;
  return {
    code,
    kind,
    role,
    targetId: data.targetId,
    ownerId: data.ownerId,
    label: cleanLabel(data.label),
    expiresAt,
    claimedBy,
    revoked: data.revoked,
    createdAt,
  };
}

export function parseGrant(id: string, data: Record<string, unknown>): Grant | null {
  const kind = asKind(data.kind);
  const role = asRole(data.role);
  const createdAt = asIso(data.createdAt);
  if (!kind || !role || !createdAt) return null;
  if (typeof data.ownerId !== "string" || typeof data.memberId !== "string" || typeof data.targetId !== "string") return null;
  if (typeof data.code !== "string" || typeof data.label !== "string") return null;
  if (id !== grantId(kind, data.targetId, data.memberId)) return null;
  return {
    id,
    kind,
    role,
    targetId: data.targetId,
    ownerId: data.ownerId,
    memberId: data.memberId,
    code: data.code,
    label: cleanLabel(data.label),
    createdAt,
  };
}
