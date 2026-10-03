import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore, type Credentials } from "@/data/store";
import { SOURCE_LABEL, type SourceKind, type StoreEventKind } from "@/domain/model";
import { Button, Chip, Field, Icon, Screen, Section, Surface, Txt } from "@/ui/kit";
import { accent, space, usePalette } from "@/ui/theme";

const KINDS: SourceKind[] = ["github", "vercel", "appstore", "googleplay", "firebase", "supabase", "revenuecat"];

// What the ref means inside each service, and whether a server adapter exists yet.
const SOURCE_HINT: Record<SourceKind, { placeholder: string; api: boolean }> = {
  github: { placeholder: "owner/repo", api: true },
  vercel: { placeholder: "Vercel proje adı ya da prj_…", api: true },
  appstore: { placeholder: "App Store Connect app id (sayı)", api: true },
  supabase: { placeholder: "Supabase project ref", api: true },
  googleplay: { placeholder: "com.paket.adi", api: false },
  firebase: { placeholder: "firebase-proje-id", api: false },
  revenuecat: { placeholder: "RevenueCat proje id", api: false },
  claude: { placeholder: "", api: true },
  manual: { placeholder: "", api: false },
};

const EVENT_KINDS: { kind: StoreEventKind; label: string }[] = [
  { kind: "submitted", label: "Gönderildi" },
  { kind: "in_review", label: "İncelemede" },
  { kind: "rejected", label: "Reddedildi" },
  { kind: "approved", label: "Onaylandı" },
  { kind: "released", label: "Yayında" },
];

export default function Sources() {
  const p = usePalette();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const store = useStore();
  const [projectId, setProjectId] = useState(params.projectId ?? store.projects[0]?.id ?? "");
  const [kind, setKind] = useState<SourceKind>("github");
  const [ref, setRef] = useState("");
  const [eventKind, setEventKind] = useState<StoreEventKind>("rejected");
  const [eventStore, setEventStore] = useState<"appstore" | "googleplay">("appstore");
  const [version, setVersion] = useState("");
  const [detail, setDetail] = useState("");
  const [creds, setCreds] = useState({ github: "", vercel: "", vercelTeam: "", issuerId: "", keyId: "", privateKey: "", supabase: "" });
  const [saved, setSaved] = useState<string | null>(null);
  const project = store.projects.find((item) => item.id === projectId);

  return (
    <Screen title="Kaynaklar" subtitle="API ile bağla ya da elle gir. İkisi de aynı akışa düşer.">
      <Section title="Proje">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {store.projects.map((item) => (
            <Chip key={item.id} label={item.name} selected={item.id === projectId} onPress={() => setProjectId(item.id)} />
          ))}
        </View>
      </Section>

      <Section title="Kaynak bağla" delay={80}>
        <Surface style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {KINDS.map((item) => (
              <Chip key={item} label={SOURCE_LABEL[item]} selected={kind === item} onPress={() => setKind(item)} />
            ))}
          </View>
          <Field value={ref} onChangeText={setRef} placeholder={SOURCE_HINT[kind].placeholder} autoCapitalize="none" autoCorrect={false} />
          {!SOURCE_HINT[kind].api ? (
            <Txt variant="caption" tone="soft">
              {SOURCE_LABEL[kind]} için otomatik senkron henüz yok. Bağlantı kaydedilir, metrikleri proje sayfasından elle girersin.
            </Txt>
          ) : null}
          <Button
            label={project ? `${project.name} projesine bağla` : "Bağla"}
            icon="link"
            disabled={!project}
            onPress={() => {
              if (!project) return;
              store.addConnection(project.id, { kind, ref: ref.trim(), mode: SOURCE_HINT[kind].api ? "api" : "manual", lastSyncAt: null });
              setRef("");
              setSaved(`${SOURCE_LABEL[kind]} bağlandı.`);
            }}
          />
        </Surface>
      </Section>

      <Section title="Mağaza olayı gir" delay={140}>
        <Surface style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Chip label="App Store" selected={eventStore === "appstore"} onPress={() => setEventStore("appstore")} />
            <Chip label="Google Play" selected={eventStore === "googleplay"} onPress={() => setEventStore("googleplay")} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {EVENT_KINDS.map((item) => (
              <Chip key={item.kind} label={item.label} color={item.kind === "rejected" ? accent.coral : undefined} selected={eventKind === item.kind} onPress={() => setEventKind(item.kind)} />
            ))}
          </View>
          <Field value={version} onChangeText={setVersion} placeholder="Sürüm, ör. 1.2.0" autoCapitalize="none" />
          <Field value={detail} onChangeText={setDetail} placeholder="Gerekçe ya da not (ör. Guideline 2.1)" multiline style={{ minHeight: 70, textAlignVertical: "top" }} />
          <Button
            label="Kaydet"
            disabled={!project || !version.trim()}
            onPress={() => {
              if (!project) return;
              store.addEvent({ projectId: project.id, source: eventStore, kind: eventKind, version: version.trim(), detail: detail.trim() });
              setVersion("");
              setDetail("");
              setSaved("Olay kaydedildi.");
            }}
          />
        </Surface>
      </Section>

      <Section title="API anahtarları" delay={200}>
        {store.mode !== "cloud" ? (
          <Surface style={{ gap: space.md }}>
            <Txt tone="soft">Anahtarlar cihazda tutulmaz. Firebase hesabına giriş yapınca sunucuya yazılır ve sadece Cloud Functions okur.</Txt>
            <Button label="Giriş yap" icon="log-in-outline" onPress={() => router.push("/settings")} />
          </Surface>
        ) : (
          <Surface style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Icon name="lock-closed" size={14} color={accent.mint} />
              <Txt variant="caption" tone="soft">
                Yalnızca yazılır. Uygulama bu alanları geri okuyamaz.
              </Txt>
            </View>
            <Field value={creds.github} onChangeText={(v) => setCreds({ ...creds, github: v })} placeholder="GitHub token" secureTextEntry autoCapitalize="none" />
            <Field value={creds.vercel} onChangeText={(v) => setCreds({ ...creds, vercel: v })} placeholder="Vercel token" secureTextEntry autoCapitalize="none" />
            <Field value={creds.vercelTeam} onChangeText={(v) => setCreds({ ...creds, vercelTeam: v })} placeholder="Vercel team id (opsiyonel)" autoCapitalize="none" />
            <Field value={creds.issuerId} onChangeText={(v) => setCreds({ ...creds, issuerId: v })} placeholder="App Store Connect issuer id" autoCapitalize="none" />
            <Field value={creds.keyId} onChangeText={(v) => setCreds({ ...creds, keyId: v })} placeholder="App Store Connect key id" autoCapitalize="none" />
            <Field value={creds.privateKey} onChangeText={(v) => setCreds({ ...creds, privateKey: v })} placeholder="-----BEGIN PRIVATE KEY----- (.p8)" multiline secureTextEntry autoCapitalize="none" style={{ minHeight: 80, textAlignVertical: "top" }} />
            <Field value={creds.supabase} onChangeText={(v) => setCreds({ ...creds, supabase: v })} placeholder="Supabase access token" secureTextEntry autoCapitalize="none" />
            <Button label="Anahtarları kaydet" icon="shield-checkmark-outline" onPress={() => void saveKeys()} />
            <Button label="Şimdi senkronize et" icon="sync" tone="ghost" busy={store.status.busy === "sync"} onPress={() => void store.sync()} />
          </Surface>
        )}
      </Section>

      {saved || store.status.error ? (
        <Txt variant="label" tone={store.status.error ? accent.coral : p.inkSoft} style={{ textAlign: "center" }}>
          {store.status.error ?? saved}
        </Txt>
      ) : null}
    </Screen>
  );

  async function saveKeys() {
    // Only send fields the user filled; merge keeps the rest on the server.
    const patch: Credentials = {};
    if (creds.github.trim()) patch.github = { token: creds.github.trim() };
    if (creds.vercel.trim()) patch.vercel = { token: creds.vercel.trim(), ...(creds.vercelTeam.trim() ? { teamId: creds.vercelTeam.trim() } : {}) };
    if (creds.issuerId.trim() && creds.keyId.trim() && creds.privateKey.trim()) {
      patch.appstore = { issuerId: creds.issuerId.trim(), keyId: creds.keyId.trim(), privateKey: creds.privateKey.trim() };
    }
    if (creds.supabase.trim()) patch.supabase = { accessToken: creds.supabase.trim() };
    if (Object.keys(patch).length === 0) return setSaved("Doldurulan alan yok.");
    try {
      await store.saveCredentials(patch);
      setCreds({ github: "", vercel: "", vercelTeam: "", issuerId: "", keyId: "", privateKey: "", supabase: "" });
      setSaved("Anahtarlar sunucuya yazıldı.");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  }
}
