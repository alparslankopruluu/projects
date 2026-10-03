import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { Kickoff, KICKOFF_DURATION } from "./Kickoff";
import { ProjectStage, STAGE_DURATION, defaultStageProps } from "./ProjectStage";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Kickoff" component={Kickoff} durationInFrames={KICKOFF_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition
      id="ProjectStage"
      component={ProjectStage}
      durationInFrames={STAGE_DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultStageProps}
    />
  </>
);
