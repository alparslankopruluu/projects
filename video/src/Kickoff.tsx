import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";
import { clamp, enter, glide, mix } from "./anim";
import { Backdrop } from "./components/Backdrop";
import { Headline, Eyebrow } from "./components/Headline";
import { Phone, PHONE_H } from "./components/Phone";
import { HomeScreen } from "./components/HomeScreen";
import { Chaos } from "./scenes/Chaos";
import { Sources } from "./scenes/Sources";
import { Insight } from "./scenes/Insight";
import { EndCard } from "./scenes/EndCard";

export const KICKOFF_DURATION = 600; // 20s @ 30fps

/** Scene timing in frames. Scenes overlap so the phone stays continuous. */
const T = {
  fly: 100,
  phoneIn: 110,
  homeCaption: 138,
  sources: 250,
  sourcesEnd: 384,
  insight: 392,
  typeStart: 414,
  insightEnd: 506,
  end: 514,
} as const;

// Phone poses: [x, y, scale]
const POSE = {
  home: { y: 1150, s: 1.6 },
  sources: { y: 1420, s: 0.98 },
  insight: { y: 1330, s: 1.36 },
};

export const Kickoff: React.FC = () => {
  const frame = useCurrentFrame();

  // phone choreography
  const rise = enter(frame, T.phoneIn, { damping: 17, stiffness: 90 });
  const toSources = glide(frame, T.sources, 34);
  const toInsight = glide(frame, T.sourcesEnd, 34);
  const out = glide(frame, T.insightEnd, 26);

  let y = mix(2700, POSE.home.y, rise);
  let s = mix(1.2, POSE.home.s, rise);
  y = mix(y, POSE.sources.y, toSources);
  s = mix(s, POSE.sources.s, toSources);
  y = mix(y, POSE.insight.y, toInsight);
  s = mix(s, POSE.insight.s, toInsight);
  y = mix(y, 2600, out);
  const rot = mix(8, 0, rise) + Math.sin(frame / 60) * 0.6 * rise;

  const phoneTop = POSE.sources.y - (PHONE_H * POSE.sources.s) / 2;

  // data pulse while sources flow, focus on Chordly during insight
  const pulse = interpolate(frame, [T.sources + 48, T.sources + 60, T.sourcesEnd - 10, T.sourcesEnd], [0, 1, 1, 0], clamp) * (0.5 + 0.5 * Math.sin(frame / 5));
  const focusRow = interpolate(frame, [T.typeStart + 20, T.typeStart + 34], [0, 1], clamp);
  const dim = interpolate(frame, [T.insight, T.insight + 20], [0, 0.18], clamp);

  // gentle global camera push for parallax against the backdrop
  const cam = interpolate(frame, [0, KICKOFF_DURATION], [1.0, 1.035]);

  return (
    <AbsoluteFill lang="tr" style={{ fontFamily: FONT, color: C.ink, backgroundColor: C.bg }}>
      <Backdrop intensity={frame > T.end ? 1.25 : 1} />
      <AbsoluteFill style={{ transform: `scale(${cam})` }}>
        {/* A. chaos */}
        {frame < T.fly + 40 ? (
          <>
            <Chaos frame={frame} flyAt={T.fly} target={{ x: 540, y: 1150 }} />
            <Headline text="10 uygulama." frame={frame} start={10} end={T.fly - 6} size={118} y={770} accent={[0]} />
            <Headline text="6 platform." frame={frame} start={22} end={T.fly - 4} size={118} y={900} accent={[0]} />
            <Headline text="Sonsuz sekme." frame={frame} start={36} end={T.fly - 2} size={118} y={1030} accent={[0, 1]} />
          </>
        ) : null}

        {/* B/C/D phone */}
        {frame >= T.phoneIn - 2 && frame < T.insightEnd + 30 ? (
          <Phone x={540} y={y} scale={s} rotate={rot}>
            <HomeScreen frame={frame} start={T.phoneIn + 8} pulse={pulse} focusRow={focusRow} />
            <div style={{ position: "absolute", inset: 0, background: C.ink, opacity: dim, pointerEvents: "none" }} />
          </Phone>
        ) : null}

        {/* B caption */}
        {frame >= T.homeCaption && frame < T.sources + 20 ? (
          <>
            <Eyebrow text="Ana ekran" frame={frame} start={T.homeCaption} end={T.sources - 4} y={150} />
            <Headline text="Hepsi tek ekranda." frame={frame} start={T.homeCaption + 4} end={T.sources - 6} size={84} y={240} accent={[2]} />
          </>
        ) : null}

        {/* C sources */}
        {frame >= T.sources && frame < T.sourcesEnd + 20 ? (
          <>
            <Sources frame={frame} start={T.sources + 6} end={T.sourcesEnd} phoneTop={phoneTop} />
            <Eyebrow text="Bağlantılar" frame={frame} start={T.sources + 2} end={T.sourcesEnd - 4} y={130} />
            <Headline text="Tüm kaynaklar, tek akış." frame={frame} start={T.sources + 6} end={T.sourcesEnd - 6} size={70} y={220} accent={[2, 3]} maxWidth={1000} />
          </>
        ) : null}

        {/* D insight */}
        {frame >= T.insight - 4 && frame < T.insightEnd + 24 ? (
          <>
            <Eyebrow text="Claude" frame={frame} start={T.insight - 2} end={T.insightEnd - 4} y={120} />
            <Headline text="Okur, not alır, uyarır." frame={frame} start={T.insight + 2} end={T.insightEnd - 6} size={78} y={210} accent={[3]} />
            <Insight frame={frame} start={T.insight + 6} typeStart={T.typeStart} end={T.insightEnd} />
          </>
        ) : null}

        {/* E end card */}
        {frame >= T.end ? <EndCard frame={frame} start={T.end} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
