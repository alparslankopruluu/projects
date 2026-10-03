import React from "react";
import { interpolate } from "remotion";
import { C, FONT, cardShadow, hueInk, softCard } from "../theme";
import { clamp, enter, fadeOut, float } from "../anim";
import { AIBadge } from "../components/Sparkle";

type Src = { label: string; sub: string; hue: number };

// Text-only labels. No brand marks are drawn.
const SOURCES: Src[] = [
  { label: "GitHub", sub: "repo · issue · PR", hue: 254 },
  { label: "Vercel", sub: "deploy · domain", hue: 220 },
  { label: "Firebase", sub: "crash · analytics", hue: 40 },
  { label: "Supabase", sub: "tablo · auth", hue: 155 },
  { label: "App Store", sub: "inceleme · rapor", hue: 205 },
  { label: "Google Play", sub: "yorum · sürüm", hue: 12 },
];

const ROW_Y = [450, 610, 770];
const LEFT_X = 208;
const RIGHT_X = 872;
const CHIP_W = 336;
export const HUB = { x: 540, y: 905 };

type P = { x: number; y: number };
const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const layout = SOURCES.map((s, i) => {
  const left = i % 2 === 0;
  const row = Math.floor(i / 2);
  const cx = left ? LEFT_X : RIGHT_X;
  const cy = ROW_Y[row];
  const edge = left ? cx + CHIP_W / 2 - 6 : cx - CHIP_W / 2 + 6;
  const p0 = { x: edge, y: cy };
  const p1 = { x: edge + (left ? 150 : -150), y: cy };
  const p2 = { x: HUB.x, y: cy + (HUB.y - cy) * 0.35 };
  const p3 = { x: HUB.x, y: HUB.y };
  return { ...s, cx, cy, left, p: [p0, p1, p2, p3] as [P, P, P, P] };
});

/** Scene C: source chips wire themselves into a hub that feeds the phone. */
export const Sources: React.FC<{ frame: number; start: number; end: number; phoneTop: number }> = ({ frame, start, end, phoneTop }) => {
  const f = frame - start;
  const out = fadeOut(frame, end, end + 14);
  const hubIn = enter(f, 34);
  const flowing = interpolate(f, [48, 60], [0, 1], clamp);
  const trunk = interpolate(f, [40, 56], [0, 1], clamp);

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: C.ink, opacity: out }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="wire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.violet} stopOpacity={0.25} />
            <stop offset="1" stopColor={C.violet} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        {layout.map((s, i) => {
          const [p0, p1, p2, p3] = s.p;
          const draw = interpolate(f, [14 + i * 4, 44 + i * 4], [0, 1], clamp);
          return (
            <path
              key={s.label}
              d={`M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
              fill="none"
              stroke="url(#wire)"
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
            />
          );
        })}
        <line x1={HUB.x} y1={HUB.y} x2={HUB.x} y2={HUB.y + (phoneTop - HUB.y) * trunk} stroke={C.violet} strokeWidth={6} strokeLinecap="round" />
        {/* data packets */}
        {flowing > 0
          ? layout.flatMap((s, i) =>
              [0, 1, 2].map((k) => {
                const period = 42;
                const u = (((f - 48 - k * 14 - i * 5) % period) + period) % period / period;
                const pt = bez(...s.p, u);
                const a = Math.sin(u * Math.PI) * flowing;
                return <circle key={`${i}-${k}`} cx={pt.x} cy={pt.y} r={9} fill={`hsl(${s.hue} 80% 60%)`} opacity={a} />;
              }),
            )
          : null}
        {flowing > 0
          ? [0, 1, 2, 3].map((k) => {
              const u = (((f - 52 - k * 9) % 36) + 36) % 36 / 36;
              return <circle key={`t${k}`} cx={HUB.x} cy={HUB.y + (phoneTop - HUB.y) * u} r={8} fill="#fff" stroke={C.violet} strokeWidth={4} opacity={Math.sin(u * Math.PI) * flowing} />;
            })
          : null}
      </svg>

      {layout.map((s, i) => {
        const e = enter(f, 2 + i * 3, { damping: 14 });
        const bob = float(frame, i * 2, 6, 90);
        const glow = flowing * (0.5 + 0.5 * Math.sin((f - i * 5) / 6));
        return (
          <div
            key={s.label}
            style={{
              position: "absolute",
              left: s.cx - CHIP_W / 2,
              top: s.cy - 52,
              width: CHIP_W,
              height: 104,
              borderRadius: 30,
              background: "rgba(255,255,255,0.96)",
              boxShadow: cardShadow,
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "0 22px",
              opacity: e,
              transform: `translateX(${(1 - e) * (s.left ? -80 : 80)}px) translateY(${bob}px) scale(${interpolate(e, [0, 1], [0.85, 1])})`,
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 20, background: softCard(s.hue), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: hueInk(s.hue), boxShadow: `0 0 0 ${glow * 5}px hsla(${s.hue},80%,70%,0.35)` }}>
              {s.label[0]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.8, whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ fontSize: 20, fontWeight: 500, color: C.inkSoft }}>{s.sub}</span>
            </div>
            <div style={{ marginLeft: "auto", width: 14, height: 14, borderRadius: 7, background: interpolate(f, [40 + i * 4, 46 + i * 4], [0, 1], clamp) > 0.5 ? C.mint : "rgba(22,21,26,0.15)" }} />
          </div>
        );
      })}

      {/* hub */}
      <div style={{ position: "absolute", left: HUB.x - 44, top: HUB.y - 44, width: 88, height: 88, transform: `scale(${hubIn})` }}>
        {[0, 1].map((k) => {
          const ring = ((f + k * 20) % 40) / 40;
          return <div key={k} style={{ position: "absolute", inset: -ring * 50, borderRadius: "50%", border: `3px solid ${C.violet}`, opacity: (1 - ring) * 0.5 * flowing }} />;
        })}
        <AIBadge size={88} />
      </div>
    </div>
  );
};
