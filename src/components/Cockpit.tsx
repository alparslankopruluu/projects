"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { splitBrief } from "@/lib/brief";
import {
  BUSINESS_LABEL,
  growthLine,
  healthLine,
  inferBusiness,
  lanes,
  needsYou,
  productLine,
  shortName,
  stateLabel,
} from "@/lib/ops";
import { useShelf } from "@/lib/store";
import type { Note, Project } from "@/lib/types";

const TABS = [
  ["overview", "Genel"],
  ["releases", "Sürüm"],
  ["metrics", "Metrik"],
  ["growth", "Büyüme"],
  ["context", "Bağlam"],
  ["notes", "Not"],
] as const;

function BriefBlock({ markdown }: { markdown: string }) {
  const parts = splitBrief(markdown);
  return (
    <article className="brief">
      {parts.sections.map((section) => (
        <section key={section.name}>
          <h3>{section.name}</h3>
          {section.body.split("\n").map((line, index) =>
            line.trim() ? (
              <p key={`${section.name}-${index}`} className={line.startsWith("- ") ? "bullet" : undefined}>
                {line.replace(/^- /, "")}
              </p>
            ) : null,
          )}
        </section>
      ))}
    </article>
  );
}

export function Cockpit({ project }: { project: Project }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get("tab")) ? params.get("tab")! : "overview";
  const { updateProject, addNote, removeNote, removeProject, githubToken } = useShelf();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [writeToRepo, setWriteToRepo] = useState(true);
  const [briefDraft, setBriefDraft] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Note["visibility"]>("private");
  const [settings, setSettings] = useState(false);
  const next = needsYou(project)[0];
  const openWork = splitBrief(project.brief).sections.find((section) => section.name === "Açık işler")?.body;

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
      };
      if (!response.ok) throw new Error(data.error || "Sync başarısız.");
      if (data.changed && data.brief) {
        updateProject(project.id, {
          brief: data.brief,
          lastCommitSha: data.latestSha ?? project.lastCommitSha,
          briefUpdatedAt: new Date().toISOString(),
        });
      }
      setMessage(data.message ?? "Tamam.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync başarısız.");
    } finally {
      setSyncing(false);
    }
  }

  function setTab(id: string) {
    router.replace(`/apps/${project.id}?tab=${id}`);
  }

  return (
    <main className="screen cockpit">
      {syncing ? <div className="loadbar" aria-hidden="true" /> : null}
      <p className="kicker">
        <Link href="/apps">Uygulamalar</Link>
      </p>
      <header className="cockpit-head">
        <div>
          <h1>{shortName(project.name)}</h1>
          <p>{project.name}</p>
        </div>
        <button className="sync" type="button" disabled={!project.repo || syncing} onClick={() => void sync()}>
          {syncing ? "Okunuyor" : "Sync"}
        </button>
      </header>
      <p className="version-line">
        {lanes(project).map((lane) => (
          <span key={lane.os} className={`capsule ${lane.state}`}>
            {lane.os} {lane.version} {stateLabel(lane.state)}
          </span>
        ))}
        <span className="capsule">{BUSINESS_LABEL[inferBusiness(project)]}</span>
      </p>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "on" : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {message ? <p className="banner">{message}</p> : null}

      {tab === "overview" ? (
        <section className="next-action">
          <h2>Sıradaki</h2>
          <p>{next ? next.title : "Sende açık aksiyon yok. İnceleme veya metrik bekleniyor."}</p>
          <dl className="mini-facts">
            <div>
              <dt>Ürün</dt>
              <dd>{productLine(project)}</dd>
            </div>
            <div>
              <dt>Büyüme</dt>
              <dd>{growthLine(project)}</dd>
            </div>
            <div>
              <dt>Sağlık</dt>
              <dd>{healthLine()}</dd>
            </div>
          </dl>
          {openWork ? (
            <p className="quiet">{openWork.split("\n").slice(0, 3).join(" · ").replace(/- /g, "")}</p>
          ) : null}
        </section>
      ) : null}

      {tab === "releases" ? (
        <section className="card">
          {lanes(project).map((lane) => (
            <div className="row" key={lane.os}>
              <span>{lane.os}</span>
              <span>
                {lane.version} · {stateLabel(lane.state)} · {lane.detail}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "metrics" ? (
        <section className="empty-panel">
          <h2>Sinyal yok</h2>
          <p>Gelir, aktif kullanıcı, dönüşüm ve crash bu sekmeye bağlanınca düşer. Şu an kaynak bağlı değil, sayı uydurulmuyor.</p>
          <Link href="/integrations">Bağlantılar</Link>
        </section>
      ) : null}

      {tab === "growth" ? (
        <section className="empty-panel">
          <h2>{growthLine(project)}</h2>
          <p>
            {inferBusiness(project) === "saas"
              ? "Bu ürün SaaS. Lead, aktif işletme ve yenileme, indirme hunisinden ayrı durur."
              : "Bu ürün tüketici uygulaması. Edinim, paywall ve reklam aynı kutuya konmaz."}
          </p>
        </section>
      ) : null}

      {tab === "context" ? (
        <section className="card">
          <p className="banner">
            Resume {shortName(project.name)}. Follow AGENTS.md and continue from the current handoff.
          </p>
          <label className="check">
            <input type="checkbox" checked={writeToRepo} onChange={(event) => setWriteToRepo(event.target.checked)} />
            Sync, docs/project-brief.md dosyasını repoya yazar
          </label>
          {briefDraft !== null ? (
            <textarea className="brief-edit" value={briefDraft} onChange={(event) => setBriefDraft(event.target.value)} />
          ) : (
            <BriefBlock markdown={project.brief} />
          )}
          <div className="brief-tools">
            {briefDraft !== null ? (
              <button
                className="primary"
                type="button"
                onClick={() => {
                  updateProject(project.id, { brief: briefDraft });
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
              onClick={() => void navigator.clipboard.writeText(project.brief)}
            >
              Bağlamı kopyala
            </button>
          </div>
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="card">
          {project.notes.length === 0 ? <p className="banner">Henüz not yok.</p> : null}
          {project.notes.map((item) => (
            <div className="note" key={item.id}>
              <p>{item.body}</p>
              <small>
                {item.visibility === "shared" ? "ortak" : "özel"}
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
            <input aria-label="Not" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kısa not" />
            <div className="segmented">
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
      ) : null}

      <button className="text-btn settings-toggle" type="button" onClick={() => setSettings((open) => !open)}>
        {settings ? "Ayarları gizle" : "Proje ayarları"}
      </button>
      {settings ? (
        <section className="card">
          <div className="row">
            <span>Gerekçe</span>
            <input
              aria-label="Gerekçe"
              value={project.reason}
              onChange={(event) => updateProject(project.id, { reason: event.target.value })}
            />
          </div>
          <div className="row">
            <span>Repo</span>
            <input
              aria-label="Repo"
              value={project.repo}
              placeholder="owner/name"
              onChange={(event) => updateProject(project.id, { repo: event.target.value.trim() })}
            />
          </div>
          <div className="row">
            <span>Firebase</span>
            <span>{project.firebaseProject || "Bağlı değil"}</span>
          </div>
          <div className="brief-tools">
            <button
              className="ghost"
              type="button"
              onClick={() => {
                if (window.confirm(`${project.name} silinsin mi?`)) {
                  removeProject(project.id);
                  router.push("/apps");
                }
              }}
            >
              Sil
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
