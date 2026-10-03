// GitHub adapter. connection.ref = "owner/repo". Credential: credentials.github.token
// (fine-grained PAT with read-only "Contents" + "Metadata"). Public repos work without a token, rate-limited.
import type { Commit } from "../model.js";
import { emptyResult, type SourceAdapter } from "../types.js";
import { fetchJson } from "../util.js";

type GhCommit = {
  sha: string;
  commit: { message: string; author: { date: string } | null; committer: { date: string } | null };
};

export const syncGithub: SourceAdapter = async ({ project, connection, credentials }) => {
  const ref = connection.ref.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(ref)) throw new Error(`geçersiz repo "${connection.ref}" (owner/repo bekleniyor)`);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "projects-functions",
  };
  if (credentials.github?.token) headers.Authorization = `Bearer ${credentials.github.token}`;

  const list = await fetchJson<GhCommit[]>(`https://api.github.com/repos/${ref}/commits?per_page=20`, {
    headers,
    label: "GitHub",
  });

  const result = emptyResult();
  result.commits = list.map(
    (c): Commit => ({
      sha: c.sha,
      projectId: project.id,
      repo: ref,
      message: c.commit.message.split("\n")[0].slice(0, 300),
      at: c.commit.committer?.date ?? c.commit.author?.date ?? new Date(0).toISOString(),
    }),
  );
  const newest = result.commits.map((c) => c.at).sort().at(-1);
  if (newest && (!project.lastActivityAt || newest > project.lastActivityAt)) {
    result.projectPatch.lastActivityAt = newest;
  }
  return result;
};
