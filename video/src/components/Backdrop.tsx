import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

type Blob = { x: number; y: number; r: number; hue: number; speed: number; alpha?: number };

const DEFAULT_BLOBS: Blob[] = [
  { x: 180, y: 260, r: 620, hue: 254, speed: 0.6 },
  { x: 940, y: 520, r: 560, hue: 12, speed: -0.45 },
  { x: 260, y: 1500, r: 680, hue: 155, speed: 0.5 },
  { x: 900, y: 1720, r: 520, hue: 40, speed: -0.7 },
];

/**
 * Warm paper background with slow drifting pastel light and a faint dot grid.
 * Blobs drift at different speeds, which reads as depth / parallax.
 */
export const Backdrop: React.FC<{ blobs?: Blob[]; intensity?: number; grid?: boolean }> = ({
  blobs = DEFAULT_BLOBS,
  intensity = 1,
  grid = true,
}) => {
  const frame = useCurrentFrame();
  const layers = blobs
    .map((b, i) => {
      const dx = Math.sin((frame / 180 + i) * b.speed) * 60;
      const dy = Math.cos((frame / 210 + i * 1.7) * b.speed) * 50;
      const a = (b.alpha ?? 0.55) * intensity;
      return `radial-gradient(circle ${b.r}px at ${b.x + dx}px ${b.y + dy}px, hsla(${b.hue},80%,82%,${a}) 0%, hsla(${b.hue},80%,86%,${a * 0.35}) 45%, hsla(${b.hue},80%,90%,0) 72%)`;
    })
    .join(",");

  const gridShift = (frame * 0.25) % 36;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill style={{ backgroundImage: layers }} />
      {grid ? (
        <AbsoluteFill
          style={{
            backgroundImage: "radial-gradient(rgba(22,21,26,0.07) 1.6px, transparent 1.8px)",
            backgroundSize: "36px 36px",
            backgroundPosition: `0px ${gridShift}px`,
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 85%)",
          }}
        />
      ) : null}
      {/* soft vignette to keep edges calm */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 90% 75% at 50% 45%, rgba(246,244,239,0) 60%, rgba(236,232,222,0.9) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
