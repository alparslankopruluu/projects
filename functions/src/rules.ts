// Pure rules, no Firebase imports: run by syncUser after adapters, unit-tested in test/rules.test.ts.
import type { Project, Stage } from "./model.js";
import type { SignalDraft } from "./types.js";

export const STALL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALL_STAGES: Stage[] = ["building", "idea"];

export function daysSince(iso: string, now: Date): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/** Projects in "idea"/"building" with no activity for 14+ days get a warning signal. */
export function stallSignals(projects: Project[], now: Date): SignalDraft[] {
  const out: SignalDraft[] = [];
  for (const p of projects) {
    if (p.archived || !STALL_STAGES.includes(p.stage)) continue;
    const last = p.lastActivityAt || p.startedAt;
    const days = daysSince(last, now);
    if (days < STALL_DAYS) continue;
    const known = Number.isFinite(days);
    out.push({
      projectId: p.id,
      source: "manual",
      severity: "warning",
      title: known ? `${p.name} ${days} gündür hareketsiz` : `${p.name} ${STALL_DAYS}+ gündür hareketsiz`,
      body: known
        ? `Son hareket ${last.slice(0, 10)}. Sıradaki adım: ${p.nextStep || "tanımlı değil"}.`
        : `Hiç hareket kaydı yok. Sıradaki adım: ${p.nextStep || "tanımlı değil"}.`,
      // One signal per stall episode: new activity changes lastActivityAt and so the key.
      dedupeKey: `stall:${p.id}:${last}`,
    });
  }
  return out;
}

const STAGE_RANK: Record<Stage, number> = { idea: 0, building: 1, review: 2, live: 3, paused: -1 };

/**
 * Stage suggested by a store sync is only applied when it moves the project forward.
 * A live app with an update in review stays "live"; a paused project is never touched.
 */
export function nextStage(current: Stage, suggested: Stage | null): Stage {
  if (!suggested || current === "paused") return current;
  return STAGE_RANK[suggested] > STAGE_RANK[current] ? suggested : current;
}
