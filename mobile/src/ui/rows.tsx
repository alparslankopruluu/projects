import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { daysSince, progressOf } from "@/domain/derive";
import { SOURCE_LABEL, STAGE_LABEL, type Project, type Severity, type Signal } from "@/domain/model";

import { Icon, Pill, tap, Txt, type IconName } from "./kit";
import { Ring } from "./motion";
import { SEVERITY_COLOR, STAGE_COLOR, hueGradient, hueInk, hueSolid, radius, softShadow, space, usePalette } from "./theme";

export function ProjectRow({ project, index = 0, detail }: { project: Project; index?: number; detail?: string }) {
  const p = usePalette();
  const progress = progressOf(project);
  const [from] = hueGradient(project.hue, p.dark);
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 45).springify().damping(18)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tap();
          router.push(`/apps/${project.id}`);
        }}
        style={({ pressed }) => [styles.row, { backgroundColor: p.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }, softShadow(p)]}>
        <View style={[styles.badge, { backgroundColor: from }]}>
          <Ring ratio={progress.ratio} size={46} stroke={4} color={hueSolid(project.hue)} track="rgba(0,0,0,0.06)" delay={200 + index * 40}>
            <Txt variant="heading" tone={hueInk(project.hue, p.dark)}>
              {project.name.slice(0, 1)}
            </Txt>
          </Ring>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading" numberOfLines={1}>
            {project.name}
          </Txt>
          <Txt variant="caption" tone="soft" numberOfLines={1}>
            {detail ?? project.nextStep}
          </Txt>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Pill label={STAGE_LABEL[project.stage]} color={STAGE_COLOR[project.stage]} />
          <Txt variant="caption" tone="faint">
            {daysSince(project.lastActivityAt) === 0 ? "bugün" : `${daysSince(project.lastActivityAt)} gün önce`}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const SEVERITY_ICON: Record<Severity, IconName> = {
  critical: "alert-circle",
  warning: "warning",
  info: "information-circle",
  success: "checkmark-circle",
};

export function SignalRow({ signal, projectName, index = 0, onPress }: { signal: Signal; projectName?: string; index?: number; onPress?: () => void }) {
  const p = usePalette();
  const color = SEVERITY_COLOR[signal.severity];
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 45).springify().damping(18)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tap();
          onPress?.();
        }}
        style={({ pressed }) => [styles.row, { backgroundColor: p.surface, opacity: signal.read ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, softShadow(p)]}>
        <View style={[styles.icon, { backgroundColor: `${color}1f` }]}>
          <Icon name={SEVERITY_ICON[signal.severity]} color={color} size={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading">{signal.title}</Txt>
          {signal.body ? (
            <Txt variant="caption" tone="soft">
              {signal.body}
            </Txt>
          ) : null}
          <Txt variant="caption" tone="faint">
            {[SOURCE_LABEL[signal.source], projectName].filter(Boolean).join(" · ")}
          </Txt>
        </View>
        {!signal.read ? <View style={[styles.unread, { backgroundColor: color }]} /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md + 2 },
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  unread: { width: 8, height: 8, borderRadius: 4 },
});
