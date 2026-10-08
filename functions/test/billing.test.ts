import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySpend, claudeSpend, parseClaudeBilling, refundSpend, SUBSCRIPTION_ALLOWANCE } from "../src/billing.js";

const NOW = new Date("2026-10-08T09:00:00.000Z");
const later = "2026-11-08T09:00:00.000Z";
const earlier = "2026-10-01T09:00:00.000Z";

describe("claude billing", () => {
  it("spends the subscription allowance before credits", () => {
    const billing = parseClaudeBilling({
      subscription: "active",
      periodEnd: later,
      allowanceRemaining: SUBSCRIPTION_ALLOWANCE,
      credits: 2,
    });
    assert.equal(claudeSpend(billing, NOW), "allowance");
    const next = applySpend(billing!, "allowance");
    assert.equal(next.allowanceRemaining, SUBSCRIPTION_ALLOWANCE - 1);
    assert.equal(next.credits, 2);
  });

  it("spends a credit when the period is closed or the allowance is gone", () => {
    const expired = parseClaudeBilling({ subscription: "active", periodEnd: earlier, allowanceRemaining: 10, credits: 1 });
    const empty = parseClaudeBilling({ subscription: "active", periodEnd: later, allowanceRemaining: 0, credits: 3 });
    const creditsOnly = parseClaudeBilling({ subscription: "none", periodEnd: null, allowanceRemaining: 0, credits: 1 });
    assert.equal(claudeSpend(expired, NOW), "credits");
    assert.equal(claudeSpend(empty, NOW), "credits");
    assert.equal(claudeSpend(creditsOnly, NOW), "credits");
    assert.equal(applySpend(creditsOnly!, "credits").credits, 0);
  });

  it("refuses a missing, unpaid, or malformed account", () => {
    assert.equal(claudeSpend(null, NOW), null);
    assert.equal(claudeSpend(parseClaudeBilling({ subscription: "none", credits: 0 }), NOW), null);
    assert.equal(claudeSpend(parseClaudeBilling({ subscription: "active", periodEnd: later, allowanceRemaining: 0, credits: 0 }), NOW), null);
    assert.equal(claudeSpend(parseClaudeBilling({ subscription: "active", credits: "5" }), NOW), null);
  });

  it("puts a failed call back on the same balance", () => {
    const billing = parseClaudeBilling({ subscription: "none", periodEnd: null, allowanceRemaining: 0, credits: 1 })!;
    assert.equal(refundSpend(applySpend(billing, "credits"), "credits").credits, 1);
  });
});
