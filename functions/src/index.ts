import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { col } from "./admin.js";
import { runAnalysis } from "./analyze.js";
import { sendExpoPush } from "./push.js";
import { loadCredentials, syncUser, usersWithCredentials } from "./sync.js";
import { errorMessage } from "./util.js";

const REGION = "europe-west1";
setGlobalOptions({ region: REGION, maxInstances: 10 });

// Set with: firebase functions:secrets:set ANTHROPIC_API_KEY. Never sent to the client.
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Giriş yapman gerekiyor.");
  return auth.uid;
}

export const analyze = onCall({ secrets: [anthropicKey], timeoutSeconds: 300, memory: "512MiB" }, async (req) => {
  const uid = requireUid(req.auth);
  return runAnalysis(uid, anthropicKey.value());
});

export const syncSources = onCall({ timeoutSeconds: 300 }, async (req) => {
  const uid = requireUid(req.auth);
  try {
    return await syncUser(uid);
  } catch (err) {
    logger.error("syncSources failed", { uid, error: errorMessage(err) });
    throw new HttpsError("internal", "Senkron tamamlanamadı.");
  }
});

export const scheduledSync = onSchedule({ schedule: "every 6 hours", timeoutSeconds: 1800 }, async () => {
  const uids = await usersWithCredentials();
  for (const uid of uids) {
    try {
      await syncUser(uid);
    } catch (err) {
      logger.error("scheduledSync user failed", { uid, error: errorMessage(err) });
    }
  }
});

export const dailyDigest = onSchedule(
  { schedule: "every day 09:00", timeZone: "Europe/Istanbul", secrets: [anthropicKey], timeoutSeconds: 1800, memory: "512MiB" },
  async () => {
    const uids = await usersWithCredentials();
    for (const uid of uids) {
      try {
        const insight = await runAnalysis(uid, anthropicKey.value());
        const creds = await loadCredentials(uid);
        const tokens = creds.expoPushTokens ?? [];
        if (tokens.length === 0) continue;
        const critical = await col(uid, "signals")
          .where("read", "==", false)
          .where("severity", "==", "critical")
          .count()
          .get();
        const n = critical.data().count;
        await sendExpoPush(uid, tokens, {
          title: n > 0 ? `Günlük özet · ${n} kritik sinyal` : "Günlük özet",
          body: insight.headline,
          data: { type: "digest", criticalCount: n },
        });
      } catch (err) {
        logger.error("dailyDigest user failed", { uid, error: errorMessage(err) });
      }
    }
  },
);
