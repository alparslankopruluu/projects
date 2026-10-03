import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { decodeProtectedHeader, importSPKI, jwtVerify } from "jose";
import { appStoreJwt, mapAppStoreState } from "../src/sources/appstore.js";

describe("mapAppStoreState", () => {
  it("maps review states to in_review", () => {
    for (const s of ["WAITING_FOR_REVIEW", "IN_REVIEW"]) {
      const m = mapAppStoreState(s);
      assert.equal(m.kind, "in_review");
      assert.equal(m.stage, "review");
      assert.equal(m.signal, null);
    }
  });

  it("maps rejections to rejected with a critical signal", () => {
    for (const s of ["REJECTED", "METADATA_REJECTED"]) {
      const m = mapAppStoreState(s);
      assert.equal(m.kind, "rejected");
      assert.deepEqual(m.signal, { severity: "critical", title: "App Store reddetti" });
    }
  });

  it("maps READY_FOR_SALE to released / live", () => {
    const m = mapAppStoreState("READY_FOR_SALE");
    assert.equal(m.kind, "released");
    assert.equal(m.stage, "live");
    assert.equal(m.signal, null);
  });

  it("maps DEVELOPER_ACTION_NEEDED to a warning signal without an event", () => {
    const m = mapAppStoreState("DEVELOPER_ACTION_NEEDED");
    assert.equal(m.kind, null);
    assert.equal(m.signal?.severity, "warning");
  });

  it("leaves unknown and draft states alone", () => {
    assert.deepEqual(mapAppStoreState("PREPARE_FOR_SUBMISSION").stage, null);
    const m = mapAppStoreState("SOMETHING_NEW");
    assert.equal(m.kind, null);
    assert.equal(m.stage, null);
    assert.equal(m.status, "SOMETHING_NEW");
  });
});

describe("appStoreJwt", () => {
  it("signs an ES256 token for appstoreconnect-v1 valid for 20 minutes", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const now = new Date();
    // Stored keys often contain escaped newlines.
    const jwt = await appStoreJwt({ issuerId: "iss-1", keyId: "KEY123", privateKey: pem.replace(/\n/g, "\\n") }, now);

    const header = decodeProtectedHeader(jwt);
    assert.equal(header.alg, "ES256");
    assert.equal(header.kid, "KEY123");
    const spki = await importSPKI(publicKey.export({ type: "spki", format: "pem" }).toString(), "ES256");
    const { payload } = await jwtVerify(jwt, spki, { audience: "appstoreconnect-v1", issuer: "iss-1" });
    assert.equal((payload.exp ?? 0) - (payload.iat ?? 0), 20 * 60);
  });
});
