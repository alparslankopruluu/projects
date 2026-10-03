import { useMemo } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { isUnfinished, unfinishedReason } from "@/domain/derive";
import { Empty, Screen } from "@/ui/kit";
import { ProjectRow } from "@/ui/rows";
import { space } from "@/ui/theme";

export default function Unfinished() {
  const { projects } = useStore();
  const list = useMemo(() => projects.filter((item) => isUnfinished(item)).sort((a, b) => a.priority - b.priority), [projects]);
  return (
    <Screen title="Yarım kalanlar" subtitle="Sende bekleyen iş olan projeler.">
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
