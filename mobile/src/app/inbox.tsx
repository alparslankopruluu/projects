import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { inboxCounts, sortSignals } from "@/domain/derive";
import { Button, Empty, Screen } from "@/ui/kit";
import { SignalRow } from "@/ui/rows";
import { space } from "@/ui/theme";

export default function Inbox() {
  const { signals, projects, markRead, markAllRead } = useStore();
  const sorted = useMemo(() => sortSignals(signals), [signals]);
  const counts = inboxCounts(signals);
  const nameOf = (id: string | null) => projects.find((item) => item.id === id)?.name;

  return (
    <Screen
      title="Bildirimler"
      subtitle={counts.unread ? `${counts.unread} okunmamış · ${counts.critical} kritik` : "Hepsi okundu."}
      right={counts.unread ? <Button label="Tümünü okundu say" tone="ghost" onPress={markAllRead} style={{ height: 40 }} /> : undefined}>
      {sorted.length === 0 ? (
        <Empty icon="notifications-off-outline" title="Bildirim yok" body="Kaynak bağlayınca mağaza, deploy ve Claude uyarıları burada toplanır." />
      ) : (
        <View style={{ gap: space.sm }}>
          {sorted.map((signal, index) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              index={index}
              projectName={nameOf(signal.projectId)}
              onPress={() => {
                markRead(signal.id);
                if (signal.projectId) router.push(`/apps/${signal.projectId}`);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
