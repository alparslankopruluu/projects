export type BriefCommit = {
  sha: string;
  date: string;
  message: string;
};

const SECTION_ORDER = [
  "Şimdi",
  "Açık işler",
  "Son değişiklikler",
  "Denenenler",
  "Tekrarlama",
] as const;

type SectionName = (typeof SECTION_ORDER)[number] | string;

export type BriefParts = {
  title: string;
  preamble: string;
  sections: { name: SectionName; body: string }[];
};

const HEADING = /^##\s+(.+?)\s*$/;

export function splitBrief(markdown: string): BriefParts {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  const preamble: string[] = [];
  const sections: BriefParts["sections"] = [];
  let current: { name: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    const match = line.match(HEADING);
    if (match) {
      if (current) {
        sections.push({ name: current.name, body: current.lines.join("\n").trim() });
      }
      current = { name: match[1], lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else preamble.push(line);
  }

  if (current) {
    sections.push({ name: current.name, body: current.lines.join("\n").trim() });
  }

  return { title, preamble: preamble.join("\n").trim(), sections };
}

export function joinBrief(parts: BriefParts): string {
  const blocks = [`# ${parts.title || "Proje"}`, "", parts.preamble.trim(), ""];
  for (const section of parts.sections) {
    blocks.push(`## ${section.name}`, "", section.body.trim(), "");
  }
  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function upsertSection(parts: BriefParts, name: string, body: string) {
  const found = parts.sections.find((section) => section.name === name);
  if (found) found.body = body.trim();
  else parts.sections.push({ name, body: body.trim() });
}

function orderSections(parts: BriefParts) {
  const known = new Set<string>(SECTION_ORDER);
  const ordered = SECTION_ORDER.map((name) =>
    parts.sections.find((section) => section.name === name),
  ).filter((section): section is BriefParts["sections"][number] => Boolean(section));
  const extra = parts.sections.filter((section) => !known.has(section.name));
  parts.sections = [...ordered, ...extra];
}

export function createBrief(input: {
  name: string;
  reason: string;
  platforms: { os: string; version: string; status: string }[];
  repo: string;
  stack: string;
  open: string[];
}): string {
  const platformLines =
    input.platforms.length > 0
      ? input.platforms
          .map((platform) => `- ${platform.os} ${platform.version} — ${platform.status}`)
          .join("\n")
      : "- Platform girilmedi.";
  const openLines =
    input.open.length > 0 ? input.open.map((item) => `- ${item}`).join("\n") : "- Kayıt yok.";

  return joinBrief({
    title: input.name,
    preamble: [
      "Bu dosya insanlar ve ajanlar içindir. Yeni bir oturumda önce bunu oku. Burada yazmayanı uzun uzun yeniden çıkarma.",
      "",
      "Güncellendi: henüz sync edilmedi",
    ].join("\n"),
    sections: [
      {
        name: "Şimdi",
        body: [
          input.reason,
          platformLines,
          input.repo ? `- Repo: ${input.repo}` : "- Repo bağlanmadı.",
          input.stack ? `- Yığın: ${input.stack}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      { name: "Açık işler", body: openLines },
      { name: "Son değişiklikler", body: "- Henüz commit okunmadı." },
      { name: "Denenenler", body: "- Kayıt yok." },
      { name: "Tekrarlama", body: "- Kayıt yok." },
    ],
  });
}

function firstLine(message: string) {
  const line = message.split("\n").map((part) => part.trim()).find(Boolean) ?? "(mesaj yok)";
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date);
}

export function applyCommits(brief: string, commits: BriefCommit[], updatedAt = new Date().toISOString()): {
  brief: string;
  latestSha: string | null;
  changed: boolean;
} {
  if (commits.length === 0) {
    return { brief, latestSha: null, changed: false };
  }

  const latest = commits[0];
  const parts = splitBrief(brief);
  if (!parts.title) parts.title = "Proje";

  const stamp = `Güncellendi: ${updatedAt.slice(0, 10)} · ${latest.sha.slice(0, 7)}`;
  if (/^Güncellendi:/m.test(parts.preamble)) {
    parts.preamble = parts.preamble.replace(/^Güncellendi:.*$/m, stamp);
  } else {
    parts.preamble = [parts.preamble, stamp].filter(Boolean).join("\n\n");
  }

  const bullets = commits.slice(0, 12).map((commit) => {
    return `- ${dayLabel(commit.date)} — ${firstLine(commit.message)} (${commit.sha.slice(0, 7)})`;
  });
  upsertSection(parts, "Son değişiklikler", bullets.join("\n"));
  orderSections(parts);

  const next = joinBrief(parts);
  return { brief: next, latestSha: latest.sha, changed: next !== brief };
}
