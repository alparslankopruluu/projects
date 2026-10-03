import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { Button, Field, Icon, Screen, Section, Surface, Txt } from "@/ui/kit";
import { accent, space } from "@/ui/theme";

export default function Settings() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Hesap" subtitle={store.mode === "cloud" ? `Bulutta · ${store.email}` : "Bu cihazda, yerel çalışıyor."}>
      {store.mode === "cloud" ? (
        <Surface style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Icon name="cloud-done" color={accent.mint} />
            <Txt variant="heading">Firebase ile senkron</Txt>
          </View>
          <Txt tone="soft">Projeler, bildirimler ve metrikler tüm cihazlarında aynı. Claude analizi ve kaynak senkronu açık.</Txt>
          <Button label="Çıkış yap" tone="ghost" icon="log-out-outline" onPress={() => void run(store.signOut)} />
        </Surface>
      ) : store.cloudAvailable ? (
        <Surface style={{ gap: space.md }}>
          <Txt variant="heading">Giriş yap</Txt>
          <Txt tone="soft">İlk girişte bu cihazdaki projeler hesabına taşınır.</Txt>
          <Field value={email} onChangeText={setEmail} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field value={password} onChangeText={setPassword} placeholder="Parola" secureTextEntry autoComplete="password" />
          <Button label="Giriş yap" busy={busy} disabled={!email || !password} onPress={() => void run(() => store.signIn(email.trim(), password))} />
          <Button label="Hesap oluştur" tone="ghost" disabled={busy || !email || password.length < 6} onPress={() => void run(() => store.signUp(email.trim(), password))} />
        </Surface>
      ) : (
        <Surface style={{ gap: space.sm }}>
          <Txt variant="heading">Firebase ayarı yok</Txt>
          <Txt tone="soft">mobile/.env dosyasına EXPO_PUBLIC_FIREBASE_API_KEY, _PROJECT_ID ve _APP_ID değerlerini ekleyip uygulamayı yeniden başlat. O zamana kadar her şey bu cihazda saklanır.</Txt>
        </Surface>
      )}

      {message ? (
        <Txt variant="label" tone={accent.coral}>
          {message}
        </Txt>
      ) : null}

      <Section title="Diğer" delay={120}>
        <Button label="Kaynaklar ve API anahtarları" tone="ghost" icon="link-outline" onPress={() => router.push("/sources")} />
        <Button label="Tanıtım videosu" tone="ghost" icon="play-circle-outline" onPress={() => router.push("/intro")} />
        {store.mode === "local" ? <Button label="Yerel veriyi sıfırla" tone="ghost" icon="refresh" onPress={store.resetLocal} /> : null}
      </Section>
    </Screen>
  );
}
