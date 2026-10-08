import { userDoc, db } from "./admin.js";
import { applySpend, claudeSpend, parseClaudeBilling, refundSpend, type ClaudeBilling, type ClaudeSpend } from "./billing.js";

const refFor = (uid: string) => userDoc(uid).collection("billing").doc("claude");

export async function reserveClaudeCall(uid: string, now: Date): Promise<ClaudeSpend | null> {
  const ref = refFor(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const billing = parseClaudeBilling(snap.data());
    const spend = claudeSpend(billing, now);
    if (!spend || !billing) return null;
    tx.set(ref, applySpend(billing, spend));
    return spend;
  });
}

export async function refundClaudeCall(uid: string, spend: ClaudeSpend): Promise<void> {
  const ref = refFor(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const billing = parseClaudeBilling(snap.data()) ?? emptyBilling();
    tx.set(ref, refundSpend(billing, spend));
  });
}

function emptyBilling(): ClaudeBilling {
  return { subscription: "none", periodEnd: null, allowanceRemaining: 0, credits: 0 };
}
