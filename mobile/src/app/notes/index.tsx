import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { useStore } from "@/data/store";
import { alarmIsDue } from "@/domain/alarm";
import { collectNotes, noteLabel } from "@/domain/notes";
import { Empty, Icon, Screen, Surface, Txt } from "@/ui/kit";
import { space, usePalette } from "@/ui/theme";

export default function NotesScreen() {
  const store = useStore();
  const p = usePalette();
  const notes = collectNotes(store.projects, store.sharedNotes, store.sharedProjects);

  return (
    <Screen title="Notlar" subtitle="Projelerin yanında durur. Claude da okur.">
      {notes.length === 0 ? (
        <Empty icon="document-text-outline" title="Henüz not yok" body="Bir projenin içinden ya da Yeni ekranından ekle. Alarm ve paylaşım notun kendisinde." />
      ) : (
        notes.map((note) => (
          <Pressable key={note.id} onPress={() => router.push(`/notes/${note.id}?projectId=${note.projectId}`)}>
            <Surface style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
                  {noteLabel(note)}
                </Txt>
                {alarmIsDue(note.alarmAt, new Date()) ? <Icon name="alarm-outline" size={16} color={p.inkSoft} /> : null}
              </View>
              <Txt tone="soft" numberOfLines={2}>
                {note.body}
              </Txt>
              <Txt variant="caption" tone="faint">
                {note.projectName} · {note.createdAt.slice(0, 10)}
              </Txt>
            </Surface>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
