import React from "react";
import { Easing, interpolate } from "remotion";
import { C, FONT, RADIUS, cardShadow, hueInk, softCard } from "../theme";
import { clamp, enter, float, mix, rand } from "../anim";

type Item =
  | { kind: "app"; name: string; hue: number; x: number; y: number; badge: number }
  | { kind: "note"; title: string; sub: string; tone: string; x: number; y: number }
  | { kind: "tab"; label: string; x: number; y: number };

const ITEMS: Item[] = [
  { kind: "app", name: "Chordly", hue: 254, x: 170, y: 230, badge: 3 },
  { kind: "tab", label: "GitHub · 14 issue", x: 560, y: 150 },
  { kind: "app", name: "Loopa", hue: 155, x: 930, y: 300, badge: 7 },
  { kind: "note", title: "Build başarısız", sub: "Loopa · iOS", tone: C.coral, x: 520, y: 360 },
  { kind: "app", name: "Tidy", hue: 40, x: 340, y: 590, badge: 12 },
  { kind: "tab", label: "Vercel · deploy", x: 880, y: 520 },
  { kind: "note", title: "Review bekliyor", sub: "Chordly · App Store", tone: C.violet, x: 620, y: 640 },
  { kind: "app", name: "Bloom", hue: 335, x: 120, y: 470, badge: 2 },

  { kind: "app", name: "Pace", hue: 205, x: 190, y: 1300, badge: 5 },
  { kind: "note", title: "Crash +12", sub: "Tidy · Android", tone: C.amber, x: 640, y: 1270 },
  { kind: "tab", label: "Firebase · Crashlytics", x: 380, y: 1450 },
  { kind: "app", name: "Nook", hue: 12, x: 920, y: 1450, badge: 9 },
  { kind: "tab", label: "Supabase · 3 tablo", x: 780, y: 1600 },
  { kind: "note", title: "Yeni yorum ★★☆", sub: "Pace · Google Play", tone: C.mint, x: 330, y: 1650 },
  { kind: "app", name: "Orbit", hue: 280, x: 160, y: 1810, badge: 4 },
  { kind: "tab", label: "App Store Connect", x: 560, y: 1800 },
  { kind: "app", name: "Kiln", hue: 25, x: 930, y: 1790, badge: 1 },
  { kind: "tab", label: "Google Play Console", x: 860, y: 1180 + 10 },
];

const AppTile: React.FC<{ name: string; hue: number; badge: number; frame: number }> = ({ name, hue, badge, frame }) => {
  const b = Math.min(badge + Math.floor(Math.max(0, frame - 30) / 22), 99);
  return (
    <div style={{ position: "relative", width: 150, height: 150 }}>
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 40,
          background: softCard(hue),
          boxShadow: cardShadow,
          border: "2px solid rgba(255,255,255,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 70,
          fontWeight: 800,
          color: hueInk(hue),
          letterSpacing: -3,
        }}
      >
        {name[0]}
      </div>
      <div style={{ position: "absolute", top: -12, right: -12, minWidth: 50, height: 50, borderRadius: 25, padding: "0 12px", background: C.coral, color: "#fff", fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px -8px rgba(255,107,74,0.9)", border: "3px solid #F6F4EF" }}>
        {b}
      </div>
      <div style={{ position: "absolute", top: 162, left: -20, right: -20, textAlign: "center", fontSize: 24, fontWeight: 600, color: C.inkSoft }}>{name}</div>
    </div>
  );
};

const Note: React.FC<{ title: string; sub: string; tone: string }> = ({ title, sub, tone }) => (
  <div style={{ width: 420, borderRadius: RADIUS, background: "rgba(255,255,255,0.94)", boxShadow: cardShadow, padding: "20px 24px", display: "flex", gap: 18, alignItems: "center" }}>
    <div style={{ width: 54, height: 54, borderRadius: 18, background: `${tone}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: tone, boxShadow: `0 0 0 6px ${tone}30` }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6 }}>{title}</span>
      <span style={{ fontSize: 22, fontWeight: 500, color: C.inkSoft }}>{sub}</span>
    </div>
  </div>
);

const Tab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 26px 16px 18px", borderRadius: 22, background: C.ink, color: "#F6F4EF", fontSize: 26, fontWeight: 600, boxShadow: "0 16px 30px -16px rgba(22,21,26,0.7)", whiteSpace: "nowrap" }}>
    <span style={{ display: "flex", gap: 6 }}>
      {["#FF6B4A", "#FFB020", "#2BC48A"].map((c) => (
        <span key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />
      ))}
    </span>
    {label}
    <span style={{ opacity: 0.45, marginLeft: 4 }}>×</span>
  </div>
);

/** Scene A: scattered apps, alerts and browser tabs that later collapse into the phone. */
export const Chaos: React.FC<{ frame: number; flyAt: number; target: { x: number; y: number } }> = ({ frame, flyAt, target }) => {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: C.ink }}>
      {ITEMS.map((it, i) => {
        const r = rand(i + 1);
        const s = enter(frame, 2 + i * 2.2, { damping: 12, stiffness: 150 });
        const rot0 = (rand(i + 20) - 0.5) * 22;
        const wobble = Math.sin((frame + i * 13) / 9) * 1.6 * Math.min(1, frame / 40);
        const fx = float(frame, i, 10, 70 + r * 50);
        const fy = float(frame + 20, i * 3, 12, 80 + r * 40);

        const d = flyAt + r * 12;
        const t = interpolate(frame, [d, d + 22], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
        const x = mix(it.x + fx, target.x, t);
        const y = mix(it.y + fy, target.y, t);
        const scale = mix(1, 0.12, t) * interpolate(s, [0, 1], [0.4, 1]);
        const opacity = Math.min(s, interpolate(t, [0.6, 1], [1, 0], clamp));
        const rot = mix(rot0 * s + wobble, 0, t);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
              opacity,
            }}
          >
            {it.kind === "app" ? <AppTile name={it.name} hue={it.hue} badge={it.badge} frame={frame} /> : null}
            {it.kind === "note" ? <Note title={it.title} sub={it.sub} tone={it.tone} /> : null}
            {it.kind === "tab" ? <Tab label={it.label} /> : null}
          </div>
        );
      })}
    </div>
  );
};
