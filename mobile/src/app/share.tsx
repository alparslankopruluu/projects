import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { noteLabel } from "@/domain/notes";
import type { ShareKind, ShareRole } from "@/domain/share";
import { Button, Chip, Screen, Surface, Txt } from "@/ui/kit";
import { space } from "@/ui/theme";

export default function ShareScreen() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  const shareKind: ShareKind | null = kind === "project" || kind === "note" ? kind : null;
  const store = useStore();
  const [role, setRole] = useState<ShareRole>("view");
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const project = shareKind === "project" ? store.projects.find((item) => item.id === id) : store.projects.find((item) => item.notes.some((note) => note.id === id));
  const note = project?.notes.find((item) => item.id === id);
  const label = shareKind === "project" ? project?.name : note ? noteLabel(note) : null;
  const members = store.grants.filter((grant) => grant.ownerId === store.uid && grant.kind === shareKind && grant.targetId === id);
  const openInvites = store.invites.filter((invite) => invite.kind === shareKind && invite.targetId === id && !invite.revoked && !invite.claimedBy && Date.parse(invite.expiresAt) > Date.now());

  if (!shareKind || !id || !label) {
    return (
      <Screen title="Paylaş" subtitle="Bunu yalnızca sahibi paylaşabilir.">
        <Button label="Hesaba dön" tone="ghost" onPress={() => router.push("/settings")} />
      </Screen>
    );
  }

  async function create() {
    if (!shareKind || !id) return;
    setBusy(true);
    setMessage(null);
    try {
      const invite = await store.createInvite(shareKind, id, role);
      setCode(invite.code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Davet açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Paylaş" subtitle={`${label}. Kod 48 saat geçerli, bir kişi kullanır. Bağlantı yok.`}>
      {store.mode !== "cloud" ? (
        <Surface style={{ gap: space.sm }}>
          <Txt variant="heading">Giriş gerekli</Txt>
          <Txt tone="soft">Davet kodu bulutta durur. Bu cihazdaki kayıt karşı tarafa ulaşmaz.</Txt>
          <Button label="Hesaba git" icon="person-circle-outline" onPress={() => router.push("/settings")} />
        </Surface>
      ) : (
        <Surface style={{ gap: space.md }}>
          <Txt variant="label" tone="soft">
            Yetki
          </Txt>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Chip label="Görüntüle" selected={role === "view"} onPress={() => setRole("view")} />
            <Chip label="Düzenle" selected={role === "edit"} onPress={() => setRole("edit")} />
          </View>
          <Button label="Kod oluştur" icon="key-outline" busy={busy} onPress={() => void create()} />
          {code ? (
            <View style={{ gap: 4 }}>
              <Txt variant="display" selectable>
                {code}
              </Txt>
              <Txt variant="caption" tone="faint">
                Karşı taraf Hesap → Davet koduyla katıl ekranına bunu yazar.
              </Txt>
            </View>
          ) : null}
        </Surface>
      )}

      {message ? <Txt tone="soft">{message}</Txt> : null}

      {openInvites.length > 0 ? (
        <Surface style={{ gap: space.sm }}>
          <Txt variant="heading">Açık kodlar</Txt>
          {openInvites.map((invite) => (
            <View key={invite.code} style={{ gap: 2 }}>
              <Txt selectable variant="heading">
                {invite.code}
              </Txt>
              <Txt variant="caption" tone="faint">
                {invite.role === "edit" ? "Düzenle" : "Görüntüle"} · {new Date(invite.expiresAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Txt>
            </View>
          ))}
        </Surface>
      ) : null}

      {members.length > 0 ? (
        <Surface style={{ gap: space.md }}>
          <Txt variant="heading">Kişiler</Txt>
          {members.map((grant) => (
            <View key={grant.id} style={{ gap: space.sm }}>
              <Txt>{grant.memberId.slice(0, 6)}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                <Chip label="Görüntüle" selected={grant.role === "view"} onPress={() => void store.setGrantRole(grant.id, "view").catch((error) => setMessage(error instanceof Error ? error.message : "Rol değişmedi."))} />
                <Chip label="Düzenle" selected={grant.role === "edit"} onPress={() => void store.setGrantRole(grant.id, "edit").catch((error) => setMessage(error instanceof Error ? error.message : "Rol değişmedi."))} />
                <Chip label="Kaldır" selected={false} onPress={() => void store.removeGrant(grant.id).catch((error) => setMessage(error instanceof Error ? error.message : "Kaldırılamadı."))} />
              </View>
            </View>
          ))}
        </Surface>
      ) : null}
    </Screen>
  );
}
