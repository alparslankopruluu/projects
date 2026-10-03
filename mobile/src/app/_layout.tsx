import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { usePushRegistration } from "@/data/push";
import { StoreProvider, useStore } from "@/data/store";
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
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function PushBridge() {
  usePushRegistration(useStore().mode === "cloud");
  return null;
}
