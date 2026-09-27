import assert from "node:assert/strict";
import test from "node:test";
import { applyCommits, createBrief, splitBrief } from "./brief";

test("createBrief keeps the five sections", () => {
  const brief = createBrief({
    name: "Chordly",
    reason: "Mesaj var.",
    platforms: [{ os: "ios", version: "1.1", status: "Waiting for Review" }],
    repo: "alparslankopruluu/chordly",
    stack: "Firebase",
    open: ["Mesajı yanıtla."],
  });
  const parts = splitBrief(brief);
  assert.equal(parts.title, "Chordly");
  assert.deepEqual(
    parts.sections.map((section) => section.name),
    ["Şimdi", "Açık işler", "Son değişiklikler", "Denenenler", "Tekrarlama"],
  );
  assert.match(parts.sections[1].body, /Mesajı yanıtla/);
});

test("applyCommits refreshes recent commits and leaves the other notes", () => {
  const original = createBrief({
    name: "Simetra",
    reason: "Yayında.",
    platforms: [],
    repo: "",
    stack: "Firebase",
    open: ["Planı yayınla."],
  }).replace(
    "## Tekrarlama\n\n- Kayıt yok.",
    "## Tekrarlama\n\n- Ekran görüntüsü reddi, aynı kadrajı tekrarlama.",
  );

  const next = applyCommits(
    original,
    [
      {
        sha: "abc1234ffff",
        date: "2026-09-27T12:00:00Z",
        message: "Fix paywall copy\n\nlonger body",
      },
    ],
    "2026-09-27T15:00:00.000Z",
  );

  assert.equal(next.changed, true);
  assert.equal(next.latestSha, "abc1234ffff");
  const parts = splitBrief(next.brief);
  assert.match(parts.preamble, /Güncellendi: 2026-09-27 · abc1234/);
  assert.match(parts.sections.find((section) => section.name === "Son değişiklikler")!.body, /Fix paywall copy \(abc1234\)/);
  assert.match(parts.sections.find((section) => section.name === "Açık işler")!.body, /Planı yayınla/);
  assert.match(parts.sections.find((section) => section.name === "Tekrarlama")!.body, /kadrajı tekrarlama/);
});

test("applyCommits keeps an extra section", () => {
  const brief = "# Deneme\n\nGüncellendi: eski\n\n## Not\n\n- elle\n";
  const next = applyCommits(
    brief,
    [{ sha: "deadbee", date: "2026-09-01T00:00:00Z", message: "init" }],
    "2026-09-27T00:00:00.000Z",
  );
  const parts = splitBrief(next.brief);
  assert.equal(parts.sections.at(-1)?.name, "Not");
  assert.match(parts.sections.at(-1)!.body, /elle/);
});
