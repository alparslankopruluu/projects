import type { CheckItem, Project } from "./types";

export function step(id: string, label: string, done: boolean, owner: CheckItem["owner"]): CheckItem {
  return { id, label, done, owner };
}

export function withChecks(project: Project): Project {
  if (Array.isArray(project.checks) && project.checks.length > 0) {
    return {
      ...project,
      checks: project.checks.map((item) => ({
        id: item.id,
        label: item.label,
        done: Boolean(item.done),
        owner: item.owner === "you" || item.owner === "apple" || item.owner === "later" ? item.owner : "later",
      })),
    };
  }

  const submitted = project.attention !== "prepare";
  const hasWeb = project.platforms.some((platform) => platform.os === "web");
  const android = project.platforms.find((platform) => platform.os === "android");
  const playOpen = Boolean(android && (android.version === "—" || android.status.includes("girilmedi")));
  const checks: CheckItem[] = [
    step("app_store", "App Store", submitted, "you"),
    step("google_play", "Google Play", Boolean(android) && !playOpen, playOpen || Boolean(android) ? "you" : "later"),
    step("web", "Web", hasWeb, hasWeb ? "you" : "later"),
    step("ads", "Reklam", false, project.reason.toLocaleLowerCase("tr").includes("reklam") ? "you" : "later"),
  ];
  if (project.attention === "review_message") {
    checks.splice(1, 0, step("review", "İnceleme mesajı", false, "you"));
  } else if (project.attention === "waiting_review") {
    checks.splice(1, 0, step("review", "İnceleme", false, "apple"));
  }
  return { ...project, checks };
}

export function progressOf(checks: CheckItem[]) {
  const total = checks.length;
  const done = checks.filter((item) => item.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function waitingChecks(project: Project) {
  return project.checks.filter((item) => item.owner === "you" && !item.done);
}
