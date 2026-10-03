import type { CheckItem, Connection, Project, Signal } from "./model";

// Ported from the Next.js desk (src/lib/seed.ts, 2026-09-28). No metrics here on purpose:
// numbers only appear once a source is connected or entered by hand.
const RECORDED = "2026-09-28T09:00:00.000Z";

const check = (id: string, label: string, done: boolean, owner: CheckItem["owner"]): CheckItem => ({ id, label, done, owner });
const gh = (ref: string): Connection => ({ kind: "github", ref, mode: "api", lastSyncAt: null });
const fb = (ref: string): Connection => ({ kind: "firebase", ref, mode: "manual", lastSyncAt: null });
const asc = (): Connection => ({ kind: "appstore", ref: "", mode: "manual", lastSyncAt: null });
const vercel = (ref: string): Connection => ({ kind: "vercel", ref, mode: "api", lastSyncAt: null });

type Input = Omit<Project, "notes" | "startedAt" | "lastActivityAt" | "archived">;

const make = (input: Input): Project => ({
  ...input,
  notes: [],
  startedAt: RECORDED,
  lastActivityAt: RECORDED,
  archived: false,
});

export function seedProjects(): Project[] {
  return [
    make({
      id: "chordly",
      name: "Chordly",
      tagline: "Learn Guitar Chords",
      hue: 14,
      stage: "review",
      priority: 0,
      nextStep: "App Store inceleme mesajını aç ve yanıtla.",
      platforms: [{ os: "ios", version: "1.1", status: "Mesaj var" }],
      connections: [gh("alparslankopruluu/chordly"), fb("chordcheck-prod"), asc()],
      checks: [
        check("app_store", "App Store gönderimi", true, "you"),
        check("review", "İnceleme mesajını yanıtla", false, "you"),
        check("google_play", "Google Play", false, "later"),
        check("ads", "Reklam", false, "later"),
      ],
    }),
    make({
      id: "bark",
      name: "BARK",
      tagline: "Ev Düzeni",
      hue: 32,
      stage: "building",
      priority: 1,
      nextStep: "Gönderimden önce eksik sürüm ve mağaza alanlarını kapat.",
      platforms: [{ os: "ios", version: "1.0.0", status: "Gönderime hazır değil" }],
      connections: [fb(""), asc()],
      checks: [
        check("app_store", "App Store gönderimi", false, "you"),
        check("screenshots", "Mağaza görselleri", false, "you"),
        check("repo", "GitHub reposunu bağla", false, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "archvia",
      name: "Archvia",
      tagline: "Mimari arşiv",
      hue: 200,
      stage: "building",
      priority: 2,
      nextStep: "1.0 gönderimini tamamla.",
      platforms: [{ os: "ios", version: "1.0", status: "Gönderime hazır değil" }],
      connections: [gh("alparslankopruluu/Archvia"), gh("alparslankopruluu/archiava-web"), asc()],
      checks: [
        check("app_store", "App Store gönderimi", false, "you"),
        check("screenshots", "Mağaza görselleri", false, "you"),
        check("web", "Web", false, "later"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "simetra",
      name: "Simetra",
      tagline: "Nose Job Simulator",
      hue: 330,
      stage: "live",
      priority: 3,
      nextStep: "Hazır reklam planını yayınla.",
      platforms: [
        { os: "ios", version: "1.0.9", status: "Yayında" },
        { os: "android", version: "—", status: "Repo var, mağaza sürümü yok" },
      ],
      connections: [
        gh("alparslankopruluu/simetra-android"),
        gh("alparslankopruluu/simetra-web-"),
        fb("simetra-prod"),
        { kind: "revenuecat", ref: "", mode: "manual", lastSyncAt: null },
        asc(),
      ],
      checks: [
        check("app_store", "App Store", true, "you"),
        check("google_play", "Google Play sürümü", false, "you"),
        check("ads", "Reklam kampanyası", false, "you"),
        check("web", "Web", false, "later"),
      ],
    }),
    make({
      id: "belto",
      name: "Belto",
      tagline: "AI Singing Photo",
      hue: 265,
      stage: "review",
      priority: 4,
      nextStep: "İnceleme sonucunu bekle.",
      platforms: [{ os: "ios", version: "1.0.0", status: "İncelemede" }],
      connections: [gh("alparslankopruluu/belto"), fb("belto-prod"), { kind: "revenuecat", ref: "", mode: "manual", lastSyncAt: null }, asc()],
      checks: [
        check("app_store", "App Store gönderimi", true, "you"),
        check("review", "Apple incelemesi", false, "store"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "screenmotion",
      name: "ScreenMotion",
      tagline: "Ekran videoları",
      hue: 180,
      stage: "review",
      priority: 5,
      nextStep: "İnceleme sonucunu bekle. GitHub reposunu bağla.",
      platforms: [{ os: "ios", version: "1.0.2", status: "İncelemede" }],
      connections: [fb("screenmotion-prod"), asc()],
      checks: [
        check("app_store", "App Store gönderimi", true, "you"),
        check("review", "Apple incelemesi", false, "store"),
        check("repo", "GitHub reposunu bağla", false, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "artpromt",
      name: "ArtPromt",
      tagline: "AI Video Generator",
      hue: 290,
      stage: "review",
      priority: 6,
      nextStep: "İnceleme sonucunu bekle.",
      platforms: [
        { os: "ios", version: "1.1.9", status: "İncelemede" },
        { os: "web", version: "—", status: "Vercel" },
      ],
      connections: [gh("alparslankopruluu/promtart"), gh("alparslankopruluu/artpromt"), fb("artpromt-37132"), vercel("artpromt"), asc()],
      checks: [
        check("app_store", "App Store gönderimi", true, "you"),
        check("review", "Apple incelemesi", false, "store"),
        check("web", "Web", true, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "ayna",
      name: "Ayna",
      tagline: "Salon Rezervasyonu",
      hue: 160,
      stage: "live",
      priority: 7,
      nextStep: "Metrik bozulursa sürüm planla.",
      platforms: [
        { os: "ios", version: "1.1.8", status: "Yayında" },
        { os: "web", version: "—", status: "Vercel" },
      ],
      connections: [gh("alparslankopruluu/salonbook"), gh("alparslankopruluu/aynaweb"), fb("ayna-ec351"), vercel("aynaweb"), asc()],
      checks: [
        check("app_store", "App Store", true, "you"),
        check("web", "Web", true, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "ayna-partner",
      name: "Ayna Partner",
      tagline: "Salon işletme paneli",
      hue: 140,
      stage: "live",
      priority: 8,
      nextStep: "Metrik bozulursa sürüm planla.",
      platforms: [{ os: "ios", version: "1.1.9", status: "Yayında" }],
      connections: [gh("alparslankopruluu/salonpro_business"), fb("ayna-ec351"), asc()],
      checks: [
        check("app_store", "App Store", true, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
    make({
      id: "draft",
      name: "Draft",
      tagline: "Notes & Tasks",
      hue: 48,
      stage: "live",
      priority: 9,
      nextStep: "Metrik bozulursa sürüm planla.",
      platforms: [{ os: "ios", version: "1.1.2", status: "Yayında" }],
      connections: [gh("alparslankopruluu/pinnedly"), fb("pinnedly-48c49"), asc()],
      checks: [
        check("app_store", "App Store", true, "you"),
        check("google_play", "Google Play", false, "later"),
      ],
    }),
  ];
}

// Signals that follow directly from the recorded state above.
export function seedSignals(): Signal[] {
  const base = { read: false, createdAt: RECORDED };
  return [
    {
      ...base,
      id: "chordly-message",
      projectId: "chordly",
      source: "appstore",
      severity: "critical",
      title: "Apple Chordly için mesaj bıraktı",
      body: "Cevap yazılmadan 1.1 ilerlemez.",
      dedupeKey: "appstore:chordly:message:1.1",
    },
    {
      ...base,
      id: "simetra-ads",
      projectId: "simetra",
      source: "manual",
      severity: "warning",
      title: "Simetra reklam planı bekliyor",
      body: "Plan hazır, kampanya açılmadı.",
      dedupeKey: "manual:simetra:ads",
    },
    {
      ...base,
      id: "reviewing",
      projectId: null,
      source: "appstore",
      severity: "info",
      title: "3 uygulama Apple incelemesinde",
      body: "Belto, ScreenMotion, ArtPromt. Sonuç gelene kadar yeni sürüm gönderme.",
      dedupeKey: "appstore:reviewing",
    },
    {
      ...base,
      id: "connect-sources",
      projectId: null,
      source: "manual",
      severity: "info",
      title: "Gelir ve crash verisi bağlı değil",
      body: "Kaynaklar sayfasından RevenueCat, App Store veya elle giriş ekle.",
      dedupeKey: "setup:metrics",
    },
  ];
}
