import { interpolate, spring, Easing } from "remotion";
import { FPS } from "./theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Gentle, slightly underdamped spring used for entrances. */
export const enter = (frame: number, delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 16, stiffness: 120, mass: 0.9, ...config },
  });

/** Critically damped spring for moves that should settle without overshoot. */
export const glide = (frame: number, delay = 0, durationInFrames?: number) =>
  spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 200 },
    durationInFrames,
  });

export const fade = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.bezier(0.33, 0, 0.2, 1) });

export const fadeOut = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [1, 0], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });

/** Slow sinusoidal float so resting cards never feel frozen. */
export const float = (frame: number, seed = 0, amp = 8, period = 110) =>
  Math.sin(((frame + seed * 37) / period) * Math.PI * 2) * amp;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo-random in [0,1) for layout seeds. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
