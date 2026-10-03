import React from "react";
import { interpolate } from "remotion";
import { C, FONT } from "../theme";
import { clamp, enter, float } from "../anim";
import { LogoMark } from "../components/LogoMark";
import { Headline } from "../components/Headline";

/** Scene E: brand lock-up. */
export const EndCard: React.FC<{ frame: number; start: number }> = ({ frame, start }) => {
  const f = frame - start;
  const mark = enter(f, 0, { damping: 12, stiffness: 110 });
  const open = enter(f, 8, { damping: 10, stiffness: 90 });
  const tag = enter(f, 26);
  const foot = interpolate(f, [40, 56], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 540 - 150, top: 560 + float(frame, 1, 8, 90), width: 300, height: 300, transform: `scale(${mark}) rotate(${(1 - mark) * -20}deg)` }}>
        <LogoMark size={300} open={open} />
      </div>
      <Headline text="Projects" frame={f} start={10} size={172} y={920} stagger={0} weight={800} />
      <div style={{ position: "absolute", top: 1140, left: 0, right: 0, textAlign: "center", fontSize: 56, fontWeight: 600, letterSpacing: -1.4, color: C.inkSoft, opacity: tag, transform: `translateY(${(1 - tag) * 24}px)` }}>
        Her proje, <span style={{ color: C.ink }}>tek bakışta.</span>
      </div>
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14, opacity: foot }}>
        {[
          { t: "Uygulamalar", c: C.violet },
          { t: "Kaynaklar", c: C.mint },
          { t: "Claude", c: C.coral },
        ].map((x) => (
          <span key={x.t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 600, color: C.inkSoft, background: "rgba(255,255,255,0.75)", padding: "14px 24px", borderRadius: 99 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: x.c }} />
            {x.t}
          </span>
        ))}
      </div>
    </div>
  );
};
