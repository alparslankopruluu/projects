"use client";

import Link from "next/link";
import { useState } from "react";
import { splitBrief } from "@/lib/brief";
import { BUSINESS_LABEL, growthLine, inferBusiness, shortName } from "@/lib/ops";
import { useShelf } from "@/lib/store";

export function MetricsBoard() {
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Metrikler</h1>
        <p className="lead">Burada grafik arşivi değil, değişen sinyal duracak.</p>
      </header>
      <section className="empty-panel">
        <h2>Henüz bağlı değil</h2>
        <p>RevenueCat, Firebase ve mağaza raporları gelince satır şöyle olur: gelir, deneme, dönüşüm, crash-free. Yön ve fark. Ham event listesi değil.</p>
        <Link href="/integrations">Bağlantılara git</Link>
      </section>
    </main>
  );
}

export function GrowthBoard() {
  const { projects } = useShelf();
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Büyüme</h1>
        <p className="lead">Abonelik uygulaması ile salon yazılımı aynı panoyu kullanmaz.</p>
      </header>
      <div className="domain-list">
        {projects.map((project) => (
          <article className="domain-card" key={project.id}>
            <div className="domain-title">
              <h2>{shortName(project.name)}</h2>
              <span>{BUSINESS_LABEL[inferBusiness(project)]}</span>
            </div>
            <p>{growthLine(project)}</p>
            <p className="quiet">
              {inferBusiness(project) === "saas"
                ? "İzlenecekler: lead, aktif işletme, rezervasyon, yenileme."
                : "İzlenecekler: edinim, paywall, deneme, elde tutma, ASO."}
            </p>
            <Link href={`/apps/${project.id}`}>Cockpit</Link>
          </article>
        ))}
      </div>
    </main>
  );
}

export function ContextBoard() {
  const { projects } = useShelf();
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Bağlam</h1>
        <p className="lead">Yeni oturum önce kısa brifingi okur. Uzun tarama yapmaz.</p>
      </header>
      <ul className="work-list">
        {projects.map((project) => {
          const parts = splitBrief(project.brief || "");
          const open = parts.sections.find((section) => section.name === "Açık işler")?.body.split("\n")[0];
          return (
            <li key={project.id}>
              <Link href={`/apps/${project.id}?tab=context`}>
                <strong>{shortName(project.name)}</strong>
                <span>{open?.replace(/^- /, "") || "Brifing boş"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function IntegrationsBoard() {
  const { mode, email } = useShelf();
  const [copied, setCopied] = useState(false);
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Bağlantılar</h1>
        <p className="lead">Kimlik bilgisi tarayıcıda kalıcı ürün sırrı olmamalı. Şimdilik kişisel token, sıradaki adım GitHub App.</p>
      </header>
      <section className="domain-list">
        <article className="domain-card">
          <h2>GitHub</h2>
          <p>Sync son commitleri okur. “Update project brief” commitini yok sayar.</p>
          <p className="quiet">Kurulum: makinede GITHUB_TOKEN ya da Ayarlar’daki token.</p>
        </article>
        <article className="domain-card">
          <h2>Firebase</h2>
          <p>{mode === "firebase" ? `Bağlı · ${email ?? "oturum açık"}` : "Bu tarayıcı. Proje kotası dolduğu için yeni proje açılmadı."}</p>
        </article>
        <article className="domain-card">
          <h2>App Store, Play, RevenueCat</h2>
          <p>Durum elle duruyor. API bağlanınca sürüm ve gelir buraya sinyal olarak düşer.</p>
        </article>
        <article className="domain-card">
          <h2>Ajan</h2>
          <p>Ortak komut tek satır. Araç AGENTS.md ve docs/ai dosyalarını okur.</p>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText("Resume Projects. Follow AGENTS.md and continue from the current handoff.");
              setCopied(true);
            }}
          >
            {copied ? "Kopyalandı" : "Komutu kopyala"}
          </button>
        </article>
      </section>
    </main>
  );
}
