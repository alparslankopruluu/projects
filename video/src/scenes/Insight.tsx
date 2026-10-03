import React from "react";
import { interpolate } from "remotion";
import { C, FONT, cardShadow } from "../theme";
import { clamp, enter, fadeOut, float } from "../anim";
import { AIBadge } from "../components/Sparkle";

const SENTENCE = "Chordly'de Apple mesajı bekliyor. Önce onu yanıtla.";

/** Scene D: Claude insight card types out a prioritised recommendation. */
export const Insight: React.FC<{ frame: number; start: number; typeStart: number; end: number }> = ({ frame, start, typeStart, end }) => {
  const f = frame - start;
  const s = enter(f, 0, { damping: 15, stiffness: 110 });
  const exit = interpolate(frame, [end, end + 16], [0, 1], clamp);
  const chars = Math.floor(interpolate(frame, [typeStart, typeStart + 58], [0, SENTENCE.length], clamp));
  const typed = SENTENCE.slice(0, chars);
  const doneTyping = chars >= SENTENCE.length;
  const caretOn = !doneTyping || Math.floor(frame / 8) % 2 === 0;
  const after = typeStart + 62;
  const meta = enter(frame, after);
  const btns = enter(frame, after + 6);
  const toast = enter(frame, after + 18, { damping: 11, stiffness: 160 });
  const bob = float(frame, 3, 6, 100);

  // split typed text so "Önce onu yanıtla." carries the accent
  const splitAt = SENTENCE.indexOf("Önce");
  const a = typed.slice(0, splitAt);
  const b = typed.slice(splitAt);

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 430,
        fontFamily: FONT,
        color: C.ink,
        opacity: Math.min(1, s * 2.2) * fadeOut(frame, end, end + 14),
        transform: `translateY(${(1 - s) * 260 + bob - exit * 120}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
      }}
    >
      {/* gradient hairline border */}
      <div style={{ position: "absolute", inset: -3, borderRadius: 47, background: "linear-gradient(135deg, #B7A6FF 0%, #7C5CFF 40%, #FF8A6B 100%)", opacity: 0.9 }} />
      <div
        style={{
          position: "relative",
          borderRadius: 44,
          background: "linear-gradient(180deg, #FFFFFF 0%, #FBFAFF 100%)",
          boxShadow: `${cardShadow}, 0 60px 120px -40px rgba(124,92,255,0.45)`,
          padding: "40px 44px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <AIBadge size={74} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8 }}>Claude</span>
            <span style={{ fontSize: 24, fontWeight: 500, color: C.inkFaint }}>İçgörü · şimdi</span>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 24, fontWeight: 700, color: C.coral, background: "rgba(255,107,74,0.12)", padding: "10px 20px", borderRadius: 99 }}>Öncelik 1</span>
        </div>

        <div style={{ marginTop: 28, minHeight: 140, fontSize: 60, fontWeight: 800, letterSpacing: -2.2, lineHeight: 1.1 }}>
          <span>{a}</span>
          <span style={{ backgroundImage: `linear-gradient(100deg, ${C.coral}, ${C.violet})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{b}</span>
          <span style={{ display: "inline-block", width: 5, height: 58, marginLeft: 4, transform: "translateY(8px)", background: C.violet, borderRadius: 3, opacity: caretOn ? 1 : 0 }} />
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap", opacity: meta, transform: `translateY(${(1 - meta) * 16}px)` }}>
          {["App Store Connect", "Çözüm Merkezi", "2 saat önce"].map((t) => (
            <span key={t} style={{ fontSize: 22, fontWeight: 600, color: C.inkSoft, background: "rgba(22,21,26,0.05)", padding: "10px 18px", borderRadius: 99 }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 30, display: "flex", gap: 16, opacity: btns, transform: `translateY(${(1 - btns) * 20}px)` }}>
          <div style={{ flex: 1, height: 92, borderRadius: 30, background: C.ink, color: "#fff", fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Yanıtla</div>
          <div style={{ flex: 1, height: 92, borderRadius: 30, border: "2.5px solid rgba(22,21,26,0.14)", fontSize: 32, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Nota ekle</div>
        </div>
      </div>

      {/* sent alert toast */}
      <div
        style={{
          position: "absolute",
          right: 30,
          bottom: -44,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 28px 18px 18px",
          borderRadius: 99,
          background: C.white,
          boxShadow: "0 20px 40px -18px rgba(22,21,26,0.45)",
          fontSize: 26,
          fontWeight: 700,
          opacity: toast,
          transform: `scale(${interpolate(toast, [0, 1], [0.6, 1])}) translateY(${(1 - toast) * 20}px)`,
        }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 22, background: C.mint, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>✓</span>
        Uyarı gönderildi
      </div>
    </div>
  );
};
