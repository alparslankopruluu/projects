// App Store Connect adapter. connection.ref = App Store Connect app id (numeric "Apple ID" of the app).
// Credential: credentials.appstore = { issuerId, keyId, privateKey } from an App Store Connect API key
// (Users and Access → Integrations → App Store Connect API, role "Developer" is enough). privateKey is the .p8 contents.
import { importPKCS8, SignJWT } from "jose";
import type { Platform, Severity, Stage, StoreEventKind } from "../model.js";
import { nextStage } from "../rules.js";
import { emptyResult, type Credentials, type SourceAdapter } from "../types.js";
import { fetchJson, hashId } from "../util.js";

export type AppStoreMapping = {
  kind: StoreEventKind | null;
  stage: Stage | null;
  status: string; // human label stored on Platform.status
  signal: { severity: Severity; title: string } | null;
};

/** Pure mapping of App Store Connect appStoreState / appVersionState to our model. */
export function mapAppStoreState(state: string): AppStoreMapping {
  switch (state) {
    case "WAITING_FOR_REVIEW":
      return { kind: "in_review", stage: "review", status: "İnceleme bekliyor", signal: null };
    case "IN_REVIEW":
      return { kind: "in_review", stage: "review", status: "İncelemede", signal: null };
    case "REJECTED":
    case "METADATA_REJECTED":
      return {
        kind: "rejected",
        stage: "review",
        status: "Reddedildi",
        signal: { severity: "critical", title: "App Store reddetti" },
      };
    case "DEVELOPER_ACTION_NEEDED":
      return {
        kind: null,
        stage: "review",
        status: "Geliştirici işlemi gerekli",
        signal: { severity: "warning", title: "App Store senden işlem bekliyor" },
      };
    case "PENDING_DEVELOPER_RELEASE":
    case "PENDING_APPLE_RELEASE":
    case "ACCEPTED":
      return { kind: "approved", stage: "review", status: "Onaylandı, yayın bekliyor", signal: null };
    case "READY_FOR_SALE":
    case "READY_FOR_DISTRIBUTION":
      return { kind: "released", stage: "live", status: "Yayında", signal: null };
    case "WAITING_FOR_EXPORT_COMPLIANCE":
    case "READY_FOR_REVIEW":
    case "PROCESSING_FOR_APP_STORE":
      return { kind: "submitted", stage: "review", status: "Gönderildi", signal: null };
    case "PREPARE_FOR_SUBMISSION":
      return { kind: null, stage: null, status: "Hazırlanıyor", signal: null };
    default:
      return { kind: null, stage: null, status: state || "Bilinmiyor", signal: null };
  }
}

type AscVersion = {
  id: string;
  attributes: {
    versionString: string;
    platform: string;
    appStoreState?: string;
    appVersionState?: string;
    createdDate?: string;
  };
};

export async function appStoreJwt(creds: NonNullable<Credentials["appstore"]>, now = new Date()): Promise<string> {
  // Keys pasted into a text field often arrive with literal "\n".
  const pem = creds.privateKey.includes("\\n") ? creds.privateKey.replace(/\\n/g, "\n") : creds.privateKey;
  const key = await importPKCS8(pem.trim(), "ES256");
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: creds.keyId, typ: "JWT" })
    .setIssuer(creds.issuerId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 20 * 60)
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

export const syncAppStore: SourceAdapter = async ({ project, connection, credentials, now }) => {
  const creds = credentials.appstore;
  if (!creds?.issuerId || !creds.keyId || !creds.privateKey) throw new Error("App Store Connect API anahtarı kayıtlı değil");
  const appId = connection.ref.trim();
  if (!/^\d+$/.test(appId)) throw new Error(`geçersiz App Store app id "${connection.ref}"`);

  const token = await appStoreJwt(creds, now);
  const { data } = await fetchJson<{ data: AscVersion[] }>(
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?limit=5`,
    { headers: { Authorization: `Bearer ${token}` }, label: "App Store Connect" },
  );

  const result = emptyResult();
  const versions = data
    .filter((v) => (v.attributes.platform ?? "IOS") === "IOS")
    .sort((a, b) => (b.attributes.createdDate ?? "").localeCompare(a.attributes.createdDate ?? ""));

  for (const v of versions) {
    const state = v.attributes.appStoreState ?? v.attributes.appVersionState ?? "";
    const m = mapAppStoreState(state);
    if (m.kind) {
      result.events.push({
        id: hashId(`appstore:${v.id}:${m.kind}`),
        projectId: project.id,
        source: "appstore",
        kind: m.kind,
        version: v.attributes.versionString,
        detail: `${state} · ${m.status}`,
        at: v.attributes.createdDate ?? now.toISOString(),
      });
    }
  }

  const latest = versions[0];
  if (latest) {
    const state = latest.attributes.appStoreState ?? latest.attributes.appVersionState ?? "";
    const m = mapAppStoreState(state);
    const version = latest.attributes.versionString;
    if (m.signal) {
      result.signals.push({
        projectId: project.id,
        source: "appstore",
        severity: m.signal.severity,
        title: `${project.name}: ${m.signal.title}`,
        body: `iOS ${version} · ${m.status}. App Store Connect'te Resolution Center'ı kontrol et.`,
        dedupeKey: `appstore:${latest.id}:${state}`,
      });
    }
    const ios: Platform = { os: "ios", version, status: m.status };
    const platforms = project.platforms.some((p) => p.os === "ios")
      ? project.platforms.map((p) => (p.os === "ios" ? ios : p))
      : [...project.platforms, ios];
    result.projectPatch.platforms = platforms;
    const stage = nextStage(project.stage, m.stage);
    if (stage !== project.stage) result.projectPatch.stage = stage;
  }
  return result;
};
