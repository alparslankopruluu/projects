import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { canKeepIdea } from "@/domain/basket";
import { CAPTURE_CATEGORY_LABEL, FREE_KEPT_IDEAS } from "@/domain/model";
import { Button, Empty, Pill, Screen, Section, Surface, Txt } from "@/ui/kit";
import { accent, space } from "@/ui/theme";

export default function Ideas() {
  const store = useStore();
  const [minted, setMinted] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const kept = store.ideas.filter((item) => item.kept).length;
  const room = canKeepIdea(store.plan, kept);
  const drafts = store.ideas.filter((item) => !item.kept);
  const saved = store.ideas.filter((item) => item.kept);

  return (
    <Screen
      title="Fikirler"
      subtitle="Sepetteki raflardan mevcut uygulamalara iş, ya da yeni bir ürün çıkar. Bu, sepetten ayrı bir masa.">
      <Surface style={{ gap: space.md }}>
        <Txt tone="soft">
          {store.captures.length
            ? `${store.captures.length} not var. Üretim cihazda olur; Claude bağlanınca bugünün odağını ayrıca yazar.`
            : "Önce sepete bir haber, görsel veya mimari not bırak."}
        </Txt>
        <Button
          label="Sepetten üret"
          icon="sparkles-outline"
          disabled={store.captures.length === 0}
          onPress={() => {
            setBlocked(false);
            setMinted(store.mintIdeas());
          }}
        />
        {minted === 0 ? <Txt variant="caption" tone="soft">Bu notlardan iş çıkmadı. Biraz daha bağlam ekle.</Txt> : null}
        <Txt variant="caption" tone="faint">
          {store.plan === "pro"
            ? "Bu masa Pro. Saklamak ve projeye yazmak açık. Ödeme henüz bağlı değil."
            : `Ücretsiz planda ${FREE_KEPT_IDEAS} fikir saklanır. Şu an ${kept}. Uygulamak da bir saklamadır.`}
        </Txt>
      </Surface>

      {drafts.length === 0 && saved.length === 0 ? (
        <Empty icon="bulb-outline" title="Henüz fikir yok" body="Sepet dolunca burası mevcut uygulamalarına ve yeni ürünlere ayrı ayrı öneri yazar." />
      ) : null}

      {drafts.length ? (
        <Section title="Taslak">
          <View style={{ gap: space.sm }}>
            {drafts.map((idea) => (
              <IdeaCard
                key={idea.id}
                title={idea.title}
                body={idea.body}
                meta={`${CAPTURE_CATEGORY_LABEL[idea.category]} · ${idea.target === "new" ? "yeni ürün" : store.projects.find((item) => item.id === idea.projectId)?.name ?? "proje"}`}
                primary={idea.target === "new" ? "Yeni proje aç" : "Projeye yaz"}
                locked={!room}
                onPrimary={() => {
                  const ok = store.applyIdea(idea.id);
                  setBlocked(!ok);
                  if (ok && idea.projectId && idea.target === "existing") router.push(`/apps/${idea.projectId}`);
                }}
                onKeep={() => setBlocked(!store.keepIdea(idea.id))}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {saved.length ? (
        <Section title="Saklananlar">
          <View style={{ gap: space.sm }}>
            {saved.map((idea) => (
              <IdeaCard
                key={idea.id}
                title={idea.title}
                body={idea.body}
                meta={`${CAPTURE_CATEGORY_LABEL[idea.category]} · saklandı`}
                primary={idea.projectId && store.projects.some((item) => item.id === idea.projectId) ? "Projeyi aç" : "Yeniden uygula"}
                locked={false}
                onPrimary={() => {
                  if (idea.projectId && store.projects.some((item) => item.id === idea.projectId)) {
                    router.push(`/apps/${idea.projectId}`);
                    return;
                  }
                  setBlocked(!store.applyIdea(idea.id));
                }}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {blocked ? (
        <Txt variant="label" tone={accent.coral}>
          Ücretsiz planda {FREE_KEPT_IDEAS} fikirden fazlası saklanmaz. Hesaptan Pro önizlemesine geçebilirsin. Ödeme alınmaz.
        </Txt>
      ) : null}
    </Screen>
  );
}

function IdeaCard({
  title,
  body,
  meta,
  primary,
  locked,
  onPrimary,
  onKeep,
}: {
  title: string;
  body: string;
  meta: string;
  primary: string;
  locked: boolean;
  onPrimary: () => void;
  onKeep?: () => void;
}) {
  return (
    <Surface style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
        <Txt variant="heading" style={{ flex: 1 }}>
          {title}
        </Txt>
        {locked ? <Pill label="Pro" color={accent.violet} /> : null}
      </View>
      <Txt tone="soft">{body}</Txt>
      <Txt variant="caption" tone="faint">
        {meta}
      </Txt>
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        <Button label={locked ? "Pro ile yaz" : primary} icon="arrow-forward" onPress={onPrimary} />
        {onKeep ? <Button label={locked ? "Limit dolu" : "Sakla"} tone="ghost" onPress={onKeep} /> : null}
      </View>
    </Surface>
  );
}
