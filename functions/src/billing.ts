// Who may spend the studio's Claude key. Mobile copy: mobile/src/domain/billing.ts.
// A paid period includes SUBSCRIPTION_ALLOWANCE calls. After that, credits pay per call.
// The client cannot write users/{uid}/billing/claude.

export const SUBSCRIPTION_ALLOWANCE = 40;

export type ClaudeSpend = "allowance" | "credits";

export type ClaudeBilling = {
  subscription: "active" | "none";
  periodEnd: string | null;
  allowanceRemaining: number;
  credits: number;
};

function whole(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function parseClaudeBilling(data: unknown): ClaudeBilling | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    subscription: row.subscription === "active" ? "active" : "none",
    periodEnd: typeof row.periodEnd === "string" ? row.periodEnd : null,
    allowanceRemaining: whole(row.allowanceRemaining),
    credits: whole(row.credits),
  };
}

function subscriptionOpen(billing: ClaudeBilling, now: Date): boolean {
  if (billing.subscription !== "active" || billing.allowanceRemaining < 1 || !billing.periodEnd) return false;
  const end = Date.parse(billing.periodEnd);
  return Number.isFinite(end) && end > now.getTime();
}

/** Which balance pays for one call. Allowance first, then credits. */
export function claudeSpend(billing: ClaudeBilling | null, now: Date): ClaudeSpend | null {
  if (!billing) return null;
  if (subscriptionOpen(billing, now)) return "allowance";
  if (billing.credits > 0) return "credits";
  return null;
}

export function applySpend(billing: ClaudeBilling, spend: ClaudeSpend): ClaudeBilling {
  if (spend === "allowance") return { ...billing, allowanceRemaining: billing.allowanceRemaining - 1 };
  return { ...billing, credits: billing.credits - 1 };
}

export function refundSpend(billing: ClaudeBilling, spend: ClaudeSpend): ClaudeBilling {
  if (spend === "allowance") return { ...billing, allowanceRemaining: billing.allowanceRemaining + 1 };
  return { ...billing, credits: billing.credits + 1 };
}
