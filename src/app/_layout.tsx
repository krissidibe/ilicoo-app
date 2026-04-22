import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
import { AnimatedSplashGate } from "../components/AnimatedSplashGate";
import { DriverActiveTripGuard } from "../components/DriverActiveTripGuard";
import AppBottomSheet from "../components/Sheet/AppBottomSheet";
import "../global.css";
import { getUser } from "../lib/get-user";
import { NAV_THEME } from "../lib/theme";
import { useAuthStore } from "../store/auth.store";

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const refreshTrigger = useAuthStore((s) => s.refreshTrigger);
  /** Évite router.replace("/(tabs)") à chaque refresh : sinon on quitte active-trip. */
  const prevAuthenticatedRef = useRef<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getUser();
      const authenticated = Boolean(user?.id);
      const was = prevAuthenticatedRef.current;

      if (authenticated) {
        if (was === false || was === null) {
          router.replace("/(tabs)" as any);
        }
      } else {
        router.replace("/" as any);
      }

      prevAuthenticatedRef.current = authenticated;
      setIsAuthenticated(authenticated);
    })();
  }, [refreshTrigger]);

  const { theme } = useUniwind();
  Uniwind.setTheme("light");
  const queryClientRef = useRef(new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AnimatedSplashGate>
      <QueryClientProvider client={queryClientRef.current}>
        <SafeAreaListener
          onChange={({ insets }) => {
            Uniwind.updateInsets(insets);
          }}
        >
          <ThemeProvider value={NAV_THEME["light"]}>
            {isAuthenticated ? (
              <DriverActiveTripGuard isAuthenticated={isAuthenticated} />
            ) : null}
            <StatusBar />
            {/*  <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack> */}

            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(stack)" />
              </Stack.Protected>
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </SafeAreaListener>
        <AppBottomSheet />
      </QueryClientProvider>
      </AnimatedSplashGate>
    </GestureHandlerRootView>
  );
}
