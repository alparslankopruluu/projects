// Canonical data model. functions/src/model.ts mirrors this file; change both together.
// Firestore layout (all under users/{uid}):
//   projects/{projectId}      Project
//   signals/{signalId}        Signal      (inbox: notifications from sources, rules and Claude)
//   metrics/{metricId}        Metric      (one row per project + key + period)
//   events/{eventId}          StoreEvent  (submissions, rejections, approvals, deploys)
//   commits/{sha}             Commit
//   captures/{captureId}      Capture     (basket: ideas, news, essays, tweets, screenshots)
//   ideas/{ideaId}            Idea        (drafts minted from the basket)
//   insights/latest           Insight     (last Claude analysis)
//   desk/profile              { plan }    (free | pro; billing is not connected)
//   private/credentials       Credentials (write-only from the client, read by Functions)

export type Stage = "idea" | "building" | "review" | "live" | "paused";

export type PlatformOs = "ios" | "android" | "web";

export type Platform = {
  os: PlatformOs;
  version: string;
  status: string;
};

export type SourceKind =
  | "github"
  | "vercel"
  | "firebase"
  | "supabase"
  | "appstore"
  | "googleplay"
  | "revenuecat"
  | "claude"
  | "manual";

export type Connection = {
  kind: SourceKind;
  // Identifier inside that service: "owner/repo", Vercel project id, App Store app id, package name…
  ref: string;
  mode: "api" | "manual";
  lastSyncAt: string | null;
};

export type CheckKind = "task" | "aso" | "screenshots" | "ads" | "event" | "rejection";

export type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  owner: "you" | "store" | "later";
  kind?: CheckKind;
};

export type Note = {
  id: string;
  body: string;
  createdAt: string;
  author: "you" | "claude";
};

export type Project = {
  id: string;
  name: string;
  tagline: string;
  hue: number; // 0-360, drives the card gradient
  stage: Stage;
  priority: number;
  nextStep: string;
  platforms: Platform[];
  connections: Connection[];
  checks: CheckItem[];
  notes: Note[];
  startedAt: string;
  lastActivityAt: string;
  archived: boolean;
};

export type Severity = "critical" | "warning" | "info" | "success";

export type Signal = {
  id: string;
  projectId: string | null;
  source: SourceKind;
  severity: Severity;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  // Stable key so a sync job can upsert instead of duplicating the same alert.
  dedupeKey: string;
};

export type MetricKey = "downloads" | "revenue" | "activeUsers" | "crashFree" | "rating" | "trials" | "deploys";

export type Metric = {
  id: string;
  projectId: string;
  key: MetricKey;
  value: number;
  previous: number | null;
  period: "day" | "week" | "month";
  source: SourceKind;
  recordedAt: string;
};

export type StoreEventKind = "submitted" | "in_review" | "rejected" | "approved" | "released" | "deploy_failed" | "deployed";

export type StoreEvent = {
  id: string;
  projectId: string;
  source: SourceKind;
  kind: StoreEventKind;
  version: string;
  detail: string;
  at: string;
};

export type Commit = {
  sha: string;
  projectId: string;
  repo: string;
  message: string;
  at: string;
};

export type Insight = {
  generatedAt: string;
  model: string;
  headline: string;
  focus: { projectId: string | null; action: string; why: string }[];
  risks: { projectId: string | null; title: string; detail: string }[];
};

export const STAGE_LABEL: Record<Stage, string> = {
  idea: "Fikir",
  building: "Yapılıyor",
  review: "İncelemede",
  live: "Yayında",
  paused: "Durdu",
};

export const SOURCE_LABEL: Record<SourceKind, string> = {
  github: "GitHub",
  vercel: "Vercel",
  firebase: "Firebase",
  supabase: "Supabase",
  appstore: "App Store",
  googleplay: "Google Play",
  revenuecat: "RevenueCat",
  claude: "Claude",
  manual: "Elle",
};

export const METRIC_LABEL: Record<MetricKey, string> = {
  downloads: "İndirme",
  revenue: "Gelir",
  activeUsers: "Aktif kullanıcı",
  crashFree: "Crash-free",
  rating: "Puan",
  trials: "Deneme",
  deploys: "Deploy",
};

export type Plan = "free" | "pro";

/** How many ideas a free desk may keep. Minting a draft is free; keeping and applying it is not. */
export const FREE_KEPT_IDEAS = 3;

export type CaptureKind = "idea" | "news" | "essay" | "tweet" | "screenshot" | "note";

export type CaptureCategory = "architecture" | "aesthetic" | "growth" | "story" | "product" | "tech" | "other";

export type Capture = {
  id: string;
  title: string;
  body: string;
  url: string;
  kind: CaptureKind;
  category: CaptureCategory;
  projectId: string | null;
  read: boolean;
  createdAt: string;
  /** Days after createdAt before the home row says this item is still unread. */
  remindAfterDays: number;
};

export type Idea = {
  id: string;
  title: string;
  body: string;
  /** existing writes onto a project; new opens a project in the idea stage. */
  target: "existing" | "new";
  projectId: string | null;
  captureIds: string[];
  category: CaptureCategory;
  createdAt: string;
  kept: boolean;
};

export const CAPTURE_KIND_LABEL: Record<CaptureKind, string> = {
  idea: "Fikir",
  news: "Haber",
  essay: "Köşe yazısı",
  tweet: "Tweet",
  screenshot: "Ekran görüntüsü",
  note: "Not",
};

export const CAPTURE_CATEGORY_LABEL: Record<CaptureCategory, string> = {
  architecture: "Mimari",
  aesthetic: "Estetik",
  growth: "Büyüme",
  story: "Haber ve yazı",
  product: "Ürün",
  tech: "Teknik",
  other: "Diğer",
};

export const CHECK_KIND_LABEL: Record<CheckKind, string> = {
  task: "İş",
  aso: "ASO",
  screenshots: "Görsel",
  ads: "Reklam",
  event: "Etkinlik",
  rejection: "Red",
};
