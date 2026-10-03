import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/data/store";
import { momentOf, progressOf, type Moment } from "@/domain/derive";
import { Icon, RoundButton, Txt } from "@/ui/kit";
import { Ring } from "@/ui/motion";
import { MAX_WIDTH, accent, hueGradient, hueInk, hueSolid, radius, space, usePalette } from "@/ui/theme";

const SCENES: Moment[] = ["start", "middle", "end"];
const SCENE_MS = 3200;
const LABEL: Record<Moment, string> = { start: "Başlangıç", middle: "Ortası", end: "Yayın" };

// A live, code-driven version of the Remotion ProjectStage video (video/src). Same beats, rendered on device.
export default function StageStory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const project = useStore().projects.find((item) => item.id === id);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setScene((value) => (value + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(timer);
  }, [playing]);

  if (!project) return null;
  const moment = SCENES[scene];
  const current = momentOf(project);
  const progress = progressOf(project);
  const ink = hueInk(project.hue, p.dark);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={hueGradient(project.hue, p.dark)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <RoundButton icon="close" label="Kapat" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/apps/${project.id}`))} />
            <RoundButton icon={playing ? "pause" : "play"} label={playing ? "Durdur" : "Oynat"} onPress={() => setPlaying((value) => !value)} />
          </View>

          <View style={styles.progress}>
            {SCENES.map((item, index) => (
              <Pressable key={item} style={{ flex: 1, gap: 6 }} onPress={() => setScene(index)}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: index <= scene ? ink : "rgba(255,255,255,0.5)" }} />
                <Txt variant="caption" tone={ink} style={{ fontWeight: item === current ? "800" : "500" }}>
                  {LABEL[item]}
                  {item === current ? " · şimdi" : ""}
                </Txt>
              </Pressable>
            ))}
          </View>

          <Animated.View key={moment} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={{ flex: 1, justifyContent: "center", gap: space.xl }}>
            {moment === "start" ? (
              <>
                <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.icon, { backgroundColor: hueSolid(project.hue) }]}>
                  <Txt variant="display" tone="#fff" style={{ fontSize: 56, lineHeight: 64 }}>
                    {project.name.slice(0, 1)}
                  </Txt>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(250).springify()}>
                  <Txt variant="caption" tone={ink} style={{ letterSpacing: 2, textTransform: "uppercase" }}>
                    Gün 1 · {project.startedAt.slice(0, 10)}
                  </Txt>
                  <Txt variant="display" tone={ink} style={{ fontSize: 48, lineHeight: 52 }}>
                    {project.name}
                  </Txt>
                  <Txt variant="heading" tone={ink} style={{ opacity: 0.75 }}>
                    {project.tagline}
                  </Txt>
                </Animated.View>
              </>
            ) : moment === "middle" ? (
              <>
                <Animated.View entering={ZoomIn.springify()} style={{ alignSelf: "flex-start" }}>
                  <Ring ratio={progress.ratio} size={150} stroke={14} color={hueSolid(project.hue)} track="rgba(255,255,255,0.5)" delay={150}>
                    <Txt variant="number" tone={ink}>
                      %{Math.round(progress.ratio * 100)}
                    </Txt>
                  </Ring>
                </Animated.View>
                <View style={{ gap: space.sm }}>
                  {project.checks.slice(0, 5).map((item, index) => (
                    <Animated.View key={item.id} entering={FadeInUp.delay(300 + index * 180).springify()} style={[styles.check, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
                      <Icon name={item.done ? "checkmark-circle" : "ellipse-outline"} size={20} color={item.done ? accent.mint : ink} />
                      <Txt variant="label" tone={p.dark ? "#16151A" : ink}>
                        {item.label}
                      </Txt>
                    </Animated.View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Animated.View entering={FadeInDown.springify()}>
                  <Txt variant="caption" tone={ink} style={{ letterSpacing: 2, textTransform: "uppercase" }}>
                    {project.stage === "live" ? "Yayında" : "Hedef"}
                  </Txt>
                  <Txt variant="display" tone={ink} style={{ fontSize: 44, lineHeight: 48 }}>
                    {project.stage === "live" ? `${project.name} kullanıcılarda.` : project.nextStep}
                  </Txt>
                </Animated.View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                  {(project.platforms.length ? project.platforms : [{ os: "ios", version: "—", status: "" }]).map((item, index) => (
                    <Animated.View key={item.os} entering={ZoomIn.delay(250 + index * 140).springify().damping(10)} style={[styles.platform, { backgroundColor: hueSolid(project.hue) }]}>
                      <Icon name={item.os === "ios" ? "logo-apple" : item.os === "android" ? "logo-android" : "globe-outline"} size={18} color="#fff" />
                      <Txt variant="label" tone="#fff">
                        {item.version}
                      </Txt>
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>

          <Txt variant="caption" tone={ink} style={{ textAlign: "center", opacity: 0.7 }}>
            MP4 için: video/ klasöründe npm run render:stage
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  icon: { width: 112, height: 112, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  check: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md },
  platform: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill },
});
