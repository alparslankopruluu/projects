/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canKeepIdea,
  categorize,
  demandRank,
  ideasFromBasket,
  kindFromUrl,
  missingChecks,
  openRejection,
  prepareCapture,
  seasonVisible,
  sourceCoverage,
  staleCaptures,
  HALLOWEEN,
} from "./basket";
import type { Capture, Metric, Project, StoreEvent } from "./model";

const NOW = new Date("2026-10-03T09:00:00Z").getTime();

function capture(patch: Partial<Capture> & Pick<Capture, "id" | "title">): Capture {
  return {
    body: "",
    url: "",
    kind: "note",
    category: "other",
    projectId: null,
    read: false,
    createdAt: "2026-10-01T09:00:00Z",
    remindAfterDays: 2,
    ...patch,
  };
}

function project(patch: Partial<Project> & Pick<Project, "id" | "name" | "stage">): Project {
  return {
    tagline: "",
    hue: 10,
    priority: 1,
    nextStep: "",
    platforms: [],
    connections: [],
    checks: [],
    notes: [],
    startedAt: "2026-01-01",
    lastActivityAt: "2026-10-01",
    archived: false,
    ...patch,
  };
}

test("basket sorts architecture, aesthetic, and growth notes into their own shelves", () => {
  assert.equal(categorize("Mimari akış ve navigasyon"), "architecture");
  assert.equal(categorize("Estetik haber, renk paleti"), "aesthetic");
  assert.equal(categorize("Halloween kampanya ve ASO"), "growth");
  assert.equal(kindFromUrl("https://x.com/studio/status/1"), "tweet");
  assert.deepEqual(prepareCapture({ title: "baktım", body: "", url: "https://x.com/studio/status/1", kind: "note" }), {
    kind: "tweet",
    category: "story",
  });
});

test("unread basket items are reminded only after their window", () => {
  const items = [
    capture({ id: "old", title: "Köşe", createdAt: "2026-10-01T09:00:00Z" }),
    capture({ id: "fresh", title: "Bugün", createdAt: "2026-10-03T08:00:00Z" }),
    capture({ id: "read", title: "Okundu", read: true, createdAt: "2026-09-01T09:00:00Z" }),
  ];
  assert.deepEqual(
    staleCaptures(items, NOW).map((item) => item.id),
    ["old"],
  );
});

test("ideas land on a live app or become a new product", () => {
  const live = project({ id: "live", name: "Simetra", stage: "live", priority: 1 });
  const building = project({ id: "build", name: "Chordly", stage: "building", priority: 0 });
  const aesthetic = capture({ id: "a", title: "Vitrin paleti", category: "aesthetic" });
  const architecture = capture({ id: "b", title: "Sekme mimarisi", category: "architecture", body: "Üç sekme yeter." });
  const news = capture({ id: "n", title: "Köşe: yavaş uygulamalar", category: "story", kind: "essay" });
  const minted = ideasFromBasket([aesthetic, architecture, news], [live, building]);
  assert.equal(minted.find((item) => item.category === "aesthetic")?.projectId, "live");
  assert.equal(minted.find((item) => item.category === "architecture")?.projectId, "build");
  assert.equal(minted.find((item) => item.target === "new")?.projectId, null);
  assert.equal(ideasFromBasket([], [live]).length, 0);
});

test("a linked capture prefers its own project", () => {
  const live = project({ id: "live", name: "Simetra", stage: "live", priority: 1 });
  const other = project({ id: "other", name: "Belto", stage: "live", priority: 2 });
  const note = capture({ id: "a", title: "Belto görseli", category: "aesthetic", projectId: "other" });
  assert.equal(ideasFromBasket([note], [live, other])[0]?.projectId, "other");
});

test("coverage counts api, manual, and missing without inventing numbers", () => {
  const app = project({
    id: "a",
    name: "A",
    stage: "live",
    connections: [
      { kind: "appstore", ref: "1", mode: "api", lastSyncAt: null },
      { kind: "revenuecat", ref: "proj", mode: "manual", lastSyncAt: null },
    ],
  });
  const rows = sourceCoverage([app]);
  assert.deepEqual(
    rows.map((row) => [row.kind, row.api, row.manual, row.missing, row.liveSync]),
    [
      ["appstore", 1, 0, 0, true],
      ["googleplay", 0, 0, 1, false],
      ["revenuecat", 0, 1, 0, false],
      ["firebase", 0, 0, 1, false],
    ],
  );
});

test("demand puts measured apps first and leaves the rest unranked", () => {
  const quiet = project({ id: "quiet", name: "Quiet", stage: "live", priority: 0 });
  const loud = project({ id: "loud", name: "Loud", stage: "live", priority: 2 });
  const metrics: Metric[] = [
    { id: "1", projectId: "loud", key: "downloads", value: 10, previous: null, period: "week", source: "manual", recordedAt: "2026-10-01" },
    { id: "2", projectId: "loud", key: "revenue", value: 5, previous: null, period: "week", source: "manual", recordedAt: "2026-10-01" },
  ];
  const ranked = demandRank([quiet, loud], metrics);
  assert.deepEqual(
    ranked.map((row) => [row.project.id, row.measured]),
    [
      ["loud", true],
      ["quiet", false],
    ],
  );
  assert.equal(ranked[0]?.score, 110);
});

test("free desks keep three ideas; pro does not hit that cap", () => {
  assert.equal(canKeepIdea("free", 2), true);
  assert.equal(canKeepIdea("free", 3), false);
  assert.equal(canKeepIdea("pro", 9), true);
});

test("halloween checks are skipped once they exist, and the season hides after 1 November", () => {
  assert.equal(seasonVisible(NOW), true);
  assert.equal(seasonVisible(new Date("2026-11-02T00:00:00Z").getTime()), false);
  const already = project({
    id: "a",
    name: "A",
    stage: "live",
    checks: [{ id: "1", label: HALLOWEEN.checks[0].label, done: false, owner: "you" }],
  });
  assert.equal(missingChecks(already, HALLOWEEN.checks).length, 2);
});

test("a rejection stays open until that version is approved or released", () => {
  const rejected: StoreEvent = {
    id: "r",
    projectId: "a",
    source: "appstore",
    kind: "rejected",
    version: "1.2",
    detail: "2.1",
    at: "2026-10-01",
  };
  assert.equal(openRejection([rejected], "a")?.id, "r");
  const approved: StoreEvent = { ...rejected, id: "ok", kind: "approved", at: "2026-10-02" };
  assert.equal(openRejection([rejected, approved], "a"), null);
});
