import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { FirebasePublicConfig } from "./types";

export const FIREBASE_CONFIG_KEY = "projects.firebaseConfig";

export function configFromEnv(): FirebasePublicConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId,
  };
}

export function readStoredConfig(): FirebasePublicConfig | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!raw) return configFromEnv();
  try {
    const parsed = JSON.parse(raw) as FirebasePublicConfig;
    if (!parsed.apiKey || !parsed.projectId || !parsed.appId) return configFromEnv();
    return parsed;
  } catch {
    return configFromEnv();
  }
}

export function saveStoredConfig(config: FirebasePublicConfig | null) {
  if (config) window.localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  else window.localStorage.removeItem(FIREBASE_CONFIG_KEY);
}

let cachedKey = "";
let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function connectFirebase(config: FirebasePublicConfig) {
  const key = config.appId;
  if (cached && cachedKey === key) return cached;
  const options: FirebaseOptions = config;
  const app = getApps().find((item) => item.options.appId === config.appId) ?? initializeApp(options, config.appId);
  cachedKey = key;
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
