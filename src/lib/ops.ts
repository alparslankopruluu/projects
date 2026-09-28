import type { Attention, BusinessType, Platform, Project } from "./types";

const SHORT: [string, string][] = [
  ["Ayna Partner", "Ayna Partner"],
  ["Chordly", "Chordly"],
  ["Simetra", "Simetra"],
  ["ScreenMotion", "ScreenMotion"],
  ["ArtPromt", "ArtPromt"],
  ["Archvia", "Archvia"],
  ["Belto", "Belto"],
  ["BARK", "BARK"],
  ["Draft", "Draft"],
  ["Ayna", "Ayna"],
];

export function shortName(name: string) {
  for (const [needle, label] of SHORT) {
    if (name.includes(needle)) return label;
  }
  return name.split(":")[0]?.trim() || name;
}

export function inferBusiness(project: Project): BusinessType {
  if (project.businessType) return project.businessType;
  if (["ayna", "ayna-partner", "archvia"].includes(project.id)) return "saas";
  return "consumer_subscription";
}

export const BUSINESS_LABEL: Record<BusinessType, string> = {
  consumer_subscription: "Abonelik",
  consumer_credits: "Kredi",
  saas: "SaaS",
  marketplace: "Pazar",
  internal: "İç araç",
};

export type ReleaseState = "live" | "review" | "message" | "prepare" | "missing";

export type ReleaseLane = {
  os: Platform["os"];
  version: string;
  state: ReleaseState;
  detail: string;
};

const STATE_LABEL: Record<ReleaseState, string> = {
  live: "Yayında",
  review: "İncelemede",
  message: "Mesaj var",
  prepare: "Gönderime hazır değil",
  missing: "Yok",
};

export function stateLabel(state: ReleaseState) {
  return STATE_LABEL[state];
}

function laneFromPlatform(project: Project, platform: Platform): ReleaseLane {
  const status = platform.status.toLowerCase();
  let state: ReleaseState = "missing";
  if (platform.os === "ios" && project.attention === "review_message") state = "message";
  else if (platform.os === "ios" && project.attention === "waiting_review") state = "review";
  else if (platform.os === "ios" && project.attention === "prepare") state = "prepare";
  else if (status.includes("waiting")) state = "review";
  else if (status.includes("prepare")) state = "prepare";
  else if (status.includes("ready") || status.includes("vercel") || project.attention === "live" || project.attention === "ready") {
    state = platform.version === "—" ? "missing" : "live";
  }
  if (platform.version === "—" || status.includes("girilmedi")) state = "missing";
  return { os: platform.os, version: platform.version, state, detail: platform.status };
}

export function lanes(project: Project): ReleaseLane[] {
  const order: Platform["os"][] = ["ios", "android", "web"];
  return order.map((os) => {
    const platform = project.platforms.find((item) => item.os === os);
    if (!platform) return { os, version: "—", state: "missing" as const, detail: "Bağlı değil" };
    return laneFromPlatform(project, platform);
  });
}

export type WorkItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  href: string;
};

export function needsYou(project: Project): WorkItem[] {
  const href = `/apps/${project.id}`;
  const items: WorkItem[] = [];
  const push = (id: string, title: string) => {
    items.push({ id: `${project.id}:${id}`, projectId: project.id, projectName: shortName(project.name), title, href });
  };

  if (project.attention === "review_message") push("review", "Apple inceleme mesajını yanıtla");
  if (project.attention === "prepare") push("submit", "Mağaza gönderimini bitir");

  for (const check of project.checks) {
    if (check.owner !== "you" || check.done) continue;
    if (check.id === "review" || check.id === "app_store") continue;
    if (check.id === "ads") push("ads", "Hazır kampanyayı yayınla");
    else if (check.id === "google_play") push("play", "Google Play sürümünü tamamla");
    else if (check.id === "screenshots") push("shots", "Ekran görsellerini yükle");
    else if (check.id === "repo") push("repo", "GitHub reposunu bağla");
    else if (check.id === "web") push("web", "Web sürümünü işaretle");
    else push(check.id, check.label);
  }
  return items;
}

export function waitingOn(project: Project): WorkItem[] {
  if (project.attention !== "waiting_review") return [];
  const ios = project.platforms.find((platform) => platform.os === "ios");
  return [
    {
      id: `${project.id}:apple`,
      projectId: project.id,
      projectName: shortName(project.name),
      title: ios ? `Apple incelemesi · ${ios.version}` : "Apple incelemesi",
      href: `/apps/${project.id}`,
    },
  ];
}

export type Signal = {
  id: string;
  tone: "critical" | "watch" | "setup";
  title: string;
  href: string;
};

export function signals(projects: Project[]): Signal[] {
  const list: Signal[] = [];
  for (const project of projects) {
    if (project.attention === "review_message") {
      list.push({
        id: `${project.id}:message`,
        tone: "critical",
        title: `${shortName(project.name)} — Apple mesaj bıraktı`,
        href: `/apps/${project.id}`,
      });
    }
    if (needsYou(project).some((item) => item.id.endsWith(":ads"))) {
      list.push({
        id: `${project.id}:ads`,
        tone: "watch",
        title: `${shortName(project.name)} — reklam planı duruyor`,
        href: `/apps/${project.id}`,
      });
    }
  }
  const reviewing = projects.filter((project) => project.attention === "waiting_review").length;
  if (reviewing > 0) {
    list.push({
      id: "reviewing",
      tone: "watch",
      title: `${reviewing} uygulama Apple incelemesinde`,
      href: "/releases",
    });
  }
  list.push({
    id: "metrics-off",
    tone: "setup",
    title: "Gelir, deneme ve crash verisi bağlı değil",
    href: "/integrations",
  });
  return list;
}

export function portfolioCounts(projects: Project[]) {
  const you = projects.reduce((sum, project) => sum + needsYou(project).length, 0);
  const review = projects.filter((project) => project.attention === "waiting_review").length;
  const live = projects.filter((project) => project.attention === "live" || project.attention === "ready").length;
  const critical = projects.filter((project) => project.attention === "review_message").length;
  return { you, review, live, critical };
}

export function attentionWord(attention: Attention) {
  if (attention === "review_message") return "Mesaj";
  if (attention === "waiting_review") return "İnceleme";
  if (attention === "prepare") return "Hazır değil";
  if (attention === "ready" || attention === "live") return "Yayında";
  return attention;
}

export function growthLine(project: Project) {
  const ads = project.checks.find((item) => item.id === "ads");
  if (!ads) return "Reklam kaydı yok";
  if (ads.done) return "Reklam yayında";
  if (ads.owner === "you") return "Kampanya hazır, açılmadı";
  return "Reklam sırası gelmedi";
}

export function healthLine() {
  return "Metrik bağlı değil";
}

export function productLine(project: Project) {
  if (!project.briefUpdatedAt) return "Brifing henüz sync edilmedi";
  return `Brifing ${project.briefUpdatedAt.slice(0, 10)}`;
}
