import React from "react";
import { interpolate } from "remotion";
import { C, FONT } from "../theme";
import { clamp, enter, fadeOut } from "../anim";

/**
 * Word-by-word kinetic headline. Each word rises out of a mask with a spring.
 * `accent` words (by index) get the coral->violet ink.
 */
export const Headline: React.FC<{
  text: string;
  frame: number;
  start: number;
  end?: number;
  size?: number;
  y: number;
  stagger?: number;
  accent?: number[];
  weight?: number;
  lineHeight?: number;
  maxWidth?: number;
  color?: string;
}> = ({ text, frame, start, end, size = 88, y, stagger = 4, accent = [], weight = 800, lineHeight = 1.04, maxWidth = 940, color = C.ink }) => {
  const words = text.split(" ");
  const out = end !== undefined ? fadeOut(frame, end, end + 12) : 1;
  const lift = end !== undefined ? interpolate(frame, [end, end + 12], [0, -30], clamp) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        display: "flex",
        justifyContent: "center",
        opacity: out,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div style={{ maxWidth, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.26, rowGap: 0, fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: -size * 0.04, lineHeight, color, textAlign: "center" }}>
        {words.map((w, i) => {
          const s = enter(frame, start + i * stagger, { damping: 18, stiffness: 140 });
          const isAccent = accent.includes(i);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - s) * 105}%) rotate(${(1 - s) * 6}deg)`,
                  opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
                  ...(isAccent
                    ? { backgroundImage: `linear-gradient(100deg, ${C.coral} 0%, ${C.violet} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                    : {}),
                }}
              >
                {w}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Eyebrow: React.FC<{ text: string; frame: number; start: number; end?: number; y: number; color?: string }> = ({ text, frame, start, end, y, color = C.violet }) => {
  const s = enter(frame, start);
  const out = end !== undefined ? fadeOut(frame, end, end + 10) : 1;
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s * out }}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          color,
          padding: "12px 26px",
          borderRadius: 99,
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0 10px 30px -18px rgba(22,21,26,0.4)",
          transform: `translateY(${(1 - s) * 20}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
