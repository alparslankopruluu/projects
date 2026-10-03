import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { credentialsDoc } from "./admin.js";

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

/** Sends one notification to every token via the Expo push service; prunes tokens Expo reports as unregistered. */
export async function sendExpoPush(
  uid: string,
  tokens: string[],
  message: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  const valid = [...new Set(tokens)].filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t));
  const dead: string[] = [];
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((to) => ({ to, sound: "default", ...message }))),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn("Expo push failed", { uid, status: res.status, body: await res.text().catch(() => "") });
      continue;
    }
    const { data } = (await res.json()) as { data: ExpoTicket[] };
    data.forEach((t, j) => {
      if (t.status === "error" && t.details?.error === "DeviceNotRegistered") dead.push(chunk[j]);
    });
  }
  if (dead.length) await credentialsDoc(uid).update({ expoPushTokens: FieldValue.arrayRemove(...dead) });
}
