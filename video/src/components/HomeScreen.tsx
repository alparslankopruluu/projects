import React from "react";
import { interpolate } from "remotion";
import { C, HUE, RADIUS, cardShadow, hueInk, hueStrong, softCard } from "../theme";
import { clamp, enter, float } from "../anim";
import { CountUp } from "./CountUp";

type Props = {
  /** local frame; cards stagger in from `start` */
  frame: number;
  start?: number;
  /** 0..1 glow applied when data is flowing in from sources */
  pulse?: number;
  /** highlight the Chordly row (used when the insight card appears) */
  focusRow?: number;
};

const Stat: React.FC<{
  hue: number;
  label: string;
  value?: string;
  sub: string;
  frame: number;
  delay: number;
  pulse: number;
  children?: React.ReactNode;
}> = ({ hue, label, value, sub, frame, delay, pulse, children }) => {
  const s = enter(frame, delay);
  const y = interpolate(s, [0, 1], [60, 0]);
  const bob = float(frame, delay, 2.2, 120);
  return (
    <div
      style={{
        position: "relative",
        height: 164,
        borderRadius: RADIUS,
        background: softCard(hue),
        boxShadow: `${cardShadow}, 0 0 0 ${pulse * 3}px hsla(${hue},80%,70%,${pulse * 0.5})`,
        padding: "16px 16px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: s,
        transform: `translateY(${y + bob}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: hueInk(hue), opacity: 0.8 }}>{label}</span>
        <span style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: hueInk(hue), fontWeight: 700 }}>
          ↗
        </span>
      </div>
      {children ?? (
        <CountUp value={value ?? ""} frame={frame} start={delay + 6} duration={34} style={{ fontSize: 58, fontWeight: 800, letterSpacing: -2.5, color: C.ink, lineHeight: 1 }} />
      )}
      <span style={{ fontSize: 12.5, fontWeight: 500, color: hueInk(hue), opacity: 0.7 }}>{sub}</span>
    </div>
  );
};

const Spark: React.FC<{ frame: number; delay: number; hue: number }> = ({ frame, delay, hue }) => {
  const pts = [18, 26, 22, 34, 30, 44, 40, 52, 48, 62];
  const t = interpolate(frame, [delay + 4, delay + 40], [0, 1], clamp);
  const w = 130;
  const h = 58;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * w},${h - (p / 70) * h}`).join(" ");
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={hueStrong(hue)} stopOpacity={0.35} />
            <stop offset="1" stopColor={hueStrong(hue)} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#sparkfill)" opacity={t} />
        <path d={d} fill="none" stroke={hueStrong(hue)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
      </svg>
    </div>
  );
};

const ROWS = [
  { name: "Chordly", hue: HUE.violet, status: "Apple mesajı", tone: C.coral },
  { name: "Loopa", hue: HUE.mint, status: "Build %72", tone: C.amber },
  { name: "Tidy", hue: HUE.amber, status: "Crash +12", tone: C.coral },
];

export const HomeScreen: React.FC<Props> = ({ frame, start = 0, pulse = 0, focusRow = 0 }) => {
  const f = frame - start;
  const head = enter(f, 0);
  return (
    <div style={{ position: "absolute", inset: 0, padding: "64px 18px 0" }}>
      <div style={{ opacity: head, transform: `translateY(${(1 - head) * 20}px)`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 4px 16px" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: C.inkSoft }}>Salı, 30 Eylül</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.2, marginTop: 2 }}>Stüdyo</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 21, background: softCard(HUE.coral), boxShadow: cardShadow, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: hueInk(HUE.coral) }}>
          S
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Stat hue={HUE.violet} label="Uygulamalar" value="10" sub="7 yayında" frame={f} delay={6} pulse={pulse} />
        <Stat hue={HUE.coral} label="Yarım kalan" value="4" sub="2 bu hafta" frame={f} delay={11} pulse={pulse} />
        <Stat hue={HUE.amber} label="Bildirim" value="3" sub="1 acil" frame={f} delay={16} pulse={pulse} />
        <Stat hue={HUE.mint} label="Analitik" sub="+18% bu hafta" frame={f} delay={21} pulse={pulse}>
          <Spark frame={f} delay={21} hue={HUE.mint} />
        </Stat>
      </div>

      <div style={{ marginTop: 22, padding: "0 4px", display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: enter(f, 26) }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>Öncelik</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.violet }}>Tümü</span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {ROWS.map((r, i) => {
          const s = enter(f, 30 + i * 5);
          const focused = i === 0 ? focusRow : 0;
          return (
            <div
              key={r.name}
              style={{
                height: 58,
                borderRadius: 20,
                background: C.white,
                boxShadow: `${cardShadow}, 0 0 0 ${focused * 2.5}px ${C.violet}`,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: 12,
                opacity: s,
                transform: `translateX(${(1 - s) * 40}px) scale(${1 + focused * 0.03})`,
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 11, background: softCard(r.hue), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: hueInk(r.hue) }}>
                {r.name[0]}
              </div>
              <span style={{ fontSize: 15.5, fontWeight: 600, flex: 1 }}>{r.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: r.tone, background: `${r.tone}1A`, padding: "5px 10px", borderRadius: 99 }}>{r.status}</span>
            </div>
          );
        })}
      </div>

      {/* tab bar */}
      <div style={{ position: "absolute", left: 18, right: 18, bottom: 26, height: 62, borderRadius: 31, background: "rgba(255,255,255,0.86)", boxShadow: cardShadow, display: "flex", alignItems: "center", justifyContent: "space-around", opacity: head }}>
        {["Ana sayfa", "Projeler", "Uyarılar", "Ayarlar"].map((t, i) => (
          <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ width: 20, height: 20, borderRadius: 7, background: i === 0 ? C.ink : "rgba(22,21,26,0.18)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: i === 0 ? C.ink : C.inkFaint }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
