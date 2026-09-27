"use client";

import { useParams } from "next/navigation";
import { Shelf } from "@/components/Shelf";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  return <Shelf selectedId={params.id} />;
}
