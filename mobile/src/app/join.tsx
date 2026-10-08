import { router } from "expo-router";
import { useState } from "react";

import { useStore } from "@/data/store";
import { Button, Field, Screen, Surface, Txt } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function JoinScreen() {
  const store = useStore();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setMessage(null);
    try {
      const grant = await store.redeemInvite(code);
      if (grant.kind === "project") router.replace(`/apps/${grant.targetId}`);
      else router.replace(`/notes/${grant.targetId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Katılınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Katıl" subtitle="Sana verilen kodu yaz. Herkese açık bir bağlantı yok.">
      {store.mode !== "cloud" ? (
        <Surface style={{ gap: space.sm }}>
          <Txt variant="heading">Giriş gerekli</Txt>
          <Txt tone="soft">Kod başka bir hesabın davetidir. Önce kendi hesabınla gir.</Txt>
          <Button label="Hesaba git" icon="person-circle-outline" onPress={() => router.push("/settings")} />
        </Surface>
      ) : (
        <Surface style={{ gap: space.md }}>
          <Field value={code} onChangeText={(value) => setCode(value.toUpperCase())} placeholder="Davet kodu" autoCapitalize="characters" autoCorrect={false} />
          <Button label="Katıl" icon="enter-outline" busy={busy} disabled={code.trim().length < 16} onPress={() => void join()} />
          {message ? <Txt tone="soft">{message}</Txt> : null}
        </Surface>
      )}
    </Screen>
  );
}
