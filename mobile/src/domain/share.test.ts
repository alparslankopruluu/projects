import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  buildInvite,
  claimBlock,
  cleanLabel,
  grantFromInvite,
  grantId,
  makeInviteCode,
  parseGrant,
} from "./share";

const NOW = new Date("2026-10-08T09:00:00.000Z");

test("an invite code is 16 unambiguous characters and lasts 48 hours", () => {
  const code = makeInviteCode(() => 0);
  assert.equal(code, CODE_ALPHABET[0].repeat(CODE_LENGTH));
  const invite = buildInvite({ kind: "note", targetId: "n1", ownerId: "owner", role: "view", label: "Başlık", now: NOW, code });
  assert.equal(invite.expiresAt, "2026-10-10T09:00:00.000Z");
  assert.equal(invite.claimedBy, null);
  assert.equal(invite.revoked, false);
  assert.equal(invite.label, "Başlık");
});

test("a label never needs the note body", () => {
  assert.equal(cleanLabel(""), "Not");
  assert.equal(cleanLabel("a".repeat(80)).length, 60);
});

test("claim rejects a used, expired, revoked, or self invite", () => {
  const invite = buildInvite({ kind: "project", targetId: "p1", ownerId: "owner", role: "edit", label: "Masa", now: NOW });
  assert.equal(claimBlock(invite, "owner", NOW), "Kendi davetini kullanamazsın.");
  assert.equal(claimBlock(invite, "member", new Date("2026-10-10T09:00:00.000Z")), "Bu kodun süresi dolmuş.");
  assert.equal(claimBlock({ ...invite, revoked: true }, "member", NOW), "Bu davet kapatıldı.");
  assert.equal(claimBlock({ ...invite, claimedBy: "other" }, "member", NOW), "Bu kod kullanılmış.");
  assert.equal(claimBlock(invite, "member", NOW), null);
});

test("a revoked invite cannot mint the grant again", () => {
  const invite = buildInvite({ kind: "note", targetId: "n1", ownerId: "owner", role: "edit", label: "Not", now: NOW });
  const claimed = { ...invite, claimedBy: "member" };
  const grant = grantFromInvite(claimed, "member", NOW);
  assert.equal(grant?.id, grantId("note", "n1", "member"));
  assert.equal(grant?.role, "edit");
  assert.equal(grantFromInvite({ ...claimed, revoked: true }, "member", NOW), null);
  assert.equal(grantFromInvite(claimed, "someone-else", NOW), null);
});

test("a grant id that does not match its fields is dropped", () => {
  assert.equal(
    parseGrant("note_n1_member", {
      kind: "note",
      targetId: "n1",
      ownerId: "owner",
      memberId: "member",
      role: "view",
      code: "ABCDEFGHJKLMNPQR",
      label: "Not",
      createdAt: NOW.toISOString(),
    })?.role,
    "view",
  );
  assert.equal(
    parseGrant("note_n1_member", {
      kind: "note",
      targetId: "other",
      ownerId: "owner",
      memberId: "member",
      role: "edit",
      code: "ABCDEFGHJKLMNPQR",
      label: "Not",
      createdAt: NOW.toISOString(),
    }),
    null,
  );
});
