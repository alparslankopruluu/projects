import React from "react";
import { C, FONT } from "../theme";

export const PHONE_W = 390;
export const PHONE_H = 844;

/**
 * Device shell drawn at logical iPhone size (390x844) and scaled as a whole,
 * so the UI inside can use the same units as the mobile app (28px card radius).
 */
export const Phone: React.FC<{
  x: number;
  y: number;
  scale: number;
  rotate?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, scale, rotate = 0, opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: x - PHONE_W / 2,
      top: y - PHONE_H / 2,
      width: PHONE_W,
      height: PHONE_H,
      transform: `scale(${scale}) rotate(${rotate}deg)`,
      transformOrigin: "50% 50%",
      opacity,
    }}
  >
    {/* ground shadow */}
    <div
      style={{
        position: "absolute",
        left: 30,
        right: 30,
        bottom: -26,
        height: 60,
        borderRadius: "50%",
        background: "rgba(22,21,26,0.28)",
        filter: "blur(22px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 62,
        background: "linear-gradient(160deg, #2A2830 0%, #121116 60%, #1E1C22 100%)",
        boxShadow: "0 50px 90px -30px rgba(22,21,26,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.12)",
        padding: 11,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 52,
          overflow: "hidden",
          background: C.bg,
          fontFamily: FONT,
          color: C.ink,
        }}
      >
        {children}
        {/* status bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 30px 0 34px", fontSize: 15, fontWeight: 600 }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[6, 9, 12, 15].map((h) => (
              <span key={h} style={{ width: 3.5, height: h * 0.8, borderRadius: 1, background: C.ink }} />
            ))}
            <span style={{ width: 24, height: 11, borderRadius: 3.5, border: `1.5px solid ${C.ink}`, marginLeft: 6, padding: 1.5 }}>
              <span style={{ display: "block", width: "78%", height: "100%", borderRadius: 1.5, background: C.ink }} />
            </span>
          </span>
        </div>
        {/* island */}
        <div style={{ position: "absolute", top: 11, left: "50%", marginLeft: -60, width: 120, height: 34, borderRadius: 20, background: "#0B0B0E" }} />
        {/* home indicator */}
        <div style={{ position: "absolute", bottom: 8, left: "50%", marginLeft: -67, width: 134, height: 5, borderRadius: 3, background: C.ink, opacity: 0.85 }} />
        {/* glass sheen */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 32%)", pointerEvents: "none" }} />
      </div>
    </div>
  </div>
);
