import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { Platform } from "react-native";

export const FUNCTIONS_REGION = "europe-west1";

// Public web-app config. Safe in the bundle; access is enforced by firestore.rules.
function configFromEnv() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "";
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  };
}

export type FirebaseHandles = { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions };

let handles: FirebaseHandles | null | undefined;

function makeAuth(app: FirebaseApp): Auth {
  if (Platform.OS === "web") return getAuth(app);
  // getReactNativePersistence only exists in the React Native build of firebase/auth,
  // which Metro picks through the "react-native" export condition.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require("firebase/auth") as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export function firebase(): FirebaseHandles | null {
  if (handles !== undefined) return handles;
  const config = configFromEnv();
  if (!config) {
    handles = null;
    return handles;
  }
  const existing = getApps().length > 0;
  const app = existing ? getApp() : initializeApp(config);
  handles = {
    app,
    auth: existing ? getAuth(app) : makeAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app, FUNCTIONS_REGION),
  };
  return handles;
}
