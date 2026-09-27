import { createBrief } from "./brief";
import type { Project } from "./types";

const owner = { email: "kprl884@gmail.com", role: "owner" as const };

function project(
  input: Omit<Project, "brief" | "notes" | "members" | "briefUpdatedAt" | "lastCommitSha" | "links"> & {
    open: string[];
    links?: Project["links"];
  },
): Project {
  const { open, links = [], ...rest } = input;
  return {
    ...rest,
    links,
    notes: [],
    members: [owner],
    briefUpdatedAt: null,
    lastCommitSha: null,
    brief: createBrief({
      name: rest.name,
      reason: rest.reason,
      platforms: rest.platforms,
      repo: rest.repo,
      stack: rest.stack,
      open,
    }),
  };
}

export function seedProjects(): Project[] {
  return [
    project({
      id: "chordly",
      name: "Learn Guitar Chords: Chordly",
      reason: "İnceleme mesajı açık. Cevap yazılmadan bu sürüm ilerlemez.",
      attention: "review_message",
      priority: 0,
      repo: "alparslankopruluu/chordly",
      firebaseProject: "chordcheck-prod",
      stack: "Firebase",
      platforms: [{ os: "ios", version: "1.1", status: "Waiting for Review" }],
      open: ["App Store inceleme mesajını aç ve yanıtla."],
      links: [{ label: "GitHub", url: "https://github.com/alparslankopruluu/chordly" }],
    }),
    project({
      id: "bark",
      name: "BARK: Ev Düzeni",
      reason: "Gönderime hazır değil. Eksik olan sende.",
      attention: "prepare",
      priority: 1,
      repo: "",
      firebaseProject: "",
      stack: "Firebase",
      platforms: [{ os: "ios", version: "1.0.0", status: "Prepare for Submission" }],
      open: ["Gönderimden önce eksik sürüm ve mağaza alanlarını kapat."],
    }),
    project({
      id: "archvia",
      name: "Archvia",
      reason: "Gönderime hazır değil. Eksik olan sende.",
      attention: "prepare",
      priority: 2,
      repo: "alparslankopruluu/Archvia",
      firebaseProject: "",
      stack: "Firebase, web ayrı",
      platforms: [{ os: "ios", version: "1.0", status: "Prepare for Submission" }],
      open: ["1.0 gönderimini tamamla."],
      links: [
        { label: "GitHub", url: "https://github.com/alparslankopruluu/Archvia" },
        { label: "Web repo", url: "https://github.com/alparslankopruluu/archiava-web" },
      ],
    }),
    project({
      id: "simetra",
      name: "Nose Job Simulator: Simetra",
      reason: "Yayında. Reklam planı hazır, kampanya açılmadı.",
      attention: "live",
      priority: 3,
      repo: "",
      firebaseProject: "simetra-prod",
      stack: "Firebase, RevenueCat",
      platforms: [
        { os: "ios", version: "1.0.9", status: "Ready for Distribution" },
        { os: "android", version: "—", status: "Repo var, mağaza sürümü girilmedi" },
      ],
      open: ["Hazır reklam planını yayınla. Meta, Apple Ads veya sosyal post."],
      links: [
        { label: "Android repo", url: "https://github.com/alparslankopruluu/simetra-android" },
        { label: "Web repo", url: "https://github.com/alparslankopruluu/simetra-web-" },
      ],
    }),
    project({
      id: "belto",
      name: "Belto: AI Singing Photo",
      reason: "İncelemede. Sonuç gelene kadar yeni sürüm gönderme.",
      attention: "waiting_review",
      priority: 4,
      repo: "alparslankopruluu/belto",
      firebaseProject: "belto-prod",
      stack: "Firebase, RevenueCat",
      platforms: [{ os: "ios", version: "1.0.0", status: "Waiting for Review" }],
      open: ["İnceleme sonucunu bekle."],
      links: [{ label: "GitHub", url: "https://github.com/alparslankopruluu/belto" }],
    }),
    project({
      id: "screenmotion",
      name: "ScreenMotion",
      reason: "İncelemede. Sonuç gelene kadar yeni sürüm gönderme.",
      attention: "waiting_review",
      priority: 5,
      repo: "",
      firebaseProject: "screenmotion-prod",
      stack: "Firebase",
      platforms: [{ os: "ios", version: "1.0.2", status: "Waiting for Review" }],
      open: ["İnceleme sonucunu bekle.", "GitHub reposunu bağla."],
    }),
    project({
      id: "artpromt",
      name: "ArtPromt: AI Video Generator",
      reason: "İncelemede. Sonuç gelene kadar yeni sürüm gönderme.",
      attention: "waiting_review",
      priority: 6,
      repo: "alparslankopruluu/promtart",
      firebaseProject: "artpromt-37132",
      stack: "Firebase, web Vercel",
      platforms: [
        { os: "ios", version: "1.1.9", status: "Waiting for Review" },
        { os: "web", version: "—", status: "Vercel" },
      ],
      open: ["İnceleme sonucunu bekle."],
      links: [
        { label: "GitHub", url: "https://github.com/alparslankopruluu/promtart" },
        { label: "Web repo", url: "https://github.com/alparslankopruluu/artpromt" },
      ],
    }),
    project({
      id: "ayna",
      name: "Ayna: Salon Rezervasyonu",
      reason: "Yayında. Metrik bozulursa güncelle.",
      attention: "live",
      priority: 7,
      repo: "alparslankopruluu/salonbook",
      firebaseProject: "ayna-ec351",
      stack: "Firebase",
      platforms: [
        { os: "ios", version: "1.1.8", status: "Ready for Distribution" },
        { os: "web", version: "—", status: "Vercel" },
      ],
      open: ["Metrik bozulursa sürüm planla."],
      links: [
        { label: "GitHub", url: "https://github.com/alparslankopruluu/salonbook" },
        { label: "Web repo", url: "https://github.com/alparslankopruluu/aynaweb" },
      ],
    }),
    project({
      id: "ayna-partner",
      name: "Ayna Partner",
      reason: "Yayında. Metrik bozulursa güncelle.",
      attention: "live",
      priority: 8,
      repo: "alparslankopruluu/salonpro_business",
      firebaseProject: "ayna-ec351",
      stack: "Firebase",
      platforms: [{ os: "ios", version: "1.1.9", status: "Ready for Distribution" }],
      open: ["Metrik bozulursa sürüm planla."],
      links: [{ label: "GitHub", url: "https://github.com/alparslankopruluu/salonpro_business" }],
    }),
    project({
      id: "draft",
      name: "Draft: Notes & Tasks",
      reason: "Yayında. Metrik bozulursa güncelle.",
      attention: "live",
      priority: 9,
      repo: "alparslankopruluu/pinnedly",
      firebaseProject: "pinnedly-48c49",
      stack: "Firebase",
      platforms: [{ os: "ios", version: "1.1.2", status: "Ready for Distribution" }],
      open: ["Metrik bozulursa sürüm planla."],
      links: [{ label: "GitHub", url: "https://github.com/alparslankopruluu/pinnedly" }],
    }),
  ];
}
