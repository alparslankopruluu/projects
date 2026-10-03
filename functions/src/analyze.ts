import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { col, db } from "./admin.js";
import type { Commit, Insight, Metric, Note, Project, Signal, StoreEvent } from "./model.js";
import { upsertSignals } from "./signals.js";
import { loadProjects } from "./sync.js";
import type { SignalDraft } from "./types.js";
import { hashId } from "./util.js";

export const CLAUDE_MODEL = "claude-opus-5-5";

// Item limits are stated in descriptions and enforced by slicing after parse, rather than with .max():
// structured outputs do not enforce maxItems, and a 4th item must not turn a good analysis into a parse error.
const projectId = z.string().nullable().describe("Projenin id alanı; genel bir konuysa null");

export const InsightSchema = z.object({
  headline: z.string().describe("Bugünün tek cümlelik özeti"),
  focus: z
    .array(z.object({ projectId, action: z.string(), why: z.string() }))
    .describe("Bugün odaklanılacak en fazla 3 iş, önem sırasıyla"),
  risks: z.array(z.object({ projectId, title: z.string(), detail: z.string() })).describe("En fazla 5 risk"),
  signals: z
    .array(
      z.object({
        projectId,
        severity: z.enum(["critical", "warning", "info", "success"]),
        title: z.string(),
        body: z.string(),
      }),
    )
    .describe("Gelen kutusuna eklenecek en fazla 5 yeni sinyal; mevcut okunmamış sinyalleri tekrarlama"),
  notes: z
    .array(z.object({ projectId: z.string(), body: z.string() }))
    .describe("Proje notlarına eklenecek en fazla 5 kısa not; gerçekten faydalıysa yaz, yoksa boş bırak"),
});
export type InsightOutput = z.infer<typeof InsightSchema>;

const SYSTEM_PROMPT = `Sen, birçok mobil ve web uygulamasını aynı anda yürüten küçük bir bağımsız uygulama stüdyosunun operasyon analistisin. Stüdyo sahibiyle Türkçe konuşursun ve bütün çıktını Türkçe yazarsın.

Sana kullanıcı mesajında stüdyonun çalışma alanının JSON dökümü verilecek: projeler (aşama, öncelik, sıradaki adım, platformlar, bağlı kaynaklar, kontrol listesi, notlar), okunmamış sinyaller, son metrikler, son mağaza/deploy olayları ve son commit'ler.

Görevin: bugün neye odaklanılması gerektiğini, hangi risklerin büyüdüğünü ve gelen kutusuna hangi yeni uyarıların eklenmesi gerektiğini net ve kısa biçimde söylemek.

Öncelik sırası (yukarıdaki her zaman aşağıdakinden önce gelir):
1. Mağaza inceleme mesajları ve retleri (App Store / Google Play reddi, incelemede bekleyen sorular, geliştirici işlemi gereken sürümler).
2. Bozuk deploy'lar ve üretimdeki arızalar (başarısız Vercel deploy'u, sağlıksız backend servisleri).
3. Yarım kalmış ve uzun süredir hareketsiz projeler (fikir/yapılıyor aşamasında, commit veya olay yok).
4. Büyüme işleri (mağaza sayfası, fiyatlandırma, pazarlama, metrik iyileştirme).

Kurallar:
- Asla sayı uydurma. Yalnızca verideki metrikleri, tarihleri ve sayıları kullan. Bir metrik yoksa ya da kaynak bağlı değilse bunu açıkça "bağlı değil" / "veri yok" diye söyle; tahmin yürütme.
- projectId alanlarında yalnızca verideki proje id'lerini kullan; genel bir konuysa null ver.
- Zaten okunmamış olarak duran bir sinyali yeni sinyal olarak tekrar etme.
- Eylemler somut ve bugün yapılabilir olsun ("X'in reddedilme nedenini Resolution Center'da oku ve 2.1 maddesine yanıt yaz" gibi).
- Kısa yaz: başlık tek cümle, her madde en fazla iki cümle.`;

type Workspace = {
  now: string;
  projects: unknown[];
  unreadSignals: unknown[];
  latestMetrics: unknown[];
  recentEvents: unknown[];
  recentCommits: unknown[];
};

async function loadWorkspace(uid: string, now: Date): Promise<{ projects: Project[]; workspace: Workspace }> {
  const [projects, signalsSnap, metricsSnap, eventsSnap, commitsSnap] = await Promise.all([
    loadProjects(uid),
    col(uid, "signals").where("read", "==", false).limit(100).get(),
    col(uid, "metrics").orderBy("recordedAt", "desc").limit(300).get(),
    col(uid, "events").orderBy("at", "desc").limit(40).get(),
    col(uid, "commits").orderBy("at", "desc").limit(30).get(),
  ]);

  // Latest value per project + metric key.
  const latest = new Map<string, Metric>();
  for (const d of metricsSnap.docs) {
    const m = d.data() as Metric;
    const k = `${m.projectId}:${m.key}:${m.period}`;
    if (!latest.has(k)) latest.set(k, m);
  }

  const workspace: Workspace = {
    now: now.toISOString(),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      stage: p.stage,
      priority: p.priority,
      nextStep: p.nextStep,
      platforms: p.platforms,
      connections: (p.connections ?? []).map((c) => ({ kind: c.kind, mode: c.mode, lastSyncAt: c.lastSyncAt })),
      openChecks: (p.checks ?? []).filter((c) => !c.done).map((c) => ({ label: c.label, owner: c.owner })),
      doneChecks: (p.checks ?? []).filter((c) => c.done).length,
      notes: (p.notes ?? []).slice(-10).map((n) => ({ author: n.author, createdAt: n.createdAt, body: n.body })),
      startedAt: p.startedAt,
      lastActivityAt: p.lastActivityAt,
    })),
    unreadSignals: signalsSnap.docs.map((d) => {
      const s = d.data() as Signal;
      return { projectId: s.projectId, source: s.source, severity: s.severity, title: s.title, body: s.body, createdAt: s.createdAt };
    }),
    latestMetrics: [...latest.values()].map((m) => ({
      projectId: m.projectId,
      key: m.key,
      value: m.value,
      previous: m.previous,
      period: m.period,
      source: m.source,
      recordedAt: m.recordedAt,
    })),
    recentEvents: eventsSnap.docs.map((d) => {
      const e = d.data() as StoreEvent;
      return { projectId: e.projectId, source: e.source, kind: e.kind, version: e.version, detail: e.detail, at: e.at };
    }),
    recentCommits: commitsSnap.docs.map((d) => {
      const c = d.data() as Commit;
      return { projectId: c.projectId, repo: c.repo, message: c.message, at: c.at };
    }),
  };
  return { projects, workspace };
}

async function callClaude(apiKey: string, workspace: Workspace): Promise<InsightOutput> {
  const client = new Anthropic({ apiKey });
  try {
    // Beta namespace for server-side fallbacks: on a policy decline the API reroutes by refusal category.
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Çalışma alanının güncel dökümü (JSON):\n\n${JSON.stringify(workspace)}`,
        },
      ],
      output_config: { effort: "medium", format: betaZodOutputFormat(InsightSchema) },
    });

    if (response.stop_reason === "refusal") {
      throw new HttpsError("failed-precondition", "Claude bu analizi yapmayı reddetti.");
    }
    if (response.stop_reason === "max_tokens") {
      logger.warn("Claude hit max_tokens", { usage: response.usage });
    }
    const parsed = response.parsed_output;
    if (!parsed) throw new HttpsError("internal", "Claude yapılandırılmış bir yanıt döndürmedi.");
    logger.info("Claude usage", { usage: response.usage });
    return parsed;
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpsError("resource-exhausted", "Claude şu an yoğun, biraz sonra tekrar dene.");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      logger.error("Anthropic authentication failed; check ANTHROPIC_API_KEY secret");
      throw new HttpsError("failed-precondition", "Sunucudaki Claude anahtarı geçersiz.");
    }
    if (err instanceof Anthropic.APIError) {
      logger.error("Anthropic API error", { status: err.status, message: err.message });
      const code = err.status !== undefined && err.status >= 500 ? "unavailable" : "internal";
      throw new HttpsError(code, `Claude isteği başarısız (${err.status ?? "bağlantı"}).`);
    }
    logger.error("Claude call failed", { error: String(err) });
    throw new HttpsError("internal", "Claude yanıtı işlenemedi.");
  }
}

/** Shared by the `analyze` callable and `dailyDigest`. Throws HttpsError. */
export async function runAnalysis(uid: string, apiKey: string, now = new Date()): Promise<Insight> {
  const { projects, workspace } = await loadWorkspace(uid, now);
  const out = await callClaude(apiKey, workspace);

  const ids = new Set(projects.map((p) => p.id));
  const known = (id: string | null) => (id && ids.has(id) ? id : null);

  const insight: Insight = {
    generatedAt: now.toISOString(),
    model: CLAUDE_MODEL,
    headline: out.headline,
    focus: out.focus.slice(0, 3).map((f) => ({ ...f, projectId: known(f.projectId) })),
    risks: out.risks.slice(0, 5).map((r) => ({ ...r, projectId: known(r.projectId) })),
  };

  const drafts: SignalDraft[] = out.signals.slice(0, 5).map((s) => {
    const pid = known(s.projectId);
    return {
      projectId: pid,
      source: "claude",
      severity: s.severity,
      title: s.title,
      body: s.body,
      dedupeKey: `claude:${pid ?? "all"}:${hashId(s.title.trim().toLocaleLowerCase("tr"))}`,
    };
  });

  const batch = db.batch();
  batch.set(col(uid, "insights").doc("latest"), insight);
  for (const n of out.notes.slice(0, 5)) {
    if (!ids.has(n.projectId) || !n.body.trim()) continue;
    const note: Note = { id: randomUUID(), body: n.body.trim(), createdAt: now.toISOString(), author: "claude" };
    batch.update(col(uid, "projects").doc(n.projectId), { notes: FieldValue.arrayUnion(note) });
  }
  await batch.commit();
  await upsertSignals(uid, drafts, now);
  return insight;
}
