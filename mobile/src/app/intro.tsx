import { useEventListener } from "expo";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Platform, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, RoundButton } from "@/ui/kit";
import { MAX_WIDTH, space } from "@/ui/theme";

// Rendered with Remotion from video/src/Kickoff.tsx (npm run render:kickoff), downscaled to 720p for the bundle.
const KICKOFF = require("@/assets/video/kickoff.mp4");

export default function Intro() {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(KICKOFF, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  // Calling play() before the source is loaded is ignored on web, so start once it is ready.
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && !player.playing) player.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F4EF", alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: MAX_WIDTH }}>
        {Platform.OS === "web" ? (
          // expo-video routes web audio through an AudioContext, which blocks gesture-free autoplay.
          <video src={KICKOFF.uri ?? KICKOFF} autoPlay muted loop playsInline style={{ flex: 1, width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <VideoView player={player} style={{ flex: 1, width: "100%" }} contentFit="contain" nativeControls={false} />
        )}
        <View style={{ position: "absolute", top: insets.top + space.md, left: space.lg }}>
          <RoundButton icon="close" label="Kapat" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
        <Animated.View entering={FadeInUp.delay(600)} style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.xl }}>
          <Button label="Başla" icon="arrow-forward" onPress={() => router.replace("/")} />
        </Animated.View>
      </View>
    </View>
  );
}
