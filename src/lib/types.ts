export type Attention =
  | "review_message"
  | "waiting_review"
  | "prepare"
  | "ready"
  | "live";

export type PlatformOs = "ios" | "android" | "web";

export type Platform = {
  os: PlatformOs;
  version: string;
  status: string;
};

export type Note = {
  id: string;
  body: string;
  createdAt: string;
  visibility: "private" | "shared";
};

export type Member = {
  email: string;
  role: "owner" | "editor" | "viewer";
};

export type ProjectLink = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  reason: string;
  attention: Attention;
  priority: number;
  repo: string;
  firebaseProject: string;
  stack: string;
  platforms: Platform[];
  links: ProjectLink[];
  notes: Note[];
  brief: string;
  briefUpdatedAt: string | null;
  lastCommitSha: string | null;
  members: Member[];
};

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export const ATTENTION_LABEL: Record<Attention, string> = {
  review_message: "Mesaj var",
  waiting_review: "İncelemede",
  prepare: "Gönderime hazır değil",
  ready: "Yayına hazır",
  live: "Yayında",
};
