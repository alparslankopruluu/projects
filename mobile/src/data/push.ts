import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { savePushToken } from "./store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

// Registers this device for the daily Claude digest (functions/dailyDigest) once the user is in cloud mode.
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    // Expo push tokens need an EAS project id; until `eas init` runs there is nothing to register.
    if (!projectId) return;
    (async () => {
      const current = await Notifications.getPermissionsAsync();
      const status = current.granted ? current.status : (await Notifications.requestPermissionsAsync()).status;
      if (status !== "granted") return;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      await savePushToken(token.data);
    })().catch(() => undefined);
  }, [enabled]);
}
