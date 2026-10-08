import assert from "node:assert/strict";
import { test } from "node:test";
import { claudeSpend, parseClaudeBilling, SUBSCRIPTION_ALLOWANCE } from "./billing";

const NOW = new Date("2026-10-08T09:00:00.000Z");

test("an open subscription spends allowance before credits", () => {
  const billing = parseClaudeBilling({
    subscription: "active",
    periodEnd: "2026-11-08T09:00:00.000Z",
    allowanceRemaining: SUBSCRIPTION_ALLOWANCE,
    credits: 2,
  });
  assert.equal(claudeSpend(billing, NOW), "allowance");
});

test("credits pay when there is no open allowance", () => {
  const billing = parseClaudeBilling({ subscription: "none", periodEnd: null, allowanceRemaining: 0, credits: 1 });
  assert.equal(claudeSpend(billing, NOW), "credits");
});

test("an unpaid account cannot call Claude", () => {
  assert.equal(claudeSpend(null, NOW), null);
  assert.equal(claudeSpend(parseClaudeBilling({ subscription: "active", periodEnd: "2026-10-01T00:00:00.000Z", allowanceRemaining: 4, credits: 0 }), NOW), null);
});
