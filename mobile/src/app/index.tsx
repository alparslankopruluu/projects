import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/data/store";
import { greeting, inboxCounts, isUnfinished, portfolioMetric, progressOf, stageCounts, todaysFocus } from "@/domain/derive";
import { STAGE_LABEL } from "@/domain/model";
import { Button, Icon, RoundButton, Section, tap, Txt } from "@/ui/kit";
import { Blob, CountUp, PulseDot, Ring, Segments, SoftCard } from "@/ui/motion";
import { MAX_WIDTH, STAGE_COLOR, accent, hueGradient, hueInk, hueSolid, radius, softShadow, space, usePalette } from "@/ui/theme";

const TODAY = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" });

export default function Home() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { projects, signals, metrics, insight, status } = store;

  const view = useMemo(() => {
    const active = projects.filter((item) => !item.archived).sort((a, b) => a.priority - b.priority);
    const stages = stageCounts(active);
    const unfinished = active.filter((item) => isUnfinished(item));
    const inbox = inboxCounts(signals);
    const revenue = portfolioMetric(metrics, "revenue");
    return { active, stages, unfinished, inbox, revenue, focus: todaysFocus(active, signals, insight) };
  }, [projects, signals, metrics, insight]);

  const { active, stages, unfinished, inbox, revenue, focus } = view;
  const focusProject = focus?.projectId ? active.find((item) => item.id === focus.projectId) : undefined;
  const liveRatio = active.length ? stages.live / active.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Blob color={accent.violet} size={260} top={-90} left={-60} />
        <Blob color={accent.coral} size={220} top={-40} left={220} duration={9000} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 120, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, gap: space.xl }}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <View style={{ flex: 1 }}>
              <Txt variant="label" tone="soft" style={{ textTransform: "capitalize" }}>
                {TODAY.format(new Date())}
              </Txt>
              <Txt variant="display">{greeting()}</Txt>
            </View>
            <RoundButton icon="person-circle-outline" label="Hesap" onPress={() => router.push("/settings")} />
          </Animated.View>

          {/* The four questions, answered at a glance. Every card opens its own detail page. */}
          <View style={{ gap: space.md }}>
            <View style={styles.row}>
              <SoftCard index={0} colors={hueGradient(262, p.dark)} style={styles.cell} label="Uygulamalar" onPress={() => router.push("/apps")}>
                <CardHead icon="apps" title="Uygulamalar" hue={262} />
                <CountUp value={active.length} tone={hueInk(262, p.dark)} />
                <Segments parts={(["live", "review", "building", "idea", "paused"] as const).map((key) => ({ value: stages[key], color: STAGE_COLOR[key] }))} />
                <Txt variant="caption" tone="soft" style={{ marginTop: 6 }}>
                  {stages.live} yayında · {stages.review} incelemede
                </Txt>
              </SoftCard>

              <SoftCard index={1} colors={hueGradient(34, p.dark)} style={styles.cell} label="Yarım kalanlar" onPress={() => router.push("/unfinished")}>
                <CardHead icon="hourglass-outline" title="Yarım kalan" hue={34} />
                <CountUp value={unfinished.length} tone={hueInk(34, p.dark)} delay={220} />
                <Txt variant="caption" tone="soft" numberOfLines={2}>
                  {unfinished.length ? unfinished.slice(0, 3).map((item) => item.name).join(", ") : "Hepsi yolunda"}
                </Txt>
              </SoftCard>
            </View>

            <View style={styles.row}>
              <SoftCard index={2} colors={hueGradient(8, p.dark)} style={styles.cell} label="Bildirimler" onPress={() => router.push("/inbox")}>
                <CardHead icon="notifications-outline" title="Bildirim" hue={8} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <CountUp value={inbox.unread} tone={hueInk(8, p.dark)} delay={290} />
                  {inbox.critical > 0 ? <PulseDot color={accent.coral} /> : null}
                </View>
                <Txt variant="caption" tone="soft">
                  {inbox.critical > 0 ? `${inbox.critical} kritik bekliyor` : inbox.unread ? "Okunmamış" : "Sessiz"}
                </Txt>
              </SoftCard>

              <SoftCard index={3} colors={hueGradient(158, p.dark)} style={styles.cell} label="Analitik" onPress={() => router.push("/analytics")}>
                <CardHead icon="stats-chart-outline" title="Analitik" hue={158} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginTop: 4 }}>
                  <Ring ratio={liveRatio} size={58} stroke={7} color={hueSolid(158)} track={p.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} delay={350}>
                    <Txt variant="label" tone={hueInk(158, p.dark)}>
                      %{Math.round(liveRatio * 100)}
                    </Txt>
                  </Ring>
                  <View style={{ flex: 1 }}>
                    <Txt variant="caption" tone="soft">
                      yayında
                    </Txt>
                  </View>
                </View>
                <Txt variant="caption" tone="soft" style={{ marginTop: 6 }}>
                  {revenue ? `Gelir ${formatMoney(revenue.value)}` : "Gelir bağlı değil"}
                </Txt>
              </SoftCard>
            </View>
          </View>

          {focus ? (
            <Animated.View entering={FadeInDown.delay(420).springify().damping(16)}>
              <View style={[styles.focus, { backgroundColor: p.inverse }, softShadow(p)]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name={focus.source === "claude" ? "sparkles" : "flag"} size={14} color={accent.amber} />
                    <Txt variant="caption" tone={p.dark ? "#6F6B78" : "#B4B0BC"} style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                      {focus.source === "claude" ? "Claude · bugünün odağı" : "Bugünün odağı"}
                    </Txt>
                  </View>
                  {focusProject ? (
                    <Pressable onPress={() => router.push(`/apps/${focusProject.id}`)} hitSlop={8} style={[styles.chip, { backgroundColor: hueSolid(focusProject.hue) }]}>
                      <Txt variant="caption" tone="#fff" style={{ fontWeight: "700" }}>
                        {focusProject.name}
                      </Txt>
                    </Pressable>
                  ) : null}
                </View>
                {insight?.headline && focus.source === "claude" ? (
                  <Txt variant="caption" tone={p.dark ? "#6F6B78" : "#B4B0BC"}>
                    {insight.headline}
                  </Txt>
                ) : null}
                <Txt variant="title" tone="inverse">
                  {focus.action}
                </Txt>
                <Txt tone={p.dark ? "#5E5B66" : "#B4B0BC"}>{focus.why}</Txt>
                <Button
                  label={store.mode === "cloud" ? "Claude ile yeniden analiz et" : "Claude analizi için giriş yap"}
                  icon="sparkles-outline"
                  tone="onInverse"
                  busy={status.busy === "analyze"}
                  onPress={() => (store.mode === "cloud" ? void store.analyze() : router.push("/settings"))}
                  style={{ marginTop: space.sm }}
                />
                {status.error ? (
                  <Txt variant="caption" tone={accent.coral}>
                    {status.error}
                  </Txt>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          <Section title="Projeler" action="Tümü" onAction={() => router.push("/apps")} delay={520}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
              {active.map((project, index) => {
                const progress = progressOf(project);
                return (
                  <SoftCard key={project.id} index={index + 6} colors={hueGradient(project.hue, p.dark)} style={{ width: 148, height: 168 }} label={project.name} onPress={() => router.push(`/apps/${project.id}`)}>
                    <Ring ratio={progress.ratio} size={44} stroke={5} color={hueSolid(project.hue)} track="rgba(0,0,0,0.06)" delay={600 + index * 60}>
                      <Txt variant="caption" tone={hueInk(project.hue, p.dark)} style={{ fontWeight: "800" }}>
                        {project.name.slice(0, 1)}
                      </Txt>
                    </Ring>
                    <View style={{ flex: 1 }} />
                    <Txt variant="heading" numberOfLines={1}>
                      {project.name}
                    </Txt>
                    <Txt variant="caption" tone={hueInk(project.hue, p.dark)}>
                      {STAGE_LABEL[project.stage]} · {progress.done}/{progress.total}
                    </Txt>
                  </SoftCard>
                );
              })}
            </ScrollView>
          </Section>
        </View>
      </ScrollView>

      <Animated.View entering={ZoomIn.delay(700).springify()} style={[styles.fab, { bottom: insets.bottom + space.xl }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni ekle"
          onPress={() => {
            tap();
            router.push("/new");
          }}
          style={({ pressed }) => [styles.fabInner, { backgroundColor: p.inverse, transform: [{ scale: pressed ? 0.92 : 1 }] }, softShadow(p)]}>
          <Icon name="add" size={28} color={p.onInverse} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function CardHead({ icon, title, hue }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; hue: number }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <Txt variant="label" tone={hueInk(hue, p.dark)}>
        {title}
      </Txt>
      <View style={[styles.cardIcon, { backgroundColor: p.dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)" }]}>
        <Icon name={icon} size={15} color={hueInk(hue, p.dark)} />
      </View>
    </View>
  );
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  row: { flexDirection: "row", gap: space.md },
  cell: { flex: 1, height: 172 },
  cardIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  focus: { borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  fab: { position: "absolute", right: space.xl },
  fabInner: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
});
