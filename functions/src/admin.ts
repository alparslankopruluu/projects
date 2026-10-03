import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

if (getApps().length === 0) initializeApp();

export const db: Firestore = getFirestore();

// Firestore layout helpers (see model.ts header).
export const userDoc = (uid: string) => db.collection("users").doc(uid);
export const col = (uid: string, name: "projects" | "signals" | "metrics" | "events" | "commits" | "insights" | "private") =>
  userDoc(uid).collection(name);
export const credentialsDoc = (uid: string) => col(uid, "private").doc("credentials");
