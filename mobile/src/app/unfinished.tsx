import { useMemo, useState } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { HALLOWEEN, seasonVisible } from "@/domain/basket";
import { isUnfinished, unfinishedReason } from "@/domain/derive";
import { Button, Empty, Screen, Section, Surface, Txt } from "@/ui/kit";
import { ProjectRow } from "@/ui/rows";
import { space } from "@/ui/theme";

export default function Unfinished() {
  const store = useStore();
  const { projects } = store;
  const [seasonNote, setSeasonNote] = useState<string | null>(null);
  const list = useMemo(() => projects.filter((item) => isUnfinished(item)).sort((a, b) => a.priority - b.priority), [projects]);
  const live = projects.filter((item) => !item.archived && item.stage === "live").length;
  return (
    <Screen title="Yarım kalanlar" subtitle="Sende bekleyen iş olan projeler.">
      {seasonVisible() ? (
        <Section title={HALLOWEEN.label}>
          <Surface style={{ gap: space.sm }}>
            <Txt tone="soft">{HALLOWEEN.hint}</Txt>
            <Txt variant="caption" tone="faint">
              {HALLOWEEN.due} · {live} yayındaki uygulamaya görsel, etkinlik ve ASO işi yazar. Aynı iş ikinci kez eklenmez.
            </Txt>
            <Button
              label="Yayındakilere ekle"
              icon="calendar-outline"
              disabled={live === 0}
              onPress={() => {
                const added = store.addSeasonChecks();
                setSeasonNote(added ? `${added} iş eklendi.` : "Bu işler zaten listede.");
              }}
            />
            {seasonNote ? <Txt variant="caption">{seasonNote}</Txt> : null}
          </Surface>
        </Section>
      ) : null}
      {list.length === 0 ? (
        <Empty icon="checkmark-done" title="Yarım iş yok" body="Açık kalan her şey mağazada ya da sırası gelmemiş." />
      ) : (
        <View style={{ gap: space.sm }}>
          {list.map((project, index) => (
            <ProjectRow key={project.id} project={project} index={index} detail={unfinishedReason(project)} />
          ))}
        </View>
      )}
    </Screen>
  );
}
