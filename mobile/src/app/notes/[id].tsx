import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { useStore } from "@/data/store";
import { alarmIsDue, alarmPreset, type AlarmPreset } from "@/domain/alarm";
import { collectNotes } from "@/domain/notes";
import { canEditRole } from "@/domain/share";
import { Button, Chip, Field, Screen, Surface, Txt } from "@/ui/kit";
import { space } from "@/ui/theme";

const PRESETS: { key: AlarmPreset; label: string }[] = [
  { key: "hour", label: "1 saat" },
  { key: "tonight", label: "Bu akşam" },
  { key: "tomorrow", label: "Yarın 09:00" },
];

export default function NoteScreen() {
  const { id, projectId } = useLocalSearchParams<{ id: string; projectId?: string }>();
  const store = useStore();
  const note = collectNotes(store.projects, store.sharedNotes, store.sharedProjects).find((item) => item.id === id && (!projectId || item.projectId === projectId));
  const owned = note ? store.projects.some((project) => project.id === note.projectId) : false;
  const grant = store.grants.find((item) => item.memberId === store.uid && ((item.kind === "note" && item.targetId === id) || (item.kind === "project" && item.targetId === note?.projectId)));
  const role = owned ? "owner" : (grant?.role ?? null);
  const canEdit = canEditRole(role);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  useEffect(() => {
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
  }, [note?.id]);

  if (!note || !role) {
    const waiting = store.grants.some(
      (item) =>
        item.memberId === store.uid &&
        ((item.kind === "note" && item.targetId === id) || (item.kind === "project" && projectId != null && item.targetId === projectId)),
    );
    return (
      <Screen title="Not" subtitle="Bu not burada yok.">
        <Txt tone="soft">{waiting ? "Not açılıyor." : "Silinmiş ya da davet kapanmış olabilir."}</Txt>
      </Screen>
    );
  }

  function save(patch: { title?: string; body?: string; alarmAt?: string | null }) {
    if (!note) return;
    store.updateNote(note.projectId, note.id, patch);
  }

  const alarmLabel = note.alarmAt && alarmIsDue(note.alarmAt, new Date())
    ? new Date(note.alarmAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Screen
      title={note.projectName}
      subtitle={role === "owner" ? "Senin notun" : role === "edit" ? "Düzenleyebilirsin" : "Görüntülüyorsun"}
      right={role === "owner" ? <Button label="Paylaş" tone="ghost" icon="share-outline" onPress={() => router.push(`/share?kind=note&id=${note.id}`)} /> : undefined}>
      <Surface style={{ gap: space.md }}>
        {canEdit ? (
          <>
            <Field value={title} onChangeText={setTitle} placeholder="Kısa başlık" onBlur={() => save({ title })} />
            <Field value={body} onChangeText={setBody} placeholder="Not" multiline style={{ minHeight: 140, textAlignVertical: "top" }} />
            <Button label="Kaydet" icon="checkmark" disabled={!body.trim()} onPress={() => save({ title, body })} />
          </>
        ) : (
          <>
            <Txt variant="heading">{note.title?.trim() || "Not"}</Txt>
            <Txt>{note.body}</Txt>
          </>
        )}
        <Txt variant="caption" tone="faint">
          {note.author === "claude" ? "Claude" : "Sen"} · {note.createdAt.slice(0, 10)}
        </Txt>
      </Surface>

      <Surface style={{ gap: space.md }}>
        <Txt variant="heading">Alarm</Txt>
        <Txt tone="soft">{alarmLabel ? alarmLabel : "Kurulu alarm yok."}</Txt>
        <Txt variant="caption" tone="faint">
          Bildirim yalnızca proje adını söyler. Notun metni gitmez.
          {Platform.OS === "web" ? " Web'de saat kaydedilir; çalma telefon uygulamasında olur." : ""}
        </Txt>
        {canEdit ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {PRESETS.map((preset) => (
              <Chip key={preset.key} label={preset.label} selected={false} onPress={() => save({ alarmAt: alarmPreset(preset.key, new Date()) })} />
            ))}
            {note.alarmAt ? <Chip label="Kaldır" selected={false} onPress={() => save({ alarmAt: null })} /> : null}
          </View>
        ) : null}
      </Surface>

      {role === "owner" ? (
        <Button
          label="Notu sil"
          tone="ghost"
          icon="trash-outline"
          onPress={() => {
            store.deleteNote(note.projectId, note.id);
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
