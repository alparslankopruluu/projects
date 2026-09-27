import { applyCommits, type BriefCommit } from "@/lib/brief";

export const runtime = "nodejs";

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRIEF_PATH = "docs/project-brief.md";

type SyncBody = {
  repo?: string;
  token?: string;
  brief?: string;
  writeToRepo?: boolean;
  lastCommitSha?: string | null;
};

type GhCommit = {
  sha: string;
  commit?: { message?: string; author?: { date?: string } };
};

async function github(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "projects-shelf",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return fail(400, "İstek okunamadı.");
  }

  const repo = body.repo?.trim() ?? "";
  if (!REPO.test(repo)) return fail(400, "Repo owner/name biçiminde olmalı.");

  const token = body.token?.trim() || process.env.GITHUB_TOKEN || "";
  if (!token) return fail(400, "GitHub token yok. Ayarlardan ekle.");

  const brief = typeof body.brief === "string" ? body.brief.slice(0, 30_000) : "";
  const writeToRepo = body.writeToRepo !== false;

  const commitsResponse = await github(`/repos/${repo}/commits?per_page=12`, token);
  if (commitsResponse.status === 401 || commitsResponse.status === 403) {
    return fail(401, "Token geçersiz veya bu repoya yetkisi yok.");
  }
  if (commitsResponse.status === 404) return fail(404, "Repo bulunamadı.");
  if (!commitsResponse.ok) return fail(502, "GitHub commit listesi alınamadı.");

  const raw = (await commitsResponse.json()) as GhCommit[];
  const commits: BriefCommit[] = raw
    .filter((item) => item.sha && item.commit?.message)
    .map((item) => ({
      sha: item.sha,
      date: item.commit?.author?.date ?? new Date().toISOString(),
      message: item.commit?.message ?? "",
    }));

  if (commits.length === 0) {
    return Response.json({ brief, latestSha: null, changed: false, written: false, message: "Repo'da commit yok." });
  }

  if (body.lastCommitSha && body.lastCommitSha === commits[0].sha) {
    return Response.json({
      brief,
      latestSha: commits[0].sha,
      changed: false,
      written: false,
      message: "Yeni commit yok.",
    });
  }

  const updated = applyCommits(brief, commits);
  let written = false;
  let writeError: string | null = null;
  let commitUrl: string | null = null;

  if (writeToRepo && updated.changed) {
    try {
      const result = await writeBrief(repo, token, updated.brief);
      written = result.written;
      commitUrl = result.commitUrl;
    } catch (error) {
      writeError = error instanceof Error ? error.message : "Brifing repoya yazılamadı.";
    }
  }

  return Response.json({
    brief: updated.brief,
    latestSha: updated.latestSha,
    changed: updated.changed,
    written,
    writeError,
    commitUrl,
    message: writeError
      ? "Brifing güncellendi. Repoya yazılamadı."
      : written
        ? "Brifing güncellendi ve repoya yazıldı."
        : "Brifing güncellendi.",
  });
}

async function writeBrief(repo: string, token: string, content: string) {
  const repoResponse = await github(`/repos/${repo}`, token);
  if (!repoResponse.ok) throw new Error("Repo bilgisi alınamadı.");
  const repoJson = (await repoResponse.json()) as { default_branch?: string };
  const branch = repoJson.default_branch || "main";

  const existing = await github(`/repos/${repo}/contents/${BRIEF_PATH}?ref=${encodeURIComponent(branch)}`, token);
  let sha: string | undefined;
  if (existing.ok) {
    const file = (await existing.json()) as { sha?: string; content?: string; encoding?: string };
    sha = file.sha;
    if (file.encoding === "base64" && file.content) {
      const current = Buffer.from(file.content, "base64").toString("utf8");
      if (current === content) return { written: false, commitUrl: null };
    }
  } else if (existing.status !== 404) {
    throw new Error("Mevcut brifing okunamadı.");
  }

  const put = await github(`/repos/${repo}/contents/${BRIEF_PATH}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message: "Update project brief",
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      sha,
    }),
  });

  if (!put.ok) {
    const detail = (await put.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message || "Brifing repoya yazılamadı.");
  }

  const payload = (await put.json()) as { commit?: { html_url?: string } };
  return { written: true, commitUrl: payload.commit?.html_url ?? null };
}
