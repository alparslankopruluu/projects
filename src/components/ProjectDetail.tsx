"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { splitBrief } from "@/lib/brief";
import { useShelf } from "@/lib/store";
import { ATTENTION_LABEL, type Note, type Project } from "@/lib/types";
import { CheckLine, Meter } from "./Checks";

function BriefView({ markdown }: { markdown: string }) {
  const parts = splitBrief(markdown);
  return (
    <article className="brief">
      {parts.sections.map((section) => (
        <section key={section.name}>
          <h3>{section.name}</h3>
          {section.body.split("\n").map((line, index) =>
            line.startsWith("- ") ? (
              <p className="bullet" key={`${section.name}-${index}`}>
                {line.slice(2)}
              </p>
            ) : line.trim() ? (
              <p key={`${section.name}-${index}`}>{line}</p>
            ) : null,
          )}
        </section>
      ))}
    </article>
  );
}

export function ProjectDetail({ project }: { project: Project }) {
  const router = useRouter();
  const { updateProject, addNote, removeNote, removeProject, githubToken } = useShelf();
  const [briefDraft, setBriefDraft] = useState<string | null>(null);
  const [writeToRepo, setWriteToRepo] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Note["visibility"]>("private");

  const editing = briefDraft !== null;

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: project.repo,
          token: githubToken,
          brief: briefDraft ?? project.brief,
          writeToRepo,
          lastCommitSha: project.lastCommitSha,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        brief?: string;
        latestSha?: string | null;
        changed?: boolean;
        message?: string;
        commitUrl?: string | null;
      };
      if (!response.ok) throw new Error(data.error || "Sync başarısız.");
      if (data.changed && data.brief) {
        updateProject(project.id, {
          brief: data.brief,
          lastCommitSha: data.latestSha ?? project.lastCommitSha,
          briefUpdatedAt: new Date().toISOString(),
        });
      }
      setMessage(data.commitUrl ? `${data.message} ${data.commitUrl}` : data.message ?? "Tamam.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync başarısız.");
    } finally {
      setSyncing(false);
    }
  }

  function toggle(checkId: string) {
    updateProject(project.id, {
      checks: project.checks.map((item) => (item.id === checkId ? { ...item, done: !item.done } : item)),
    });
  }

  return (
    <main className="main">
      {syncing ? <div className="loadbar" aria-hidden="true" /> : null}
      <div className="detail-top">
        <Link className="back" href="/">
          Bugün
        </Link>
        <button className="sync" type="button" disabled={!project.repo || syncing} onClick={() => void sync()}>
          {syncing ? "Okunuyor" : "Sync"}
        </button>
      </div>
      <article className="detail">
        <h2>{project.name}</h2>
        <div className="meta-row">
          <span className={`capsule ${project.attention}`}>{ATTENTION_LABEL[project.attention]}</span>
          {project.platforms.map((platform) => (
            <span className="capsule" key={`${platform.os}-${platform.version}`}>
              {platform.os} {platform.version}
            </span>
          ))}
        </div>
        <textarea
          className="reason"
          rows={2}
          aria-label="Neden sırada"
          value={project.reason}
          onChange={(event) => updateProject(project.id, { reason: event.target.value })}
        />
        <div className="stack">
          <section className="card">
            <h3 className="card-label">Adımlar</h3>
            <div className="step-pad">
              <Meter checks={project.checks} />
              {project.checks.map((item) => (
                <CheckLine key={item.id} item={item} onToggle={() => toggle(item.id)} />
              ))}
            </div>
          </section>
          <section className="card">
            <h3 className="card-label">Durum</h3>
            {project.platforms.map((platform, index) => (
              <div className="row" key={`${platform.os}-${index}`}>
                <span>{platform.os}</span>
                <span>
                  {platform.version} · {platform.status}
                </span>
              </div>
            ))}
            <div className="row">
              <span>Repo</span>
              <input
                aria-label="GitHub reposu"
                placeholder="owner/name"
                value={project.repo}
                onChange={(event) => updateProject(project.id, { repo: event.target.value.trim() })}
              />
            </div>
            <div className="row">
              <span>Firebase</span>
              <span>{project.firebaseProject || "Bağlanmadı"}</span>
            </div>
            <div className="row">
              <span>Yığın</span>
              <span>{project.stack || "—"}</span>
            </div>
            {project.links.map((link) => (
              <div className="row" key={link.url}>
                <span>{link.label}</span>
                <a href={link.url} target="_blank" rel="noreferrer">
                  Aç
                </a>
              </div>
            ))}
          </section>

          <section className="card">
            <h3 className="card-label">Notlar</h3>
            {project.notes.length === 0 ? <div className="banner">Henüz not yok.</div> : null}
            {project.notes.map((item) => (
              <div className="note" key={item.id}>
                <p>{item.body}</p>
                <small>
                  {new Intl.DateTimeFormat("tr-TR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(item.createdAt))}
                  {" · "}
                  {item.visibility === "shared" ? "paylaşılacak" : "sana özel"}
                  <button type="button" onClick={() => removeNote(project.id, item.id)}>
                    Sil
                  </button>
                </small>
              </div>
            ))}
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                addNote(project.id, note, visibility);
                setNote("");
              }}
            >
              <input
                aria-label="Not"
                placeholder="Kısa bir not"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="segmented" role="group" aria-label="Not görünürlüğü">
                <button type="button" className={visibility === "private" ? "on" : ""} onClick={() => setVisibility("private")}>
                  Özel
                </button>
                <button type="button" className={visibility === "shared" ? "on" : ""} onClick={() => setVisibility("shared")}>
                  Ortak
                </button>
              </div>
              <button className="primary" type="submit">
                Ekle
              </button>
            </form>
          </section>

          <section className="card">
            <h3 className="card-label">Brifing</h3>
            <p className="banner">
              Sync son commitleri okur ve Son değişiklikler bölümünü yeniler. Diğer bölümler durur.
              {project.briefUpdatedAt
                ? ` Son: ${project.briefUpdatedAt.slice(0, 16).replace("T", " ")}.`
                : ""}
            </p>
            {message ? <p className="banner">{message}</p> : null}
            <label className="check">
              <input type="checkbox" checked={writeToRepo} onChange={(event) => setWriteToRepo(event.target.checked)} />
              docs/project-brief.md dosyasını repoya yaz
            </label>
            {editing ? (
              <textarea
                className="brief-edit"
                value={briefDraft ?? ""}
                onChange={(event) => setBriefDraft(event.target.value)}
              />
            ) : (
              <BriefView markdown={project.brief} />
            )}
            <div className="brief-tools">
              {editing ? (
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    updateProject(project.id, { brief: briefDraft ?? project.brief });
                    setBriefDraft(null);
                  }}
                >
                  Kaydet
                </button>
              ) : (
                <button className="ghost" type="button" onClick={() => setBriefDraft(project.brief)}>
                  Düzenle
                </button>
              )}
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  if (window.confirm(`${project.name} listeden silinsin mi?`)) {
                    removeProject(project.id);
                    router.push("/");
                  }
                }}
              >
                Projeyi sil
              </button>
            </div>
          </section>

          <section className="card">
            <h3 className="card-label">Üyeler</h3>
            {project.members.map((member) => (
              <div className="row" key={`${member.email}-${member.role}`}>
                <span>{member.email}</span>
                <span>{member.role === "owner" ? "sahip" : member.role}</span>
              </div>
            ))}
            <p className="banner">Davet sonraki sürümde. Ortak işaretli notlar o zaman görünür.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
