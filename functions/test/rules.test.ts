import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Project } from "../src/model.js";
import { daysSince, nextStage, STALL_DAYS, stallSignals } from "../src/rules.js";

const NOW = new Date("2026-09-30T09:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Kedi",
    tagline: "",
    hue: 200,
    stage: "building",
    priority: 1,
    nextStep: "Paywall ekranı",
    platforms: [],
    connections: [],
    checks: [],
    notes: [],
    startedAt: daysAgo(100),
    lastActivityAt: daysAgo(20),
    archived: false,
    ...over,
  };
}

describe("stallSignals", () => {
  it("flags building/idea projects idle for 14+ days", () => {
    const out = stallSignals([project(), project({ id: "p2", name: "Fikir", stage: "idea", lastActivityAt: daysAgo(14) })], NOW);
    assert.equal(out.length, 2);
    assert.equal(out[0].severity, "warning");
    assert.equal(out[0].projectId, "p1");
    assert.equal(out[0].title, "Kedi 20 gündür hareketsiz");
    assert.equal(out[1].title, "Fikir 14 gündür hareketsiz");
  });

  it("ignores recent activity, other stages and archived projects", () => {
    const out = stallSignals(
      [
        project({ lastActivityAt: daysAgo(STALL_DAYS - 1) }),
        project({ id: "live", stage: "live", lastActivityAt: daysAgo(90) }),
        project({ id: "rev", stage: "review", lastActivityAt: daysAgo(90) }),
        project({ id: "paused", stage: "paused", lastActivityAt: daysAgo(90) }),
        project({ id: "arch", archived: true }),
      ],
      NOW,
    );
    assert.deepEqual(out, []);
  });

  it("uses a dedupe key that is stable across runs but changes with new activity", () => {
    const a = stallSignals([project()], NOW)[0];
    const b = stallSignals([project()], new Date(NOW.getTime() + 86_400_000))[0];
    const c = stallSignals([project({ lastActivityAt: daysAgo(15) })], NOW)[0];
    assert.equal(a.dedupeKey, b.dedupeKey);
    assert.notEqual(a.dedupeKey, c.dedupeKey);
  });

  it("falls back to startedAt when lastActivityAt is empty", () => {
    const out = stallSignals([project({ lastActivityAt: "", startedAt: daysAgo(30) })], NOW);
    assert.equal(out.length, 1);
    assert.match(out[0].title, /30 gündür hareketsiz/);
  });

  it("daysSince treats unparseable dates as infinitely old", () => {
    assert.equal(daysSince("nope", NOW), Number.POSITIVE_INFINITY);
    assert.equal(daysSince(daysAgo(3), NOW), 3);
  });
});

describe("nextStage", () => {
  it("only moves forward", () => {
    assert.equal(nextStage("building", "review"), "review");
    assert.equal(nextStage("review", "live"), "live");
    assert.equal(nextStage("live", "review"), "live");
    assert.equal(nextStage("idea", null), "idea");
  });
  it("never touches paused projects", () => {
    assert.equal(nextStage("paused", "live"), "paused");
  });
});
