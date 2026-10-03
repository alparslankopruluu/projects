// Supabase adapter. connection.ref = Supabase project ref (the subdomain in <ref>.supabase.co).
// Credential: credentials.supabase.accessToken (personal access token from supabase.com/dashboard/account/tokens).
import { emptyResult, type SourceAdapter } from "../types.js";
import { fetchJson } from "../util.js";

type ServiceHealth = { name: string; healthy: boolean; status: string; error?: string };

const SERVICES = ["db", "auth", "rest"];

export const syncSupabase: SourceAdapter = async ({ project, connection, credentials }) => {
  const token = credentials.supabase?.accessToken;
  if (!token) throw new Error("Supabase access token kayıtlı değil");
  const ref = connection.ref.trim();
  if (!/^[a-z0-9]+$/.test(ref)) throw new Error(`geçersiz Supabase project ref "${connection.ref}"`);

  // `services` is an array query param (services=db&services=auth&services=rest).
  const qs = SERVICES.map((s) => `services=${s}`).join("&");
  const health = await fetchJson<ServiceHealth[]>(`https://api.supabase.com/v1/projects/${ref}/health?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    label: "Supabase",
  });

  const result = emptyResult();
  for (const h of health) {
    if (h.healthy) continue;
    result.signals.push({
      projectId: project.id,
      source: "supabase",
      severity: "warning",
      title: `${project.name}: Supabase ${h.name} sağlıksız`,
      body: [h.status, h.error].filter(Boolean).join(" · ") || "Servis sağlıklı yanıt vermedi.",
      dedupeKey: `supabase:${ref}:${h.name}:unhealthy`,
    });
  }
  return result;
};
