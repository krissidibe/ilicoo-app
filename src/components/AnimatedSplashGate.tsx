import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

void SplashScreen.preventAutoHideAsync();

const LOGO = require("../../assets/images/splash-icon.png");

type Props = {
  children: React.ReactNode;
};

/**
 * Conserve l’écran de lancement natif, puis anime le logo avant d’afficher l’app.
 */
export const AnimatedSplashGate = ({ children }: Props) => {
  const [visible, setVisible] = useState(true);
  const scale = useSharedValue(0.65);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    logoOpacity.value = withTiming(1, { duration: 280 });
    scale.value = withTiming(1, { duration: 900 });
    const t = setTimeout(() => {
      void (async () => {
        try {
          await SplashScreen.hideAsync();
        } finally {
          if (!cancelled) {
            setVisible(false);
          }
        }
      })();
    }, 1050);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [logoOpacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      {children}
      <View style={styles.overlay} pointerEvents="auto">
        <Animated.View style={animStyle}>
          <Image
            source={LOGO}
            style={styles.logo}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 200, height: 200 },
});
