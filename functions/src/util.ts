import { createHash } from "node:crypto";

// Deterministic Firestore doc id for a dedupe key, so re-running a sync overwrites instead of duplicating.
export function hashId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export async function fetchJson<T>(url: string, init: RequestInit & { label: string }): Promise<T> {
  const { label, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: rest.signal ?? AbortSignal.timeout(20_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} ${res.status}: ${truncate(body.replace(/\s+/g, " "), 200)}`);
  }
  return (await res.json()) as T;
}
