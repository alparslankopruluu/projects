import { loadFont } from "@remotion/google-fonts/Inter";

const inter = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

export const FONT = inter.fontFamily;

export const C = {
  bg: "#F6F4EF",
  ink: "#16151A",
  inkSoft: "rgba(22,21,26,0.62)",
  inkFaint: "rgba(22,21,26,0.38)",
  line: "rgba(22,21,26,0.08)",
  coral: "#FF6B4A",
  violet: "#7C5CFF",
  mint: "#2BC48A",
  amber: "#FFB020",
  white: "#FFFFFF",
} as const;

/** Hue anchors for the four accents, used when a card needs a pastel tint. */
export const HUE = {
  coral: 12,
  violet: 254,
  mint: 155,
  amber: 40,
  sky: 205,
  rose: 335,
} as const;

export const RADIUS = 28;

/** Soft pastel card surface driven by a single hue. */
export const softCard = (hue: number, angle = 145): string =>
  `linear-gradient(${angle}deg, hsl(${hue} 70% 94%) 0%, hsl(${(hue + 18) % 360} 70% 88%) 100%)`;

/** Deeper ink tone for text that sits on a soft card of the same hue. */
export const hueInk = (hue: number): string => `hsl(${hue} 45% 26%)`;
export const hueStrong = (hue: number): string => `hsl(${hue} 78% 58%)`;

export const cardShadow =
  "0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 40px -18px rgba(22,21,26,0.22), 0 4px 12px -6px rgba(22,21,26,0.10)";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
