import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";

import { useStore } from "@/data/store";
import { demandRank, sourceCoverage } from "@/domain/basket";
import { latestMetric, portfolioMetric, stageCounts } from "@/domain/derive";
import { METRIC_LABEL, SOURCE_LABEL, STAGE_LABEL, type MetricKey, type Stage } from "@/domain/model";
import { Icon, Screen, Section, Surface, Txt } from "@/ui/kit";
import { CountUp } from "@/ui/motion";
import { STAGE_COLOR, accent, hueSolid, space, usePalette } from "@/ui/theme";

import { formatMetric } from "./apps/[id]";

const TILES: MetricKey[] = ["revenue", "downloads", "activeUsers", "crashFree"];
const DAY = 86_400_000;

export default function Analytics() {
  const p = usePalette();
  const { projects, metrics, commits, events, insight } = useStore();
  const active = projects.filter((item) => !item.archived);
  const stages = stageCounts(active);

  const week = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const start = today.getTime() - (6 - index) * DAY;
      const count = commits.filter((item) => {
        const at = new Date(item.at).getTime();
        return at >= start && at < start + DAY;
      }).length;
      return { label: new Date(start).toLocaleDateString("tr-TR", { weekday: "narrow" }), count };
    });
  }, [commits]);

  const [since] = useState(() => Date.now() - 30 * DAY);
  const rejections = events.filter((item) => item.kind === "rejected" && new Date(item.at).getTime() > since).length;
  const failedDeploys = events.filter((item) => item.kind === "deploy_failed" && new Date(item.at).getTime() > since).length;
  const revenueRows = active
    .map((project) => ({ project, row: latestMetric(metrics, project.id, "revenue") }))
    .filter((item) => item.row)
    .sort((a, b) => (b.row?.value ?? 0) - (a.row?.value ?? 0));
  const maxRevenue = Math.max(1, ...revenueRows.map((item) => item.row?.value ?? 0));
  const maxCommits = Math.max(1, ...week.map((item) => item.count));
  const coverage = sourceCoverage(active);
  const demand = demandRank(active, metrics);

  return (
    <Screen title="Analitik" subtitle="Sadece bağlı ya da elle girilen veri. Tahmin yok.">
      <View style={styles.grid}>
        {TILES.map((key, index) => {
          const total = portfolioMetric(metrics, key);
          const value = key === "crashFree" && total ? total.value / total.sources : total?.value;
          return (
            <Pressable key={key} style={{ width: "48%", flexGrow: 1 }} onPress={() => !total && router.push("/sources")}>
              <Surface style={{ gap: 4 }}>
                <Txt variant="caption" tone="soft">
                  {METRIC_LABEL[key]}
                </Txt>
                {value !== undefined ? (
                  <Txt variant="title">{formatMetric(key, value)}</Txt>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28 }}>
                    <Icon name="link-outline" size={16} color={p.inkFaint} />
                    <Txt variant="label" tone="faint">
                      Bağlı değil
                    </Txt>
                  </View>
                )}
                <Txt variant="caption" tone="faint">
                  {total ? `${total.sources} projeden` : index === 0 ? "RevenueCat ya da elle" : "Bağla →"}
                </Txt>
              </Surface>
            </Pressable>
          );
        })}
      </View>

      <Section title="Mağaza ve para" delay={80}>
        <View style={{ gap: space.sm }}>
          {coverage.map((row) => (
            <Pressable key={row.kind} onPress={() => router.push("/sources")}>
              <Surface style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Txt variant="heading">{SOURCE_LABEL[row.kind]}</Txt>
                  <Txt variant="caption" tone={row.liveSync ? accent.mint : "faint"}>
                    {row.liveSync ? "API hazır" : "Şimdilik elle"}
                  </Txt>
                </View>
                <Txt variant="caption" tone="soft">
                  {row.api} otomatik · {row.manual} elle · {row.missing} bağlı değil
                </Txt>
              </Surface>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Talep" delay={100}>
        <Surface style={{ gap: space.md }}>
          <Txt variant="caption" tone="soft">
            Sadece girilmiş indirme, gelir veya aktif kullanıcı. Boş satır ölçülmüyor; sıra uydurulmaz.
          </Txt>
          {demand.map((row) => (
            <Pressable key={row.project.id} onPress={() => router.push(`/apps/${row.project.id}`)} style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Txt variant="label">{row.project.name}</Txt>
                <Txt variant="caption" tone={row.measured ? "soft" : "faint"}>
                  {row.measured ? "talep var" : "ölçülmüyor"}
                </Txt>
              </View>
              <Txt variant="caption" tone="faint">
                {row.measured
                  ? `${row.downloads ? formatMetric("downloads", row.downloads.value) + " indirme" : "indirme yok"} · ${row.revenue ? formatMetric("revenue", row.revenue.value) : "gelir yok"}`
                  : "Proje sayfasından gir veya kaynağı bağla"}
              </Txt>
            </Pressable>
          ))}
        </Surface>
      </Section>

      <Section title="Portföy" delay={120}>
        <Surface style={{ gap: space.md }}>
          {(["live", "review", "building", "idea", "paused"] as Stage[]).map((stage, index) => (
            <View key={stage} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt variant="label">{STAGE_LABEL[stage]}</Txt>
                <Txt variant="label" tone="soft">
                  {stages[stage]}
                </Txt>
              </View>
              <Bar ratio={active.length ? stages[stage] / active.length : 0} color={STAGE_COLOR[stage]} delay={200 + index * 80} />
            </View>
          ))}
        </Surface>
      </Section>

      <Section title="Son 30 gün" delay={180}>
        <View style={styles.grid}>
          <Surface style={styles.half}>
            <Txt variant="caption" tone="soft">
              Mağaza reddi
            </Txt>
            <CountUp value={rejections} tone={rejections ? accent.coral : undefined} />
          </Surface>
          <Surface style={styles.half}>
            <Txt variant="caption" tone="soft">
              Başarısız deploy
            </Txt>
            <CountUp value={failedDeploys} tone={failedDeploys ? accent.amber : undefined} delay={250} />
          </Surface>
        </View>
      </Section>

      <Section title="Commit · bu hafta" delay={240}>
        <Surface>
          {commits.length === 0 ? (
            <Txt tone="soft">GitHub bağlanınca günlük commit sayısı burada.</Txt>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: space.sm }}>
              {week.map((day, index) => (
                <View key={index} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Column ratio={day.count / maxCommits} color={accent.violet} delay={300 + index * 60} />
                  <Txt variant="caption" tone="faint">
                    {day.label}
                  </Txt>
                </View>
              ))}
            </View>
          )}
        </Surface>
      </Section>

      {revenueRows.length ? (
        <Section title="Gelir · proje bazında" delay={300}>
          <Surface style={{ gap: space.md }}>
            {revenueRows.map(({ project, row }, index) => (
              <View key={project.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Txt variant="label">{project.name}</Txt>
                  <Txt variant="label" tone="soft">
                    {formatMetric("revenue", row?.value ?? 0)}
                  </Txt>
                </View>
                <Bar ratio={(row?.value ?? 0) / maxRevenue} color={hueSolid(project.hue)} delay={300 + index * 70} />
              </View>
            ))}
          </Surface>
        </Section>
      ) : null}

      {insight?.risks.length ? (
        <Section title="Claude'un gördüğü riskler" delay={360}>
          {insight.risks.map((risk, index) => (
            <Surface key={index} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="sparkles" size={14} color={accent.violet} />
                <Txt variant="heading">{risk.title}</Txt>
              </View>
              <Txt tone="soft">{risk.detail}</Txt>
            </Surface>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function Bar({ ratio, color, delay }: { ratio: number; color: string; delay: number }) {
  const p = usePalette();
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withDelay(delay, withSpring(ratio * 100, { damping: 20 })));
  }, [ratio, delay, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: p.surfaceMuted, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", borderRadius: 5, backgroundColor: color }, style]} />
    </View>
  );
}

function Column({ ratio, color, delay }: { ratio: number; color: string; delay: number }) {
  const height = useSharedValue(0);
  useEffect(() => {
    height.set(withDelay(delay, withSpring(Math.max(0.04, ratio) * 96, { damping: 16 })));
  }, [ratio, delay, height]);
  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[{ width: "70%", borderRadius: 8, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  half: { flex: 1, gap: 2 },
});
