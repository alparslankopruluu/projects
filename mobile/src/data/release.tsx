import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { parseRelease, updateKind, type ReleasePlatform } from "@/domain/release";
import { Button, Icon, Txt } from "@/ui/kit";
import { radius, softShadow, space, usePalette } from "@/ui/theme";

import { firebase } from "./firebase";

const DISMISS_KEY = "projects.release.dismissed";
const ANDROID_STORE = "https://play.google.com/store/apps/details?id=com.alparslankopruluu.projects";

type Gate = {
  kind: "force" | "soft";
  url: string | null;
  latest: string;
};

function platformOf(): ReleasePlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

function currentVersion() {
  return Constants.expoConfig?.version || "0.0.0";
}

function openUpdate(url: string | null) {
  if (url) {
    void Linking.openURL(url);
    return;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") window.location.reload();
}

export function ReleaseGate() {
  const [gate, setGate] = useState<Gate | null>(null);
  const p = usePalette();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fb = firebase();
    if (!fb) return;
    let alive = true;
    const platform = platformOf();
    getDoc(doc(fb.db, "config", "release"))
      .then(async (snapshot) => {
        const channel = snapshot.exists() ? parseRelease(snapshot.data(), platform) : null;
        const kind = updateKind(currentVersion(), channel);
        if (!alive || !kind || !channel) return;
        if (kind === "soft") {
          const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
          if (!alive || dismissed === channel.latest) return;
        }
        const fallback = platform === "android" ? ANDROID_STORE : null;
        setGate({ kind, latest: channel.latest, url: channel.url ?? fallback });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!gate) return null;

  const updateLabel = gate.url || Platform.OS !== "web" ? "Güncelle" : "Yenile";
  const canOpen = Boolean(gate.url) || Platform.OS === "web";

  if (gate.kind === "force") {
    return (
      <View style={[styles.force, { backgroundColor: p.bg, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.copy}>
          <Icon name="arrow-up-circle" size={36} color={p.ink} />
          <Txt variant="display">Güncelleme gerekli</Txt>
          <Txt tone="soft">Bu sürüm kapandı. Devam etmek için yeni sürümü yükle.</Txt>
          {canOpen ? null : <Txt tone="soft">Mağaza bağlantısı henüz yok.</Txt>}
        </View>
        <Button label={updateLabel} icon="open-outline" disabled={!canOpen} onPress={() => openUpdate(gate.url)} />
      </View>
    );
  }

  return (
    <View style={styles.scrim} pointerEvents="box-none">
      <View style={[styles.soft, { backgroundColor: p.surface, marginBottom: insets.bottom + space.lg }, softShadow(p)]}>
        <View style={styles.copy}>
          <Txt variant="title">Yeni sürüm hazır</Txt>
          <Txt tone="soft">İstediğin zaman güncelleyebilirsin. Masa aynı kalır.</Txt>
        </View>
        <Button label={updateLabel} icon="open-outline" disabled={!canOpen} onPress={() => openUpdate(gate.url)} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void AsyncStorage.setItem(DISMISS_KEY, gate.latest);
            setGate(null);
          }}
          hitSlop={8}
          style={styles.later}>
          <Txt variant="label" tone="soft">
            Sonra
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  force: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, paddingHorizontal: space.xl, justifyContent: "space-between" },
  scrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, justifyContent: "flex-end", paddingHorizontal: space.lg },
  soft: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  copy: { gap: space.sm },
  later: { alignItems: "center", paddingVertical: space.sm },
});
