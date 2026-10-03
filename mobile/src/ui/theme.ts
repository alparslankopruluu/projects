import { Platform, useColorScheme } from "react-native";

import type { Severity, Stage } from "@/domain/model";

const light = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  surfaceMuted: "#EFECE5",
  ink: "#16151A",
  inkSoft: "#5E5B66",
  inkFaint: "#9A96A3",
  line: "rgba(22,21,26,0.08)",
  inverse: "#16151A",
  onInverse: "#F6F4EF",
  shadow: "rgba(40,30,20,0.10)",
};

const dark: typeof light = {
  bg: "#0E0D12",
  surface: "#1A1920",
  surfaceMuted: "#23222A",
  ink: "#F4F2EE",
  inkSoft: "#B4B0BC",
  inkFaint: "#6F6B78",
  line: "rgba(255,255,255,0.08)",
  inverse: "#F4F2EE",
  onInverse: "#16151A",
  shadow: "rgba(0,0,0,0.5)",
};

export const accent = {
  coral: "#FF6B4A",
  violet: "#7C5CFF",
  mint: "#2BC48A",
  amber: "#FFB020",
  sky: "#3AA0FF",
};

export type Palette = typeof light & { dark: boolean };

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? { ...dark, dark: true } : { ...light, dark: false };
}

// Soft card gradient for a project hue. Light mode is pastel, dark mode is a deep tint.
export function hueGradient(hue: number, isDark: boolean): [string, string] {
  if (isDark) return [`hsl(${hue}, 38%, 20%)`, `hsl(${(hue + 28) % 360}, 42%, 13%)`];
  return [`hsl(${hue}, 78%, 92%)`, `hsl(${(hue + 28) % 360}, 82%, 85%)`];
}

export function hueInk(hue: number, isDark: boolean) {
  return isDark ? `hsl(${hue}, 80%, 78%)` : `hsl(${hue}, 60%, 32%)`;
}

export function hueSolid(hue: number) {
  return `hsl(${hue}, 72%, 58%)`;
}

export const STAGE_COLOR: Record<Stage, string> = {
  idea: accent.violet,
  building: accent.amber,
  review: accent.sky,
  live: accent.mint,
  paused: "#9A96A3",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: accent.coral,
  warning: accent.amber,
  info: accent.sky,
  success: accent.mint,
};

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const font = {
  display: Platform.select({ ios: "ui-rounded", web: "'SF Pro Rounded', ui-rounded, system-ui, sans-serif", default: undefined }),
  body: Platform.select({ web: "Inter, ui-sans-serif, system-ui, sans-serif", default: undefined }),
};

export const MAX_WIDTH = 560;

export function softShadow(p: Palette) {
  return Platform.select({
    web: { boxShadow: `0 1px 2px ${p.shadow}, 0 12px 32px -12px ${p.shadow}` },
    default: {
      shadowColor: "#2a1e14",
      shadowOpacity: p.dark ? 0.4 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
  });
}
