"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronIcon, GearIcon, GripIcon, PlusIcon } from "./Icons";
import { useShelf } from "@/lib/store";

export function ProjectList({
  activeId,
  onAdd,
  onSettings,
}: {
  activeId?: string;
  onAdd: () => void;
  onSettings: () => void;
}) {
  const { projects, reorder, move, mode, email } = useShelf();
  const [dragId, setDragId] = useState<string | null>(null);
  const needsYou = projects.filter(
    (project) => project.attention === "review_message" || project.attention === "prepare",
  ).length;
  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <aside className="sidebar">
      <div className="brand">
        <div>
          <p className="kicker">{today}</p>
          <h1>Bugün</h1>
          <p className="needs">
            {needsYou > 0 ? `${needsYou} uygulama sende bekliyor` : "İnceleme ve yayındakiler sırada"}
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
      </div>
      <div className="list">
        {projects.map((project, index) => (
          <div
            key={project.id}
            className={project.id === activeId ? "item active" : "item"}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragId) reorder(dragId, project.id);
              setDragId(null);
            }}
          >
            <button
              className="grip"
              type="button"
              draggable
              aria-label={`${project.name} sırasını taşı`}
              onDragStart={() => setDragId(project.id)}
              onDragEnd={() => setDragId(null)}
            >
              <GripIcon />
            </button>
            <Link href={`/projects/${project.id}`} className="item-copy" style={{ display: "contents" }}>
              <span className={`dot ${project.attention}`} />
              <span className="item-copy">
                <span className="item-name">{project.name}</span>
                <span className="item-reason">{project.reason}</span>
              </span>
            </Link>
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
          </div>
        ))}
      </div>
      <div className="side-foot">
        <span>{mode === "firebase" ? email ?? "Firebase" : "Bu tarayıcı · Firebase bağlı değil"}</span>
      </div>
    </aside>
  );
}
