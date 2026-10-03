import type { Insight, Metric, MetricKey, Project, Signal, Stage } from "./model";

const DAY = 86_400_000;

export function daysSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
}

export function progressOf(project: Project) {
  const total = project.checks.length;
  const done = project.checks.filter((item) => item.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function openForYou(project: Project) {
  return project.checks.filter((item) => item.owner === "you" && !item.done);
}

/**
 * "Yarım kalmış" — the second card on the home screen.
 *
 * This is a product decision, not a technicality: it decides what the studio owner
 * feels guilty about every morning. Things to weigh:
 *   - A live app with an unshipped Google Play build: unfinished, or just "later"?
 *   - An app waiting on Apple: blocked, but is it *your* unfinished work?
 *   - Silence: a "building" project with no commits for N days is the classic half-finished app.
 *
 * TODO(you): tune this rule. The default below counts a project as unfinished when it is
 * not live yet and has work on your side, or when it is live but a check you own is still open.
 */
export function isUnfinished(project: Project, now = Date.now()): boolean {
  if (project.archived || project.stage === "idea") return false;
  const mine = openForYou(project).length;
  if (project.stage === "building" || project.stage === "paused") return true;
  if (project.stage === "review") return mine > 0;
  void now; // available for an idle-days rule
  return mine > 0;
}

export function unfinishedReason(project: Project, now = Date.now()) {
  const idle = daysSince(project.lastActivityAt, now);
  const open = openForYou(project);
  if (project.stage === "paused") return `Durduruldu · ${idle} gün`;
  if (open.length > 0) return open.map((item) => item.label).slice(0, 2).join(" · ");
  return `${idle} gündür hareket yok`;
}

export function stageCounts(projects: Project[]) {
  const counts: Record<Stage, number> = { idea: 0, building: 0, review: 0, live: 0, paused: 0 };
  for (const project of projects) if (!project.archived) counts[project.stage] += 1;
  return counts;
}

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2, success: 3 } as const;

export function sortSignals(signals: Signal[]) {
  return [...signals].sort(
    (a, b) =>
      Number(a.read) - Number(b.read) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export function inboxCounts(signals: Signal[]) {
  const unread = signals.filter((item) => !item.read);
  return { unread: unread.length, critical: unread.filter((item) => item.severity === "critical").length };
}

export type Focus = { projectId: string | null; action: string; why: string; source: "claude" | "rules" };

// Claude's focus wins when it is fresh. Otherwise the most urgent unread signal, then the top project.
export function todaysFocus(projects: Project[], signals: Signal[], insight: Insight | null, now = Date.now()): Focus | null {
  if (insight && now - new Date(insight.generatedAt).getTime() < DAY && insight.focus[0]) {
    return { ...insight.focus[0], source: "claude" };
  }
  const urgent = sortSignals(signals).find((item) => !item.read && item.severity === "critical");
  if (urgent) return { projectId: urgent.projectId, action: urgent.title, why: urgent.body, source: "rules" };
  const top = [...projects].filter((item) => !item.archived).sort((a, b) => a.priority - b.priority)[0];
  if (!top) return null;
  return { projectId: top.id, action: top.nextStep, why: `${top.name} sırada ilk.`, source: "rules" };
}

export function latestMetric(metrics: Metric[], projectId: string | null, key: MetricKey) {
  return metrics
    .filter((item) => item.key === key && (projectId === null || item.projectId === projectId))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
}

// Portfolio total for one key, using each project's latest row. Null means nothing is connected.
export function portfolioMetric(metrics: Metric[], key: MetricKey) {
  const byProject = new Map<string, Metric>();
  for (const row of metrics) {
    if (row.key !== key) continue;
    const current = byProject.get(row.projectId);
    if (!current || row.recordedAt > current.recordedAt) byProject.set(row.projectId, row);
  }
  if (byProject.size === 0) return null;
  let value = 0;
  let previous = 0;
  let hasPrevious = false;
  for (const row of byProject.values()) {
    value += row.value;
    if (row.previous !== null) {
      previous += row.previous;
      hasPrevious = true;
    }
  }
  return { value, previous: hasPrevious ? previous : null, sources: byProject.size };
}

export type Moment = "start" | "middle" | "end";

// Where a project sits on its own arc. Drives the stage video and the timeline on the detail page.
export function momentOf(project: Project): Moment {
  if (project.stage === "idea") return "start";
  if (project.stage === "live") return "end";
  return "middle";
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}
