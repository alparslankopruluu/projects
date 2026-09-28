"use client";

import Link from "next/link";
import { needsYou, portfolioCounts, signals, waitingOn, type WorkItem } from "@/lib/ops";
import { useShelf } from "@/lib/store";

function WorkList({ items, empty }: { items: WorkItem[]; empty: string }) {
  if (items.length === 0) return <p className="quiet">{empty}</p>;
  return (
    <ul className="work-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href}>
            <strong>{item.projectName}</strong>
            <span>{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Today() {
  const { projects } = useShelf();
  const counts = portfolioCounts(projects);
  const yours = projects.flatMap(needsYou);
  const waiting = projects.flatMap(waitingOn);
  const feed = signals(projects);
  const focus = yours.slice(0, 2);
  const today = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(new Date());

  return (
    <main className="screen">
      <header className="screen-head">
        <p className="kicker">{today}</p>
        <h1>Bugün</h1>
        <p className="lead">
          {yours.length > 0 ? `${yours.length} şey senin aksiyonunu bekliyor.` : "Sende açık aksiyon yok."}
        </p>
        <p className="count-line">
          <span>{counts.you} sende</span>
          <span>{counts.review} incelemede</span>
          <span>{counts.live} yayında</span>
          <span>{counts.critical} kritik</span>
        </p>
      </header>

      <section>
        <h2>Odak</h2>
        {focus.length === 0 ? <p className="quiet">Şu an dokunman gereken bir iş yok.</p> : null}
        <div className="focus-grid">
          {focus.map((item, index) => (
            <Link className="focus-card" href={item.href} key={item.id}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{item.projectName}</strong>
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2>Sinyaller</h2>
        <ul className="signal-list">
          {feed.map((item) => (
            <li key={item.id} className={item.tone}>
              <Link href={item.href}>{item.title}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Sende</h2>
        <WorkList items={yours} empty="Açık aksiyon yok." />
      </section>

      <section>
        <h2>Bekleyen</h2>
        <WorkList items={waiting} empty="İncelemede uygulama yok." />
      </section>

      <p className="footnote">
        {projects.length} uygulama. Tam liste <Link href="/apps">Uygulamalar</Link> ekranında. Yayın sırası{" "}
        <Link href="/releases">Sürümler</Link>.
      </p>
    </main>
  );
}

export function Alerts() {
  const { projects } = useShelf();
  return (
    <main className="screen">
      <header className="screen-head">
        <h1>Uyarılar</h1>
        <p className="lead">Dokunman gerekenler ve dışarıda bekleyenler.</p>
      </header>
      <section>
        <h2>Sinyaller</h2>
        <ul className="signal-list">
          {signals(projects).map((item) => (
            <li key={item.id} className={item.tone}>
              <Link href={item.href}>{item.title}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Sende</h2>
        <WorkList items={projects.flatMap(needsYou)} empty="Açık aksiyon yok." />
      </section>
      <section>
        <h2>Bekleyen</h2>
        <WorkList items={projects.flatMap(waitingOn)} empty="İncelemede uygulama yok." />
      </section>
    </main>
  );
}


