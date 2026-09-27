"use client";

import { useState } from "react";
import { AddDialog, SettingsDialog } from "./Dialogs";
import { ProjectDetail } from "./ProjectDetail";
import { ProjectList } from "./ProjectList";
import { useShelf } from "@/lib/store";

export function Shelf({ selectedId }: { selectedId?: string }) {
  const { projects } = useShelf();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selected = projects.find((project) => project.id === selectedId);

  return (
    <div className="app">
      <div className={selectedId ? "desktop-only" : undefined}>
        <ProjectList activeId={selectedId} onAdd={() => setAddOpen(true)} onSettings={() => setSettingsOpen(true)} />
      </div>
      {selected ? (
        <ProjectDetail key={selected.id} project={selected} />
      ) : (
        <main className={selectedId ? "main" : "main desktop-only"}>
          <div className="empty">
            <h2>{selectedId ? "Bu proje yok" : "Bir satır seç"}</h2>
            <p>
              {selectedId
                ? "Silinmiş ya da hiç eklenmemiş."
                : "Sıra, bugün dokunman gereken işe göre. Sürükle ya da oklarla değiştir."}
            </p>
          </div>
        </main>
      )}
      {addOpen ? <AddDialog onClose={() => setAddOpen(false)} /> : null}
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
