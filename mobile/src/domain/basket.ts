import { daysSince, latestMetric } from "./derive";
import {
  CAPTURE_KIND_LABEL,
  FREE_KEPT_IDEAS,
  type Capture,
  type CaptureCategory,
  type CaptureKind,
  type CheckItem,
  type Idea,
  type Metric,
  type Plan,
  type Project,
  type SourceKind,
  type StoreEvent,
} from "./model";

/** Unread basket items older than this show up on the home row. */
export const REMIND_AFTER_DAYS = 2;

const CATEGORY_WORDS: { category: CaptureCategory; words: string[] }[] = [
  { category: "architecture", words: ["mimar", "architecture", "wireframe", "akış", "akis", "navigasyon", "sitemap"] },
  { category: "aesthetic", words: ["estetik", "aesthetic", "tipograf", "renk", "palet", "görsel", "gorsel", "screenshot", "ekran görünt", "ekran gorunt", "visual"] },
  { category: "growth", words: ["aso", "reklam", "ads", "kampanya", "keyword", "anahtar kelime", "halloween", "sezon", "store listing", "mağaza foto", "magaza foto"] },
  { category: "story", words: ["haber", "köşe", "kose", "yazı", "yazi", "essay", "makale", "tweet", "thread"] },
  { category: "tech", words: ["firebase", "crash", "revenuecat", "sdk", "api", "bug", "supabase"] },
  { category: "product", words: ["fikir", "özellik", "ozellik", "feature", "onboarding"] },
];

const CATEGORY_ORDER: CaptureCategory[] = ["architecture", "aesthetic", "growth", "story", "product", "tech", "other"];

export function kindFromUrl(url: string): CaptureKind | null {
  const value = url.toLowerCase();
  if (!value) return null;
  if (value.includes("twitter.com") || value.includes("x.com/")) return "tweet";
  if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(value)) return "screenshot";
  return null;
}

export function categorize(text: string): CaptureCategory {
  const haystack = text.toLocaleLowerCase("tr");
  for (const rule of CATEGORY_WORDS) {
    if (rule.words.some((word) => haystack.includes(word))) return rule.category;
  }
  return "other";
}

export function prepareCapture(input: { title: string; body: string; url: string; kind?: CaptureKind }): { kind: CaptureKind; category: CaptureCategory } {
  const fromUrl = kindFromUrl(input.url);
  const requested = input.kind ?? "note";
  const kind = requested !== "note" ? requested : (fromUrl ?? "note");
  let category = categorize(`${input.title}\n${input.body}\n${input.url}`);
  if (category === "other" && (kind === "tweet" || kind === "essay" || kind === "news")) category = "story";
  if (category === "other" && kind === "screenshot") category = "aesthetic";
  if (category === "other" && kind === "idea") category = "product";
  return { kind, category };
}

export function staleCaptures(captures: Capture[], now = Date.now()) {
  return captures
    .filter((item) => !item.read && daysSince(item.createdAt, now) >= item.remindAfterDays)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function groupCaptures(captures: Capture[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: captures.filter((item) => item.category === category).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  })).filter((group) => group.items.length > 0);
}

export function canKeepIdea(plan: Plan, kept: number) {
  return plan === "pro" || kept < FREE_KEPT_IDEAS;
}

function linkedProject(items: Capture[], projects: Project[], fallback: Project | undefined) {
  const id = items.map((item) => item.projectId).find((value) => value);
  return projects.find((project) => project.id === id) ?? fallback;
}

export function ideasFromBasket(captures: Capture[], projects: Project[]): Omit<Idea, "id" | "createdAt" | "kept">[] {
  const pool = captures.filter((item) => item.title.trim() || item.body.trim());
  if (pool.length === 0) return [];
  const active = projects.filter((project) => !project.archived);
  const live = active.filter((project) => project.stage === "live").sort((a, b) => a.priority - b.priority);
  const building = active.filter((project) => project.stage === "building" || project.stage === "review").sort((a, b) => a.priority - b.priority);
  const by = (category: CaptureCategory) => pool.filter((item) => item.category === category);
  const ideas: Omit<Idea, "id" | "createdAt" | "kept">[] = [];

  const aesthetic = by("aesthetic");
  const aestheticTarget = linkedProject(aesthetic, active, live[0]);
  if (aesthetic.length && aestheticTarget) {
    const names = aesthetic
      .slice(0, 2)
      .map((item) => item.title)
      .join(", ");
    ideas.push({
      title: `${aestheticTarget.name} vitrinini yenile`,
      body: `Sepetteki estetik notlar (${names}) mağaza görseli ve ilk ekran için malzeme. Önce bir görsel seti, sonra ASO metni.`,
      target: "existing",
      projectId: aestheticTarget.id,
      captureIds: aesthetic.slice(0, 3).map((item) => item.id),
      category: "aesthetic",
    });
  }

  const architecture = by("architecture");
  const architectureTarget = linkedProject(architecture, active, building[0] ?? live[0]);
  if (architecture.length && architectureTarget) {
    const lead = architecture[0];
    ideas.push({
      title: `${architectureTarget.name} akışına bu mimariyi uygula`,
      body: `${architecture
        .slice(0, 2)
        .map((item) => item.title)
        .join(" · ")}${lead.body ? ` — ${lead.body.slice(0, 140)}` : ""}`,
      target: "existing",
      projectId: architectureTarget.id,
      captureIds: architecture.slice(0, 3).map((item) => item.id),
      category: "architecture",
    });
  }

  const growth = by("growth");
  const growthTarget = linkedProject(growth, active, live[0]);
  if (growth.length && growthTarget) {
    ideas.push({
      title: `${growthTarget.name} için büyüme işi`,
      body: `Sepette büyüme notu var: ${growth[0].title}. Reklam hesabı, sezon kampanyası veya ASO'dan hangisi eksikse onu sıradaki adım yap.`,
      target: "existing",
      projectId: growthTarget.id,
      captureIds: growth.slice(0, 3).map((item) => item.id),
      category: "growth",
    });
  }

  const stories = [...by("story"), ...pool.filter((item) => item.kind === "news" || item.kind === "essay" || item.kind === "tweet")];
  const uniqueStories = [...new Map(stories.map((item) => [item.id, item])).values()];
  if (uniqueStories[0]) {
    const lead = uniqueStories[0];
    ideas.push({
      title: (lead.title || "Sepetten yeni ürün").slice(0, 72),
      body: `Bu ${CAPTURE_KIND_LABEL[lead.kind].toLocaleLowerCase("tr")} mevcut bir uygulamanın özelliği olmak zorunda değil. Yeni bir ürünün ilk cümlesi: ${lead.body.slice(0, 180) || lead.title}`,
      target: "new",
      projectId: null,
      captureIds: uniqueStories.slice(0, 2).map((item) => item.id),
      category: lead.category === "other" ? "product" : lead.category,
    });
  }

  if (ideas.length === 0 && pool[0]) {
    const lead = pool[0];
    const host = lead.projectId ? active.find((project) => project.id === lead.projectId) : active[0];
    ideas.push({
      title: lead.title || "Sepetten fikir",
      body: lead.body || lead.url || "Notu bir projeye bağla ya da yeni bir uygulama olarak aç.",
      target: host ? "existing" : "new",
      projectId: host?.id ?? null,
      captureIds: [lead.id],
      category: lead.category,
    });
  }

  return ideas.slice(0, 4);
}

const WATCHED: { kind: SourceKind; liveSync: boolean }[] = [
  { kind: "appstore", liveSync: true },
  { kind: "googleplay", liveSync: false },
  { kind: "revenuecat", liveSync: false },
  { kind: "firebase", liveSync: false },
];

export type SourceCoverage = {
  kind: SourceKind;
  api: number;
  manual: number;
  missing: number;
  liveSync: boolean;
};

export function sourceCoverage(projects: Project[]): SourceCoverage[] {
  const active = projects.filter((project) => !project.archived);
  return WATCHED.map(({ kind, liveSync }) => {
    let api = 0;
    let manual = 0;
    for (const project of active) {
      const link = project.connections.find((item) => item.kind === kind);
      if (!link) continue;
      if (link.mode === "api") api += 1;
      else manual += 1;
    }
    return { kind, api, manual, missing: active.length - api - manual, liveSync };
  });
}

export function demandRank(projects: Project[], metrics: Metric[]) {
  return projects
    .filter((project) => !project.archived)
    .map((project) => {
      const downloads = latestMetric(metrics, project.id, "downloads");
      const revenue = latestMetric(metrics, project.id, "revenue");
      const activeUsers = latestMetric(metrics, project.id, "activeUsers");
      const measured = Boolean(downloads || revenue || activeUsers);
      const score = (downloads?.value ?? 0) + (revenue?.value ?? 0) * 20 + (activeUsers?.value ?? 0);
      return { project, downloads, revenue, activeUsers, measured, score };
    })
    .sort((a, b) => Number(b.measured) - Number(a.measured) || b.score - a.score || a.project.priority - b.project.priority);
}

export const HALLOWEEN = {
  id: "halloween-2026",
  label: "Halloween",
  due: "2026-10-31",
  showUntil: "2026-11-02T00:00:00Z",
  hint: "Kasım vitrini. Görsel, etkinlik ve ASO aynı haftada.",
  checks: [
    { label: "Halloween mağaza görseli", owner: "you" as const, kind: "screenshots" as const },
    { label: "Halloween etkinliği", owner: "you" as const, kind: "event" as const },
    { label: "ASO: sezon kelimesi", owner: "you" as const, kind: "aso" as const },
  ],
};

export function seasonVisible(now = Date.now()) {
  return now < new Date(HALLOWEEN.showUntil).getTime();
}

export function missingChecks<T extends { label: string }>(project: Project, checks: T[]): T[] {
  const labels = new Set(project.checks.map((item) => item.label));
  return checks.filter((item) => !labels.has(item.label));
}

export const REJECTION_CHECKS: Pick<CheckItem, "label" | "owner" | "kind">[] = [
  { label: "Red gerekçesini düzelt", owner: "you", kind: "rejection" },
  { label: "Düzeltilmiş sürümü yeniden gönder", owner: "you", kind: "rejection" },
];

/** A rejection still needs you when nothing later released or approved that same version. */
export function openRejection(events: StoreEvent[], projectId: string): StoreEvent | null {
  const mine = events.filter((event) => event.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at));
  const rejected = mine.find((event) => event.kind === "rejected");
  if (!rejected) return null;
  const cleared = mine.find(
    (event) => (event.kind === "released" || event.kind === "approved") && event.at > rejected.at && event.version === rejected.version,
  );
  return cleared ? null : rejected;
}
