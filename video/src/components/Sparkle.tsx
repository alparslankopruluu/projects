import React from "react";

/** Four-point sparkle glyph used as the neutral "AI insight" mark (not a brand logo). */
export const Sparkle: React.FC<{ size: number; color?: string; rotate?: number }> = ({ size, color = "#fff", rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }}>
    <path
      d="M12 1.5c.6 4.9 2.6 8.4 10.5 10.5-7.9 2.1-9.9 5.6-10.5 10.5C11.4 17.6 9.4 14.1 1.5 12 9.4 9.9 11.4 6.4 12 1.5Z"
      fill={color}
    />
  </svg>
);

export const AIBadge: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.34,
      background: "linear-gradient(140deg, #9B82FF 0%, #7C5CFF 55%, #FF8A6B 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 10px 24px -10px rgba(124,92,255,0.7), inset 0 1px 0 rgba(255,255,255,0.5)",
    }}
  >
    <Sparkle size={size * 0.56} />
  </div>
);
