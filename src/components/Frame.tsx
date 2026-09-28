"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useShelf } from "@/lib/store";
import { shortName } from "@/lib/ops";
import { AddDialog, SettingsDialog } from "./Dialogs";

const NAV = [
  { href: "/", label: "Bugün" },
  { href: "/apps", label: "Uygulamalar" },
  { href: "/releases", label: "Sürümler" },
  { href: "/metrics", label: "Metrikler" },
  { href: "/growth", label: "Büyüme" },
  { href: "/context", label: "Bağlam" },
  { href: "/integrations", label: "Bağlantılar" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects } = useShelf();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
        setQuery("");
      }
      if (event.key === "Escape") setPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo(() => {
    const pages = NAV.map((item) => ({ href: item.href, label: item.label, hint: "Ekran" }));
    const apps = projects.map((project) => ({
      href: `/apps/${project.id}`,
      label: shortName(project.name),
      hint: "Uygulama",
    }));
    const needle = query.trim().toLocaleLowerCase("tr");
    return [...pages, ...apps].filter((item) => !needle || item.label.toLocaleLowerCase("tr").includes(needle));
  }, [projects, query]);

  return (
    <div className="frame">
      <aside className="side-nav">
        <p className="mark">Projects</p>
        <nav>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={active(pathname, item.href) ? "active" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="side-actions">
          <button type="button" onClick={() => setPalette(true)}>
            Ara <kbd>⌘K</kbd>
          </button>
          <button type="button" onClick={() => setAddOpen(true)}>
            Uygulama ekle
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Ayarlar
          </button>
        </div>
      </aside>
      <div className="frame-main">{children}</div>
      <nav className="tabbar">
        <Link href="/" className={pathname === "/" ? "active" : undefined}>
          Bugün
        </Link>
        <Link href="/apps" className={active(pathname, "/apps") ? "active" : undefined}>
          Uygulamalar
        </Link>
        <Link href="/alerts" className={pathname === "/alerts" ? "active" : undefined}>
          Uyarılar
        </Link>
        <button type="button" className={more ? "active" : undefined} onClick={() => setMore((open) => !open)}>
          Diğer
        </button>
      </nav>
      {more ? (
        <div className="more-sheet">
          {NAV.slice(2).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMore(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
      {palette ? (
        <div className="backdrop" onMouseDown={() => setPalette(false)}>
          <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
            <input
              autoFocus
              placeholder="Uygulama veya ekran"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Komut ara"
            />
            <ul>
              {commands.slice(0, 10).map((item) => (
                <li key={item.href + item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      setPalette(false);
                      router.push(item.href);
                    }}
                  >
                    <span>{item.label}</span>
                    <small>{item.hint}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {addOpen ? <AddDialog onClose={() => setAddOpen(false)} /> : null}
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
