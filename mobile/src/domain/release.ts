// Store update gate. Firestore copy lives at config/release and is public-read.
// Below min the desk is blocked. Below latest the prompt can be dismissed.

export type ReleasePlatform = "ios" | "android" | "web";

export type ReleaseChannel = {
  min: string;
  latest: string;
  url: string | null;
};

export function parseVersion(input: string): [number, number, number] | null {
  const core = input.trim().split("-")[0]?.split("+")[0] ?? "";
  if (!/^\d+(\.\d+){0,2}$/.test(core)) return null;
  const [major, minor = "0", patch = "0"] = core.split(".");
  return [Number(major), Number(minor), Number(patch)];
}

/** Negative when left is older. Null when either side is not a version. */
export function compareVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function updateKind(current: string, channel: { min: string; latest: string } | null): "force" | "soft" | null {
  if (!channel) return null;
  const againstMin = compareVersions(current, channel.min);
  if (againstMin !== null && againstMin < 0) return "force";
  const againstLatest = compareVersions(current, channel.latest);
  if (againstLatest !== null && againstLatest < 0) return "soft";
  return null;
}

function storeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (/^https:\/\//i.test(url) || /^itms-apps:\/\//i.test(url)) return url;
  return null;
}

export function parseRelease(data: unknown, platform: ReleasePlatform): ReleaseChannel | null {
  if (!data || typeof data !== "object") return null;
  const row = (data as Record<string, unknown>)[platform];
  if (!row || typeof row !== "object") return null;
  const channel = row as Record<string, unknown>;
  if (typeof channel.min !== "string" || typeof channel.latest !== "string") return null;
  if (!parseVersion(channel.min) || !parseVersion(channel.latest)) return null;
  return { min: channel.min.trim(), latest: channel.latest.trim(), url: storeUrl(channel.url) };
}
