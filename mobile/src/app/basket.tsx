import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { useStore } from "@/data/store";
import { groupCaptures, staleCaptures } from "@/domain/basket";
import {
  CAPTURE_CATEGORY_LABEL,
  CAPTURE_KIND_LABEL,
  type CaptureCategory,
  type CaptureKind,
} from "@/domain/model";
import { Button, Chip, Empty, Field, Icon, RoundButton, Screen, Section, Surface, tap, Txt } from "@/ui/kit";
import { accent, space, usePalette } from "@/ui/theme";

const KINDS: CaptureKind[] = ["idea", "news", "essay", "tweet", "screenshot", "note"];
const CATEGORIES = Object.keys(CAPTURE_CATEGORY_LABEL) as CaptureCategory[];

export default function Basket() {
  const p = usePalette();
  const store = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<CaptureKind>("note");
  const [projectId, setProjectId] = useState<string | null>(null);
  const groups = useMemo(() => groupCaptures(store.captures), [store.captures]);
  const unread = store.captures.filter((item) => !item.read).length;
  const stale = staleCaptures(store.captures).length;

  function add() {
    store.addCapture({ title, body, url, kind, projectId });
    setTitle("");
    setBody("");
    setUrl("");
    setKind("note");
  }

  return (
    <Screen
      title="Sepet"
      subtitle={unread ? `${unread} okunmamış${stale ? ` · ${stale} tanesi hatırlatılıyor` : ""}` : "Fikir, haber, köşe yazısı, tweet, ekran görüntüsü."}
      right={<RoundButton icon="sparkles-outline" label="Fikirler" onPress={() => router.push("/ideas")} />}>
      <Surface style={{ gap: space.md }}>
        <Field value={title} onChangeText={setTitle} placeholder="Başlık" />
        <Field value={body} onChangeText={setBody} placeholder="Ne gördün, neden durdun?" multiline style={{ minHeight: 72, textAlignVertical: "top" }} />
        <Field value={url} onChangeText={setUrl} placeholder="Bağlantı veya görsel adresi (isteğe bağlı)" autoCapitalize="none" autoCorrect={false} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {KINDS.map((item) => (
            <Chip key={item} label={CAPTURE_KIND_LABEL[item]} selected={kind === item} onPress={() => setKind(item)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Chip label="Projeye bağlama" selected={projectId === null} onPress={() => setProjectId(null)} />
          {store.projects
            .filter((item) => !item.archived)
            .map((item) => (
              <Chip key={item.id} label={item.name} selected={projectId === item.id} onPress={() => setProjectId(item.id)} />
            ))}
        </View>
        <Button label="Sepete at" icon="basket-outline" disabled={!title.trim() && !body.trim()} onPress={add} />
        <Txt variant="caption" tone="faint">
          İki gün okunmazsa ana sayfa hatırlatır. Sepet kendisi rafa ayırır: mimari, estetik, büyüme, haber.
        </Txt>
      </Surface>

      {groups.length === 0 ? (
        <Empty icon="basket-outline" title="Sepet boş" body="Beğendiğin bir fikri, haberi veya ekran görüntüsünün linkini buraya bırak." />
      ) : (
        groups.map((group) => (
          <Section key={group.category} title={CAPTURE_CATEGORY_LABEL[group.category]}>
            <View style={{ gap: space.sm }}>
              {group.items.map((item) => (
                <Surface key={item.id} style={{ gap: space.sm }}>
                  <Pressable
                    onPress={() => {
                      tap();
                      store.updateCapture(item.id, { read: !item.read });
                    }}
                    style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.read ? p.inkFaint : accent.coral }} />
                      <Txt variant="heading" style={{ flex: 1 }} numberOfLines={2}>
                        {item.title}
                      </Txt>
                      <Txt variant="caption" tone="faint">
                        {item.read ? "okundu" : "yeni"}
                      </Txt>
                    </View>
                    {item.body ? <Txt tone="soft">{item.body}</Txt> : null}
                    <Txt variant="caption" tone="faint">
                      {CAPTURE_KIND_LABEL[item.kind]}
                      {item.url ? ` · ${item.url.replace(/^https?:\/\//, "").slice(0, 42)}` : ""}
                      {item.projectId ? ` · ${store.projects.find((project) => project.id === item.projectId)?.name ?? ""}` : ""}
                    </Txt>
                  </Pressable>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                    {CATEGORIES.map((category) => (
                      <Chip
                        key={category}
                        label={CAPTURE_CATEGORY_LABEL[category]}
                        selected={item.category === category}
                        onPress={() => store.updateCapture(item.id, { category })}
                      />
                    ))}
                  </View>
                  <Pressable
                    onPress={() => {
                      tap();
                      store.removeCapture(item.id);
                    }}
                    hitSlop={8}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Icon name="trash-outline" size={14} color={p.inkFaint} />
                    <Txt variant="caption" tone="faint">
                      Çıkar
                    </Txt>
                  </Pressable>
                </Surface>
              ))}
            </View>
          </Section>
        ))
      )}
    </Screen>
  );
}
