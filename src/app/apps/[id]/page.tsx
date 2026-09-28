"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Cockpit } from "@/components/Cockpit";
import { useShelf } from "@/lib/store";

function AppScreen({ id }: { id: string }) {
  const { projects } = useShelf();
  const project = projects.find((item) => item.id === id);
  if (!project) {
    return (
      <main className="screen">
        <h1>Bu uygulama yok</h1>
      </main>
    );
  }
  return <Cockpit key={project.id} project={project} />;
}

export default function AppPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Suspense fallback={<main className="screen" />}>
      <AppScreen id={id} />
    </Suspense>
  );
}
