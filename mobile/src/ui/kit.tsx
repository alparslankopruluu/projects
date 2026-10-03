import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MAX_WIDTH, font, radius, softShadow, space, usePalette } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const p = usePalette();
  return <Ionicons name={name} size={size} color={color ?? p.ink} />;
}

type Variant = "display" | "title" | "heading" | "body" | "label" | "caption" | "number";

const VARIANT: Record<Variant, object> = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: "800", letterSpacing: -1, fontFamily: font.display },
  title: { fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.6, fontFamily: font.display },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.2, fontFamily: font.body },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400", fontFamily: font.body },
  label: { fontSize: 13, lineHeight: 17, fontWeight: "600", fontFamily: font.body },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: font.body },
  number: { fontSize: 44, lineHeight: 48, fontWeight: "800", letterSpacing: -2, fontFamily: font.display, fontVariant: ["tabular-nums"] },
};

export function Txt({ variant = "body", tone = "ink", style, ...rest }: TextProps & { variant?: Variant; tone?: "ink" | "soft" | "faint" | "inverse" | string }) {
  const p = usePalette();
  const color = tone === "ink" ? p.ink : tone === "soft" ? p.inkSoft : tone === "faint" ? p.inkFaint : tone === "inverse" ? p.onInverse : tone;
  return <Text {...rest} style={[VARIANT[variant], { color }, style]} />;
}

export function tap() {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
}

// Page shell: warm background, centered column on wide web screens, optional back header.
export function Screen({ children, title, subtitle, back = true, right }: { children: ReactNode; title?: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120, alignItems: "center" }}
        showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, gap: space.lg }}>
          {title ? (
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {back ? <RoundButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : <View />}
                {right}
              </View>
              <Animated.View entering={FadeInDown.duration(420)}>
                <Txt variant="display">{title}</Txt>
                {subtitle ? (
                  <Txt tone="soft" style={{ marginTop: 4 }}>
                    {subtitle}
                  </Txt>
                ) : null}
              </Animated.View>
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function RoundButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label?: string }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? icon}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.round, { backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 }, softShadow(p)]}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

export function Button({
  label,
  icon,
  onPress,
  tone = "primary",
  busy,
  disabled,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "primary" | "ghost" | "onInverse";
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const primary = tone === "primary";
  const fg = primary ? p.onInverse : tone === "onInverse" ? p.inverse : p.ink;
  const bg = primary ? p.inverse : tone === "onInverse" ? p.onInverse : p.surfaceMuted;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Txt variant="label" tone={fg}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Pill({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : <View style={[styles.dot, { backgroundColor: color }]} />}
      <Txt variant="caption" tone={color} style={{ fontWeight: "700" }}>
        {label}
      </Txt>
    </View>
  );
}

export function Section({ title, action, onAction, children, delay = 0 }: { title: string; action?: string; onAction?: () => void; children: ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(480)} style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Txt variant="heading">{title}</Txt>
        {action && onAction ? (
          <Pressable onPress={onAction} hitSlop={10}>
            <Txt variant="label" tone="soft">
              {action}
            </Txt>
          </Pressable>
        ) : null}
      </View>
      {children}
    </Animated.View>
  );
}

export function Surface({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  const p = usePalette();
  return <View style={[{ backgroundColor: p.surface, borderRadius: radius.lg, padding: padded ? space.lg : 0 }, softShadow(p), style]}>{children}</View>;
}

export function Empty({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const p = usePalette();
  return (
    <Surface style={{ alignItems: "center", gap: space.sm, paddingVertical: space.xxl }}>
      <View style={[styles.round, { backgroundColor: p.surfaceMuted }]}>
        <Icon name={icon} color={p.inkSoft} />
      </View>
      <Txt variant="heading">{title}</Txt>
      <Txt tone="soft" style={{ textAlign: "center" }}>
        {body}
      </Txt>
    </Surface>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.line }} />;
}

const styles = StyleSheet.create({
  round: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  button: { height: 50, borderRadius: radius.pill, paddingHorizontal: space.xl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export function Field(props: ComponentProps<typeof TextInput>) {
  const p = usePalette();
  return (
    <TextInput
      placeholderTextColor={p.inkFaint}
      {...props}
      style={[
        { minHeight: 48, borderRadius: radius.md - 4, backgroundColor: p.surfaceMuted, color: p.ink, paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: 15, fontFamily: font.body },
        props.style,
      ]}
    />
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: selected ? p.inverse : p.surfaceMuted }}>
      {color ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} /> : null}
      <Txt variant="label" tone={selected ? "inverse" : "ink"}>
        {label}
      </Txt>
    </Pressable>
  );
}
