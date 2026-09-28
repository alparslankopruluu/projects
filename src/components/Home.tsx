"use client";

import Link from "next/link";
import { progressOf, waitingChecks } from "@/lib/checks";
import { useShelf } from "@/lib/store";
import { ATTENTION_LABEL } from "@/lib/types";
import { CheckLine, Meter } from "./Checks";
import { ChevronIcon, GearIcon, PlusIcon } from "./Icons";

export function Home({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const { projects, updateProject, move, mode, email } = useShelf();
  const allChecks = projects.flatMap((project) => project.checks);
  const overall = progressOf(allChecks);
  const waiting = projects.flatMap((project) =>
    waitingChecks(project).map((item) => ({ project, item })),
  );
  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  function toggle(projectId: string, checkId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    updateProject(projectId, {
      checks: project.checks.map((item) => (item.id === checkId ? { ...item, done: !item.done } : item)),
    });
  }

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <p className="kicker">{today}</p>
          <h1>Bugün</h1>
          <p className="needs">
            {waiting.length > 0 ? `${waiting.length} iş sende` : "Sende bekleyen iş yok"}
            {" · "}
            {mode === "firebase" ? email ?? "Firebase" : "Bu tarayıcı"}
          </p>
        </div>
        <div className="toolbar">
          <button className="icon-btn" type="button" onClick={onSettings} aria-label="Ayarlar">
            <GearIcon />
          </button>
          <button className="icon-btn" type="button" onClick={onAdd} aria-label="Proje ekle">
            <PlusIcon />
          </button>
        </div>
      </header>

      <section className="overall" aria-label="Genel ilerleme">
        <div className="overall-copy">
          <strong>İlerleme</strong>
          <span>
            {overall.done}/{overall.total} adım
          </span>
        </div>
        <Meter checks={allChecks} />
      </section>

      <section className="wait-panel">
        <h2>Sende bekleyen</h2>
        {waiting.length === 0 ? <p className="quiet">Hepsi ya bitti ya da Apple’da.</p> : null}
        <ul>
          {waiting.map(({ project, item }) => (
            <li key={`${project.id}-${item.id}`}>
              <CheckLine item={item} onToggle={() => toggle(project.id, item.id)} />
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="section-title">Projeler</h2>
        <div className="cards">
          {projects.map((project, index) => (
            <article className="project-card" key={project.id}>
              <div className="card-top">
                <Link href={`/projects/${project.id}`}>
                  <h3>{project.name}</h3>
                </Link>
                <span className={`capsule ${project.attention}`}>{ATTENTION_LABEL[project.attention]}</span>
              </div>
              <p className="card-reason">{project.reason}</p>
              <p className="card-platforms">
                {project.platforms.map((platform) => `${platform.os} ${platform.version}`).join(" · ")}
              </p>
              <Meter checks={project.checks} compact />
              <div className="card-checks">
                {project.checks.map((item) => (
                  <CheckLine key={item.id} item={item} onToggle={() => toggle(project.id, item.id)} />
                ))}
              </div>
              <div className="card-foot">
                <span className="nudge">
                  <button type="button" aria-label="Yukarı" disabled={index === 0} onClick={() => move(project.id, -1)}>
                    <ChevronIcon direction="up" />
                  </button>
                  <button
                    type="button"
                    aria-label="Aşağı"
                    disabled={index === projects.length - 1}
                    onClick={() => move(project.id, 1)}
                  >
                    <ChevronIcon direction="down" />
                  </button>
                </span>
                <Link href={`/projects/${project.id}`}>Detay</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
