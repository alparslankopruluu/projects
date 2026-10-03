/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { inboxCounts, isUnfinished, portfolioMetric, sortSignals, stageCounts, todaysFocus } from "./derive";
import type { Insight, Metric, Signal } from "./model";
import { seedProjects, seedSignals } from "./seed";

const NOW = new Date("2026-09-30T09:00:00Z").getTime();

test("seed studio counts match the recorded desk", () => {
  const counts = stageCounts(seedProjects());
  assert.deepEqual(counts, { idea: 0, building: 2, review: 4, live: 4, paused: 0 });
});

test("waiting on Apple alone is not unfinished work", () => {
  const belto = seedProjects().find((item) => item.id === "belto")!;
  assert.equal(isUnfinished(belto, NOW), false);
  const chordly = seedProjects().find((item) => item.id === "chordly")!;
  assert.equal(isUnfinished(chordly, NOW), true);
});

test("unread critical signals sort first", () => {
  const signals: Signal[] = [
    { ...seedSignals()[2], id: "a" },
    { ...seedSignals()[0], id: "b", read: true },
    { ...seedSignals()[0], id: "c" },
  ];
  assert.deepEqual(sortSignals(signals).map((item) => item.id), ["c", "a", "b"]);
  assert.deepEqual(inboxCounts(signals), { unread: 2, critical: 1 });
});

test("fresh Claude focus wins, stale falls back to the critical signal", () => {
  const insight: Insight = {
    generatedAt: new Date(NOW - 3_600_000).toISOString(),
    model: "claude-opus-5-5",
    headline: "",
    focus: [{ projectId: "simetra", action: "Kampanyayı aç", why: "Plan hazır." }],
    risks: [],
  };
  assert.equal(todaysFocus(seedProjects(), seedSignals(), insight, NOW)?.source, "claude");
  const stale = { ...insight, generatedAt: "2026-09-01T00:00:00Z" };
  assert.equal(todaysFocus(seedProjects(), seedSignals(), stale, NOW)?.projectId, "chordly");
});

test("portfolio metric uses each project's latest row and stays null when nothing is connected", () => {
  assert.equal(portfolioMetric([], "revenue"), null);
  const rows: Metric[] = [
    { id: "1", projectId: "a", key: "revenue", value: 100, previous: null, period: "week", source: "manual", recordedAt: "2026-09-01" },
    { id: "2", projectId: "a", key: "revenue", value: 150, previous: 100, period: "week", source: "manual", recordedAt: "2026-09-08" },
    { id: "3", projectId: "b", key: "revenue", value: 50, previous: null, period: "week", source: "manual", recordedAt: "2026-09-08" },
  ];
  assert.deepEqual(portfolioMetric(rows, "revenue"), { value: 200, previous: 100, sources: 2 });
});
