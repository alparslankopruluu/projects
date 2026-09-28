"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  useEffect(() => {
    router.replace(`/apps/${id}`);
  }, [id, router]);
  return <main className="screen" />;
}
