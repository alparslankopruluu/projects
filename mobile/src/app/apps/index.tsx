import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useStore } from "@/data/store";
import { stageCounts } from "@/domain/derive";
import { STAGE_LABEL, type Stage } from "@/domain/model";
import { Screen, tap, Txt } from "@/ui/kit";
import { ProjectRow } from "@/ui/rows";
import { STAGE_COLOR, radius, space, usePalette } from "@/ui/theme";

const FILTERS: (Stage | "all")[] = ["all", "review", "building", "live", "idea", "paused"];

export default function Apps() {
  const p = usePalette();
  const { projects } = useStore();
  const [filter, setFilter] = useState<Stage | "all">("all");
  const active = useMemo(() => projects.filter((item) => !item.archived).sort((a, b) => a.priority - b.priority), [projects]);
  const counts = stageCounts(active);
  const shown = filter === "all" ? active : active.filter((item) => item.stage === filter);

  return (
    <Screen title="Uygulamalar" subtitle={`${active.length} proje · öncelik sırasına göre`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {FILTERS.map((key) => {
          const selected = key === filter;
          const count = key === "all" ? active.length : counts[key];
          if (key !== "all" && count === 0) return null;
          return (
            <Pressable
              key={key}
              onPress={() => {
                tap();
                setFilter(key);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                height: 36,
                borderRadius: radius.pill,
                backgroundColor: selected ? p.inverse : p.surface,
              }}>
              {key !== "all" ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STAGE_COLOR[key] }} /> : null}
              <Txt variant="label" tone={selected ? "inverse" : "ink"}>
                {key === "all" ? "Hepsi" : STAGE_LABEL[key]} {count}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ gap: space.sm }}>
        {shown.map((project, index) => (
          <ProjectRow key={project.id} project={project} index={index} />
        ))}
      </View>
    </Screen>
  );
}
