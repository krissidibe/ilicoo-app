import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
import AppBottomSheet from "../components/Sheet/AppBottomSheet";
import "../global.css";
import { getUser } from "../lib/get-user";
import { NAV_THEME } from "../lib/theme";
export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (user?.id) {
        router.push("/(tabs)");
      }
      setIsAuthenticated(user?.id ? true : false);
    })();
  }, []);

  const { theme } = useUniwind();
  Uniwind.setTheme("light");
  const queryClientRef = useRef(new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClientRef.current}>
        <SafeAreaListener
          onChange={({ insets }) => {
            Uniwind.updateInsets(insets);
          }}
        >
          <ThemeProvider value={NAV_THEME["light"]}>
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
    </GestureHandlerRootView>
  );
}
