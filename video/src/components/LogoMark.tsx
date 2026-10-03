import React from "react";
import { softCard } from "../theme";

/** Projects mark: three fanned soft cards. `open` 0..1 fans them out. */
export const LogoMark: React.FC<{ size: number; open?: number }> = ({ size, open = 1 }) => {
  const cards = [
    { hue: 12, rot: -14, dx: -0.16 },
    { hue: 155, rot: 10, dx: 0.16 },
    { hue: 254, rot: 0, dx: 0 },
  ];
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: size * 0.18,
            top: size * 0.1,
            width: size * 0.64,
            height: size * 0.8,
            borderRadius: size * 0.2,
            background: softCard(c.hue),
            border: `${Math.max(2, size * 0.012)}px solid rgba(255,255,255,0.9)`,
            boxShadow: "0 18px 36px -16px rgba(22,21,26,0.35)",
            transform: `translateX(${c.dx * size * open}px) rotate(${c.rot * open}deg)`,
            transformOrigin: "50% 100%",
          }}
        >
          {i === 2 ? (
            <div style={{ position: "absolute", left: "18%", right: "18%", top: "22%", display: "flex", flexDirection: "column", gap: size * 0.06 }}>
              <div style={{ height: size * 0.06, borderRadius: 99, background: "hsl(254 45% 30%)", width: "70%" }} />
              <div style={{ height: size * 0.06, borderRadius: 99, background: "hsla(254,45%,30%,0.35)" }} />
              <div style={{ height: size * 0.06, borderRadius: 99, background: "hsla(254,45%,30%,0.35)", width: "55%" }} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
