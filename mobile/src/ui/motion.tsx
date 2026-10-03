import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { tap, Txt } from "./kit";
import { radius, softShadow, space, usePalette } from "./theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The signature surface: a pastel gradient card that springs on press and staggers in.
export function SoftCard({
  colors,
  onPress,
  index = 0,
  style,
  children,
  label,
}: {
  colors: [string, string];
  onPress?: () => void;
  index?: number;
  style?: ViewStyle;
  children: ReactNode;
  label?: string;
}) {
  const p = usePalette();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).springify().damping(16)} style={[{ borderRadius: radius.lg }, softShadow(p), style]}>
      <AnimatedPressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={label}
        disabled={!onPress}
        onPressIn={() => {
          scale.set(withSpring(0.96, { damping: 18, stiffness: 320 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 12, stiffness: 220 }));
        }}
        onPress={() => {
          tap();
          onPress?.();
        }}
        style={[{ flex: 1, borderRadius: radius.lg, overflow: "hidden" }, animated]}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, padding: space.lg }}>{children}</View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function useCountUp(target: number, duration = 900, delay = 150) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (time: number) => {
        if (!start) start = time;
        const t = Math.min(1, (time - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(target * eased);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, duration, delay]);
  return value;
}

export function CountUp({ value, tone, suffix = "", decimals = 0, delay }: { value: number; tone?: string; suffix?: string; decimals?: number; delay?: number }) {
  const current = useCountUp(value, 900, delay);
  return (
    <Txt variant="number" tone={tone}>
      {current.toFixed(decimals)}
      {suffix}
    </Txt>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({ ratio, size = 64, stroke = 8, color, track, delay = 200, children }: { ratio: number; size?: number; stroke?: number; color: string; track?: string; delay?: number; children?: ReactNode }) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(Math.max(0, Math.min(1, ratio)), { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [ratio, delay, progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? p.line} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function PulseDot({ color, size = 10 }: { color: string; size?: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: color }, halo]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

// Slow drifting blob behind the header. Pure decoration; keeps the page from feeling static.
export function Blob({ color, size, top, left, duration = 7000 }: { color: string; size: number; top: number; left: number; duration?: number }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.set(withRepeat(withSequence(withTiming(1, { duration }), withTiming(0, { duration })), -1, false));
  }, [drift, duration]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value * 24 }, { translateY: drift.value * -18 }, { scale: 1 + drift.value * 0.08 }],
  }));
  const p = usePalette();
  const soften = Platform.OS === "web" ? ({ filter: "blur(48px)" } as object) : null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: p.dark ? 0.22 : 0.3 }, soften, style]}
    />
  );
}

// Stacked bar used for "where are my apps" at a glance.
export function Segments({ parts, height = 8 }: { parts: { value: number; color: string }[]; height?: number }) {
  const p = usePalette();
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <View style={{ flexDirection: "row", height, borderRadius: height, overflow: "hidden", backgroundColor: p.line, gap: 2 }}>
      {parts
        .filter((part) => part.value > 0)
        .map((part, index) => (
          <GrowBar key={index} flex={part.value / total} color={part.color} delay={200 + index * 90} />
        ))}
    </View>
  );
}

function GrowBar({ flex, color, delay }: { flex: number; color: string; delay: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(withDelay(delay, withSpring(flex, { damping: 18 })));
  }, [flex, delay, grow]);
  const style = useAnimatedStyle(() => ({ flex: grow.value }));
  return <Animated.View style={[{ backgroundColor: color }, style]} />;
}
