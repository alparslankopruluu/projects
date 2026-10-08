import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { alarmIsDue, alarmNotification } from "@/domain/alarm";

export type AlarmItem = { id: string; alarmAt?: string | null; projectName: string };

const PREFIX = "note:";

// Local reminder only. Web has no reliable date trigger, and the text never includes the note.
export function useNoteAlarms(items: AlarmItem[]) {
  const key = items.map((item) => `${item.id}:${item.alarmAt ?? ""}:${item.projectName}`).join("|");
  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancel = false;
    (async () => {
      const due = items.filter((item) => alarmIsDue(item.alarmAt, new Date()));
      if (due.length > 0) {
        const current = await Notifications.getPermissionsAsync();
        if (!current.granted) await Notifications.requestPermissionsAsync();
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("notes", {
          name: "Notlar",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const want = new Set(due.map((item) => `${PREFIX}${item.id}`));
      for (const entry of scheduled) {
        if (entry.identifier.startsWith(PREFIX) && !want.has(entry.identifier)) {
          await Notifications.cancelScheduledNotificationAsync(entry.identifier).catch(() => undefined);
        }
      }
      if (cancel) return;
      for (const item of items) {
        const identifier = `${PREFIX}${item.id}`;
        if (!alarmIsDue(item.alarmAt, new Date())) {
          await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
          continue;
        }
        const copy = alarmNotification(item.projectName);
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: { title: copy.title, body: copy.body, data: { noteId: item.id } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.alarmAt as string),
            channelId: "notes",
          },
        });
      }
    })().catch(() => undefined);
    return () => {
      cancel = true;
    };
    // The key is the schedule. `items` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
