import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, RADIUS, cardShadow, hueInk, hueStrong, softCard } from "./theme";
import { clamp, enter, float, rand } from "./anim";
import { Backdrop } from "./components/Backdrop";
import { Headline } from "./components/Headline";
import { CountUp } from "./components/CountUp";
import { LogoMark } from "./components/LogoMark";
import { Sparkle } from "./components/Sparkle";

export const STAGE_DURATION = 240; // 8s @ 30fps

export type Stage = "start" | "middle" | "end";

export type ProjectStageProps = {
  name: string;
  hue: number;
  stage: Stage;
  headline: string;
  stats: { label: string; value: string }[];
  checklist: { label: string; done: boolean }[];
};

export const defaultStageProps: ProjectStageProps = {
  name: "Chordly",
  hue: 254,
  stage: "middle",
  headline: "Akor kütüphanesi hazır, App Store incelemesi yolda.",
  stats: [
    { label: "Görev", value: "18" },
    { label: "Build", value: "42" },
    { label: "Beta", value: "1.240" },
  ],
  checklist: [
    { label: "Akor motoru", done: true },
    { label: "Paywall", done: true },
    { label: "TestFlight", done: true },
    { label: "App Store metinleri", done: false },
    { label: "Apple mesajını yanıtla", done: false },
  ],
};

const STAGE_META: Record<Stage, { label: string; step: number; tone: string; hero: string }> = {
  start: { label: "Başlangıç", step: 0, tone: C.amber, hero: "Başlıyoruz." },
  middle: { label: "Geliştirme", step: 1, tone: C.violet, hero: "tamamlandı" },
  end: { label: "Yayında", step: 2, tone: C.mint, hero: "Yayında!" },
};

const TICK_START = 70;
const TICK_GAP = 14;

/** Validates / normalises incoming props so a bad payload still renders. */
const normalise = (p: ProjectStageProps): ProjectStageProps => ({
  name: p.name || "Proje",
  hue: Number.isFinite(p.hue) ? ((p.hue % 360) + 360) % 360 : 254,
  stage: p.stage in STAGE_META ? p.stage : "middle",
  headline: p.headline ?? "",
  stats: (p.stats ?? []).slice(0, 3),
  checklist: (p.checklist ?? []).slice(0, 5),
});

const Confetti: React.FC<{ frame: number; at: number; origin: { x: number; y: number }; hue: number; count?: number; seed?: number }> = ({ frame, at, origin, hue, count = 70, seed = 0 }) => {
  const t = (frame - at) / 30;
  if (t < 0 || t > 3) return null;
  const palette = [C.coral, C.violet, C.mint, C.amber, hueStrong(hue)];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const r1 = rand(i + seed * 100);
        const r2 = rand(i + 7 + seed * 100);
        const r3 = rand(i + 13 + seed * 100);
        const ang = -Math.PI / 2 + (r1 - 0.5) * Math.PI * 1.5;
        const speed = 900 + r2 * 900;
        const x = origin.x + Math.cos(ang) * speed * t * 0.9;
        const y = origin.y + Math.sin(ang) * speed * t + 0.5 * 1500 * t * t;
        const rot = (r3 - 0.5) * 900 * t;
        const op = interpolate(t, [0, 0.1, 2.2, 3], [0, 1, 1, 0], clamp);
        const w = 14 + r3 * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: i % 3 === 0 ? w : w * 0.45,
              borderRadius: i % 3 === 0 ? w : 4,
              background: palette[i % palette.length],
              opacity: op,
              transform: `rotate(${rot}deg) scaleX(${Math.cos(t * 8 + i)})`,
            }}
          />
        );
      })}
    </>
  );
};

export const ProjectStage: React.FC<ProjectStageProps> = (raw) => {
  const p = normalise(raw);
  const frame = useCurrentFrame();
  const meta = STAGE_META[p.stage];
  const { hue } = p;

  const total = Math.max(1, p.checklist.length);
  const doneIdx = p.checklist.map((c, i) => (c.done ? i : -1)).filter((i) => i >= 0);
  const doneCount = p.stage === "end" ? total : doneIdx.length;
  const tickFrame = (i: number) => {
    const order = p.stage === "end" ? i : doneIdx.indexOf(i);
    return order < 0 ? Infinity : TICK_START + order * TICK_GAP;
  };
  const progress =
    doneCount === 0
      ? 0
      : interpolate(frame, [TICK_START - 6, TICK_START + (doneCount - 1) * TICK_GAP + 8], [0, doneCount / total], clamp);
  const pct = Math.round(progress * 100);

  const pill = enter(frame, 4);
  const hero = enter(frame, 18, { damping: 15 });
  const heroBob = float(frame, 1, 6, 120);

  return (
    <AbsoluteFill lang="tr" style={{ fontFamily: FONT, color: C.ink, backgroundColor: C.bg }}>
      <Backdrop
        blobs={[
          { x: 200, y: 300, r: 700, hue, speed: 0.6, alpha: 0.7 },
          { x: 950, y: 800, r: 600, hue: (hue + 40) % 360, speed: -0.5 },
          { x: 300, y: 1700, r: 700, hue: (hue + 320) % 360, speed: 0.4 },
        ]}
      />

      {/* stage pill + steps */}
      <div style={{ position: "absolute", top: 130, left: 70, right: 70, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: pill, transform: `translateY(${(1 - pill) * 20}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px 14px 16px", borderRadius: 99, background: "rgba(255,255,255,0.8)", boxShadow: cardShadow, fontSize: 30, fontWeight: 700 }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: meta.tone, boxShadow: `0 0 0 ${6 + Math.sin(frame / 6) * 3}px ${meta.tone}33` }} />
          {meta.label}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: i === meta.step ? 56 : 18, height: 18, borderRadius: 9, background: i <= meta.step ? hueStrong(hue) : "rgba(22,21,26,0.12)" }} />
          ))}
        </div>
      </div>

      <Headline text={p.name} frame={frame} start={8} size={156} y={225} stagger={3} />
      <div style={{ position: "absolute", top: 420, left: 90, right: 90, textAlign: "center", fontSize: 42, fontWeight: 500, lineHeight: 1.25, letterSpacing: -0.8, color: C.inkSoft, textWrap: "balance", opacity: enter(frame, 16), transform: `translateY(${(1 - enter(frame, 16)) * 20}px)` }}>
        {p.headline}
      </div>

      {/* hero card */}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 590,
          height: 460,
          borderRadius: RADIUS * 1.6,
          background: softCard(hue),
          boxShadow: `${cardShadow}, 0 50px 100px -50px hsla(${hue},70%,40%,0.5)`,
          overflow: "hidden",
          opacity: hero,
          transform: `translateY(${(1 - hero) * 120 + heroBob}px) scale(${interpolate(hero, [0, 1], [0.94, 1])})`,
          padding: "48px 52px",
        }}
      >
        {p.stage === "start" ? (
          <>
            {/* radiating rings */}
            {[0, 1, 2, 3].map((k) => {
              const r = ((frame + k * 22) % 88) / 88;
              return <div key={k} style={{ position: "absolute", right: 150 - r * 260, top: 230 - 110 - r * 260, width: 220 + r * 520, height: 220 + r * 520, borderRadius: "50%", border: `4px solid ${hueStrong(hue)}`, opacity: (1 - r) * 0.45 }} />;
            })}
            <div style={{ position: "absolute", right: 150, top: 120, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${enter(frame, 30, { damping: 9 })})` }}>
              <Sparkle size={120} color={hueStrong(hue)} rotate={frame * 1.2} />
            </div>
            <div style={{ position: "relative", fontSize: 30, fontWeight: 700, color: hueInk(hue), opacity: 0.75 }}>Gün 1</div>
            <div style={{ position: "relative", marginTop: 10, fontSize: 96, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{meta.hero}</div>
            <div style={{ position: "relative", marginTop: 26, fontSize: 32, fontWeight: 600, color: hueInk(hue), maxWidth: 440 }}>{total} hedef belirlendi</div>
          </>
        ) : null}

        {p.stage === "middle" ? (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, color: hueInk(hue), opacity: 0.75 }}>İlerleme</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
              <span style={{ fontSize: 210, fontWeight: 800, letterSpacing: -10, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>%{pct}</span>
              <span style={{ fontSize: 36, fontWeight: 600, color: hueInk(hue) }}>{meta.hero}</span>
            </div>
          </>
        ) : null}

        {p.stage === "end" ? (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, color: hueInk(hue), opacity: 0.75 }}>Sürüm 1.0</div>
            <div style={{ marginTop: 10, fontSize: 140, fontWeight: 800, letterSpacing: -6, lineHeight: 1, transform: `scale(${enter(frame, 34, { damping: 8, stiffness: 160 })}) rotate(${-4 + Math.sin(frame / 20) * 1}deg)`, transformOrigin: "20% 60%" }}>
              {meta.hero}
            </div>
            <div style={{ position: "absolute", right: 52, top: 48, width: 124, height: 124, borderRadius: 62, background: C.mint, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 64, fontWeight: 800, transform: `scale(${enter(frame, 60, { damping: 8 })}) rotate(${(1 - enter(frame, 60)) * -90}deg)`, boxShadow: "0 20px 40px -16px rgba(43,196,138,0.8)" }}>
              ✓
            </div>
          </>
        ) : null}

        {/* segmented progress bar */}
        <div style={{ position: "absolute", left: 52, right: 52, bottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 600, color: hueInk(hue), marginBottom: 14 }}>
            <span>
              {Math.round(progress * total)} / {total} adım
            </span>
            <span>%{pct}</span>
          </div>
          <div style={{ position: "relative", height: 30, borderRadius: 15, background: "rgba(255,255,255,0.7)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 15, background: `linear-gradient(90deg, ${hueStrong(hue)}, ${p.stage === "end" ? C.mint : C.coral})` }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, width: 160, left: 0, transform: `translateX(${((frame * 9) % 1400) - 200}px) skewX(-20deg)`, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.45), rgba(255,255,255,0))" }} />
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div style={{ position: "absolute", top: 1090, left: 70, right: 70, display: "flex", gap: 18 }}>
        {p.stats.map((st, i) => {
          const e = enter(frame, 34 + i * 5);
          return (
            <div key={st.label} style={{ flex: 1, height: 190, borderRadius: RADIUS, background: C.white, boxShadow: cardShadow, padding: "28px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: e, transform: `translateY(${(1 - e) * 60 + float(frame, i + 4, 4, 100)}px)` }}>
              <span style={{ fontSize: 26, fontWeight: 600, color: C.inkSoft }}>{st.label}</span>
              <CountUp value={st.value} frame={frame} start={40 + i * 5} duration={40} style={{ fontSize: 70, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }} />
            </div>
          );
        })}
      </div>

      {/* checklist */}
      <div style={{ position: "absolute", top: 1320, left: 70, right: 70, borderRadius: RADIUS * 1.4, background: "rgba(255,255,255,0.92)", boxShadow: cardShadow, padding: "18px 34px", opacity: enter(frame, 44), transform: `translateY(${(1 - enter(frame, 44)) * 80}px)` }}>
        {p.checklist.map((c, i) => {
          const row = enter(frame, 48 + i * 4);
          const tf = tickFrame(i);
          const tick = Number.isFinite(tf) ? enter(frame, tf, { damping: 11, stiffness: 180 }) : 0;
          const isDone = frame >= tf;
          return (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 24, height: 88, borderTop: i === 0 ? "none" : `2px solid ${C.line}`, opacity: row, transform: `translateX(${(1 - row) * 40}px)` }}>
              <div style={{ position: "relative", width: 48, height: 48, borderRadius: 24, border: `3.5px solid ${isDone ? "transparent" : "rgba(22,21,26,0.2)"}`, background: isDone ? C.mint : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${isDone ? interpolate(tick, [0, 1], [0.6, 1]) : 1})` }}>
                {isDone ? (
                  <svg width={28} height={28} viewBox="0 0 24 24">
                    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
                  </svg>
                ) : null}
                {isDone ? <div style={{ position: "absolute", inset: -tick * 18, borderRadius: "50%", border: `3px solid ${C.mint}`, opacity: (1 - tick) * 0.8 }} /> : null}
              </div>
              <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.6, color: isDone ? C.inkFaint : C.ink, textDecoration: isDone ? "line-through" : "none", textDecorationThickness: 3 }}>{c.label}</span>
              {!isDone && p.stage !== "start" ? <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 700, color: meta.tone, background: `${meta.tone}1A`, padding: "8px 16px", borderRadius: 99 }}>sırada</span> : null}
            </div>
          );
        })}
      </div>

      {/* footer brand */}
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: interpolate(frame, [60, 80], [0, 0.8], clamp) }}>
        <LogoMark size={52} />
        <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>Projects</span>
      </div>

      {p.stage === "end" ? (
        <>
          <Confetti frame={frame} at={36} origin={{ x: 540, y: 820 }} hue={hue} />
          <Confetti frame={frame} at={128} origin={{ x: 540, y: 820 }} hue={hue} seed={2} count={50} />
        </>
      ) : null}
      {p.stage === "start" ? <Confetti frame={frame} at={30} origin={{ x: 760, y: 820 }} hue={hue} count={30} seed={5} /> : null}
    </AbsoluteFill>
  );
};
