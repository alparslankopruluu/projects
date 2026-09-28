"use client";

import { useState } from "react";
import { AddDialog, SettingsDialog } from "./Dialogs";
import { Home } from "./Home";
import { ProjectDetail } from "./ProjectDetail";
import { useShelf } from "@/lib/store";

export function Shelf({ selectedId }: { selectedId?: string }) {
  const { projects } = useShelf();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selected = projects.find((project) => project.id === selectedId);

  return (
    <div className={selected ? "detail-wrap" : undefined}>
      {selected ? (
        <ProjectDetail key={selected.id} project={selected} />
      ) : selectedId ? (
        <main className="home">
          <div className="empty">
            <h2>Bu proje yok</h2>
            <p>Silinmiş ya da hiç eklenmemiş.</p>
          </div>
        </main>
      ) : (
        <Home onAdd={() => setAddOpen(true)} onSettings={() => setSettingsOpen(true)} />
      )}
      {addOpen ? <AddDialog onClose={() => setAddOpen(false)} /> : null}
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
