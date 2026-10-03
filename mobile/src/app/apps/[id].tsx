import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/data/store";
import { daysSince, latestMetric, momentOf, progressOf, sortSignals, type Moment } from "@/domain/derive";
import { METRIC_LABEL, SOURCE_LABEL, STAGE_LABEL, type MetricKey, type Stage } from "@/domain/model";
import { Button, Chip, Divider, Empty, Field, Icon, Pill, RoundButton, Section, Surface, tap, Txt } from "@/ui/kit";
import { Ring } from "@/ui/motion";
import { SignalRow } from "@/ui/rows";
import { MAX_WIDTH, STAGE_COLOR, accent, hueGradient, hueInk, hueSolid, radius, space, usePalette } from "@/ui/theme";

const STAGES: Stage[] = ["idea", "building", "review", "live", "paused"];
const METRICS: MetricKey[] = ["downloads", "revenue", "activeUsers", "crashFree", "rating", "trials"];
const MOMENTS: { key: Moment; label: string }[] = [
  { key: "start", label: "Başlangıç" },
  { key: "middle", label: "Ortası" },
  { key: "end", label: "Yayın" },
];

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const project = store.projects.find((item) => item.id === id);
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [metricKey, setMetricKey] = useState<MetricKey>("downloads");
  const [metricValue, setMetricValue] = useState("");

  const timeline = useMemo(() => {
    const events = store.events
      .filter((item) => item.projectId === id)
      .map((item) => ({ key: item.id, at: item.at, title: `${SOURCE_LABEL[item.source]} · ${item.kind.replace("_", " ")} ${item.version}`, body: item.detail, icon: "storefront-outline" as const }));
    const commits = store.commits
      .filter((item) => item.projectId === id)
      .map((item) => ({ key: item.sha, at: item.at, title: item.message.split("\n")[0], body: `${item.repo} · ${item.sha.slice(0, 7)}`, icon: "git-commit-outline" as const }));
    return [...events, ...commits].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  }, [store.events, store.commits, id]);

  if (!project) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, padding: space.xl, paddingTop: insets.top + space.xl }}>
        <Empty icon="help-circle-outline" title="Proje bulunamadı" body="Silinmiş ya da başka bir hesapta olabilir." />
      </View>
    );
  }

  const progress = progressOf(project);
  const moment = momentOf(project);
  const signals = sortSignals(store.signals.filter((item) => item.projectId === project.id));
  const ink = hueInk(project.hue, p.dark);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={hueGradient(project.hue, p.dark)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + space.md }]}>
          <View style={{ width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, gap: space.lg }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <RoundButton icon="chevron-back" label="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
              <RoundButton icon="film-outline" label="Aşama videosu" onPress={() => router.push(`/video/${project.id}`)} />
            </View>
            <Animated.View entering={FadeInDown.duration(450)} style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
              <Ring ratio={progress.ratio} size={84} stroke={9} color={hueSolid(project.hue)} track="rgba(255,255,255,0.55)">
                <Txt variant="heading" tone={ink}>
                  %{Math.round(progress.ratio * 100)}
                </Txt>
              </Ring>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="display" tone={ink} numberOfLines={1}>
                  {project.name}
                </Txt>
                <Txt tone={ink} style={{ opacity: 0.75 }}>
                  {project.tagline}
                </Txt>
              </View>
            </Animated.View>

            {/* Start → middle → launch: the same arc the stage video renders. */}
            <View style={styles.moments}>
              {MOMENTS.map((item, index) => {
                const reached = MOMENTS.findIndex((entry) => entry.key === moment) >= index;
                return (
                  <View key={item.key} style={{ flex: 1, gap: 6 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: reached ? hueSolid(project.hue) : "rgba(255,255,255,0.5)" }} />
                    <Txt variant="caption" tone={ink} style={{ fontWeight: item.key === moment ? "800" : "500" }}>
                      {item.label}
                    </Txt>
                  </View>
                );
              })}
            </View>
          </View>
        </LinearGradient>

        <View style={{ width: "100%", maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, gap: space.xl, marginTop: -space.xl }}>
          <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
            <Surface style={{ gap: space.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Txt variant="caption" tone="soft" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                  Sıradaki adım
                </Txt>
                <Pill label={STAGE_LABEL[project.stage]} color={STAGE_COLOR[project.stage]} />
              </View>
              <Txt variant="title">{project.nextStep}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {STAGES.map((stage) => (
                  <Chip key={stage} label={STAGE_LABEL[stage]} color={STAGE_COLOR[stage]} selected={project.stage === stage} onPress={() => store.updateProject(project.id, { stage })} />
                ))}
              </View>
              <Txt variant="caption" tone="faint">
                Son hareket {daysSince(project.lastActivityAt) === 0 ? "bugün" : `${daysSince(project.lastActivityAt)} gün önce`} · {project.platforms.map((item) => `${item.os} ${item.version}`).join(" · ") || "platform yok"}
              </Txt>
            </Surface>
          </Animated.View>

          {signals.length ? (
            <Section title="Bildirimler" delay={160}>
              <View style={{ gap: space.sm }}>
                {signals.slice(0, 3).map((signal, index) => (
                  <SignalRow key={signal.id} signal={signal} index={index} onPress={() => store.markRead(signal.id)} />
                ))}
              </View>
            </Section>
          ) : null}

          <Section title={`Yapılacaklar · ${progress.done}/${progress.total}`} delay={200}>
            <Surface padded={false}>
              {project.checks.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => {
                      tap();
                      store.toggleCheck(project.id, item.id);
                    }}
                    style={styles.check}>
                    <View style={[styles.box, { borderColor: item.done ? accent.mint : p.inkFaint, backgroundColor: item.done ? accent.mint : "transparent" }]}>
                      {item.done ? <Icon name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Txt style={{ flex: 1, textDecorationLine: item.done ? "line-through" : "none" }} tone={item.done ? "faint" : "ink"}>
                      {item.label}
                    </Txt>
                    <Txt variant="caption" tone="faint">
                      {item.owner === "you" ? "sende" : item.owner === "store" ? "mağazada" : "sonra"}
                    </Txt>
                  </Pressable>
                </View>
              ))}
              <Divider />
              <View style={{ flexDirection: "row", gap: space.sm, padding: space.md }}>
                <Field value={task} onChangeText={setTask} placeholder="Yeni iş ekle" style={{ flex: 1 }} onSubmitEditing={() => submitTask()} returnKeyType="done" />
                <RoundButton icon="add" label="İş ekle" onPress={() => submitTask()} />
              </View>
            </Surface>
          </Section>

          <Section title="Metrikler" delay={240}>
            <View style={styles.grid}>
              {METRICS.map((key) => {
                const row = latestMetric(store.metrics, project.id, key);
                const delta = row && row.previous !== null ? row.value - row.previous : null;
                return (
                  <Surface key={key} style={styles.metric}>
                    <Txt variant="caption" tone="soft">
                      {METRIC_LABEL[key]}
                    </Txt>
                    <Txt variant="title" tone={row ? "ink" : "faint"}>
                      {row ? formatMetric(key, row.value) : "—"}
                    </Txt>
                    <Txt variant="caption" tone={delta === null ? "faint" : delta >= 0 ? accent.mint : accent.coral}>
                      {row ? (delta === null ? SOURCE_LABEL[row.source] : `${delta >= 0 ? "▲" : "▼"} ${formatMetric(key, Math.abs(delta))}`) : "bağlı değil"}
                    </Txt>
                  </Surface>
                );
              })}
            </View>
            <Surface style={{ gap: space.md }}>
              <Txt variant="label">Elle gir</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {METRICS.map((key) => (
                  <Chip key={key} label={METRIC_LABEL[key]} selected={metricKey === key} onPress={() => setMetricKey(key)} />
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <Field value={metricValue} onChangeText={setMetricValue} keyboardType="decimal-pad" placeholder="Değer" style={{ flex: 1 }} />
                <Button label="Kaydet" onPress={submitMetric} disabled={!metricValue.trim()} />
              </View>
            </Surface>
          </Section>

          <Section title="Kaynaklar" action="Bağla" onAction={() => router.push(`/sources?projectId=${project.id}`)} delay={280}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {project.connections.length === 0 ? (
                <Txt tone="soft">Henüz kaynak yok.</Txt>
              ) : (
                project.connections.map((item) => (
                  <View key={`${item.kind}:${item.ref}`} style={[styles.source, { backgroundColor: p.surface }]}>
                    <Txt variant="label">{SOURCE_LABEL[item.kind]}</Txt>
                    <Txt variant="caption" tone="faint" numberOfLines={1} style={{ maxWidth: 160 }}>
                      {item.ref || (item.mode === "manual" ? "elle" : "ayarlanmadı")}
                    </Txt>
                  </View>
                ))
              )}
            </View>
          </Section>

          <Section title="Akış" delay={320}>
            {timeline.length === 0 ? (
              <Empty icon="git-branch-outline" title="Akış boş" body="GitHub, Vercel ve App Store bağlanınca commit, deploy ve inceleme olayları burada sıralanır." />
            ) : (
              <Surface padded={false}>
                {timeline.map((item, index) => (
                  <View key={item.key}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.check}>
                      <Icon name={item.icon} size={18} color={p.inkSoft} />
                      <View style={{ flex: 1 }}>
                        <Txt numberOfLines={1}>{item.title}</Txt>
                        <Txt variant="caption" tone="faint" numberOfLines={1}>
                          {item.body}
                        </Txt>
                      </View>
                      <Txt variant="caption" tone="faint">
                        {item.at.slice(5, 10)}
                      </Txt>
                    </View>
                  </View>
                ))}
              </Surface>
            )}
          </Section>

          <Section title="Notlar" delay={360}>
            <Surface style={{ gap: space.md }}>
              <Field value={note} onChangeText={setNote} placeholder="Bir sonraki oturum ne bilmeli?" multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
              <Button label="Not ekle" icon="create-outline" onPress={submitNote} disabled={!note.trim()} />
            </Surface>
            {project.notes.map((item) => (
              <Surface key={item.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name={item.author === "claude" ? "sparkles" : "person-outline"} size={14} color={item.author === "claude" ? accent.violet : p.inkSoft} />
                  <Txt variant="caption" tone="faint">
                    {item.author === "claude" ? "Claude" : "Sen"} · {item.createdAt.slice(0, 10)}
                  </Txt>
                </View>
                <Txt>{item.body}</Txt>
              </Surface>
            ))}
          </Section>
        </View>
      </ScrollView>
    </View>
  );

  function submitTask() {
    const label = task.trim();
    if (!label || !project) return;
    store.addCheck(project.id, label, "you");
    setTask("");
  }

  function submitNote() {
    const body = note.trim();
    if (!body || !project) return;
    store.addNote(project.id, body);
    setNote("");
  }

  function submitMetric() {
    const value = Number(metricValue.replace(",", "."));
    if (!Number.isFinite(value) || !project) return;
    store.addMetric(project.id, metricKey, value);
    setMetricValue("");
  }
}

export function formatMetric(key: MetricKey, value: number) {
  if (key === "revenue") return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (key === "crashFree") return `%${value.toFixed(1)}`;
  if (key === "rating") return value.toFixed(1);
  return new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(value);
}

const styles = StyleSheet.create({
  hero: { width: "100%", alignItems: "center", paddingBottom: space.xxl + space.lg, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  moments: { flexDirection: "row", gap: space.sm },
  check: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  metric: { width: "31.5%", flexGrow: 1, gap: 2, padding: space.md },
  source: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md - 4, gap: 2 },
});
