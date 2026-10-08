import assert from "node:assert/strict";
import { test } from "node:test";

import { compareVersions, parseRelease, updateKind } from "./release";

test("older than the minimum is a force update", () => {
  assert.equal(updateKind("1.0.0", { min: "1.2.0", latest: "1.4.0" }), "force");
});

test("between minimum and latest is a soft update", () => {
  assert.equal(updateKind("1.3.0", { min: "1.2.0", latest: "1.4.0" }), "soft");
  assert.equal(updateKind("1.4.0", { min: "1.2.0", latest: "1.4.0" }), null);
});

test("a missing or broken policy does not block the desk", () => {
  assert.equal(updateKind("1.0.0", null), null);
  assert.equal(updateKind("beta", { min: "1.0.0", latest: "2.0.0" }), null);
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
});

test("the public document only accepts the current platform and a store link", () => {
  const doc = {
    ios: { min: "1.0.0", latest: "1.1.0", url: "https://apps.apple.com/app/id1" },
    android: { min: "nope", latest: "1.0.0", url: "javascript:alert(1)" },
  };
  assert.equal(parseRelease(doc, "ios")?.url, "https://apps.apple.com/app/id1");
  assert.equal(parseRelease(doc, "android"), null);
  assert.equal(parseRelease(doc, "web"), null);
});
