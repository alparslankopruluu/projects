"use client";

import Link from "next/link";
import { lanes, needsYou, shortName, stateLabel } from "@/lib/ops";
import { useShelf } from "@/lib/store";

export function ReleasesBoard() {
  const { projects } = useShelf();
  const blocked = projects.filter((project) => project.attention === "prepare");
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Sürümler</h1>
        <p className="lead">iOS, Android ve web aynı satırda. Durum mağaza kaydından gelir, kutudan değil.</p>
      </header>
      <div className="matrix">
        <div className="matrix-row head">
          <span>Uygulama</span>
          <span>iOS</span>
          <span>Android</span>
          <span>Web</span>
        </div>
        {projects.map((project) => {
          const row = lanes(project);
          return (
            <Link className="matrix-row" href={`/apps/${project.id}`} key={project.id}>
              <strong>{shortName(project.name)}</strong>
              {row.map((lane) => (
                <span key={lane.os} className={`lane ${lane.state}`}>
                  {lane.version} · {stateLabel(lane.state)}
                </span>
              ))}
            </Link>
          );
        })}
      </div>
      {blocked.length > 0 ? (
        <section>
          <h2>Gönderimden önce</h2>
          <ul className="work-list">
            {blocked.flatMap(needsYou).map((item) => (
              <li key={item.id}>
                <Link href={item.href}>
                  <strong>{item.projectName}</strong>
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
