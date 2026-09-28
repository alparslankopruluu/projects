"use client";

import Link from "next/link";
import { BUSINESS_LABEL, growthLine, healthLine, inferBusiness, lanes, productLine, shortName, stateLabel } from "@/lib/ops";
import { useShelf } from "@/lib/store";

export function AppsBoard() {
  const { projects } = useShelf();
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Uygulamalar</h1>
        <p className="lead">Her ürün dört alanda. Sürüm, ürün, büyüme, sağlık.</p>
      </header>
      <div className="domain-list">
        {projects.map((project) => {
          const release = lanes(project).filter((lane) => lane.state !== "missing" || lane.os === "ios");
          return (
            <Link className="domain-card" href={`/apps/${project.id}`} key={project.id}>
              <div className="domain-title">
                <h2>{shortName(project.name)}</h2>
                <span>{BUSINESS_LABEL[inferBusiness(project)]}</span>
              </div>
              <p>{project.name}</p>
              <dl>
                <div>
                  <dt>Sürüm</dt>
                  <dd>
                    {release.map((lane) => (
                      <span key={lane.os}>
                        {lane.os} {lane.version} {stateLabel(lane.state)}
                      </span>
                    ))}
                  </dd>
                </div>
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
            </Link>
          );
        })}
      </div>
    </main>
  );
}
