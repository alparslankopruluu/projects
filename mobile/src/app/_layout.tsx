import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useNoteAlarms } from "@/data/alarm";
import { usePushRegistration } from "@/data/push";
import { ReleaseGate } from "@/data/release";
import { StoreProvider, useStore } from "@/data/store";
import { collectNotes } from "@/domain/notes";
import { usePalette } from "@/ui/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const p = usePalette();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={{ ...base, colors: { ...base.colors, background: p.bg } }}>
        <StoreProvider>
          <PushBridge />
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: "slide_from_right" }}>
            <Stack.Screen name="new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          </Stack>
          <ReleaseGate />
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function PushBridge() {
  const store = useStore();
  usePushRegistration(store.mode === "cloud");
  const alarms = useMemo(
    () => collectNotes(store.projects, store.sharedNotes, store.sharedProjects).map((note) => ({ id: note.id, alarmAt: note.alarmAt, projectName: note.projectName })),
    [store.projects, store.sharedNotes, store.sharedProjects],
  );
  useNoteAlarms(alarms);
  return null;
}
