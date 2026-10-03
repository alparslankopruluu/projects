// Vercel adapter. connection.ref = Vercel project id ("prj_…") or project name.
// Credential: credentials.vercel.token (account token), optional credentials.vercel.teamId for team projects.
import type { StoreEvent } from "../model.js";
import { emptyResult, type SourceAdapter } from "../types.js";
import { fetchJson, hashId, truncate } from "../util.js";

type VercelDeployment = {
  uid: string;
  name: string;
  url: string | null;
  state?: string;
  readyState?: string;
  created: number;
  target?: string | null;
  meta?: { githubCommitMessage?: string; githubCommitSha?: string };
};

export const syncVercel: SourceAdapter = async ({ project, connection, credentials }) => {
  const token = credentials.vercel?.token;
  if (!token) throw new Error("Vercel token kayıtlı değil");

  const params = new URLSearchParams({ limit: "10" });
  const ref = connection.ref.trim();
  // The v6 endpoint filters by id via `projectId`; plain names are matched with `app`.
  if (ref.startsWith("prj_")) params.set("projectId", ref);
  else params.set("app", ref);
  if (credentials.vercel?.teamId) params.set("teamId", credentials.vercel.teamId);

  const { deployments } = await fetchJson<{ deployments: VercelDeployment[] }>(
    `https://api.vercel.com/v6/deployments?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, label: "Vercel" },
  );

  const result = emptyResult();
  const sorted = [...deployments].sort((a, b) => b.created - a.created);
  let seenReady = false; // newest first: an ERROR older than a READY deploy is already fixed
  for (const d of sorted) {
    const state = d.state ?? d.readyState ?? "";
    if (state !== "READY" && state !== "ERROR") continue; // skip BUILDING/QUEUED/CANCELED
    const at = new Date(d.created).toISOString();
    const version = d.meta?.githubCommitSha?.slice(0, 7) ?? d.uid.slice(4, 11);
    const detail = truncate(
      [d.target ?? "preview", d.meta?.githubCommitMessage?.split("\n")[0], d.url].filter(Boolean).join(" · "),
      300,
    );
    const event: StoreEvent = {
      id: hashId(`vercel:${d.uid}`),
      projectId: project.id,
      source: "vercel",
      kind: state === "READY" ? "deployed" : "deploy_failed",
      version,
      detail,
      at,
    };
    result.events.push(event);
    if (state === "READY") seenReady = true;
    if (state === "ERROR" && !seenReady) {
      result.signals.push({
        projectId: project.id,
        source: "vercel",
        severity: "critical",
        title: `${project.name}: Vercel deploy başarısız`,
        body: detail || `Deploy ${d.uid} ERROR durumunda.`,
        dedupeKey: `vercel:deploy_failed:${d.uid}`,
      });
    }
  }
  const newest = result.events[0]?.at;
  if (newest && (!project.lastActivityAt || newest > project.lastActivityAt)) {
    result.projectPatch.lastActivityAt = newest;
  }
  return result;
};
