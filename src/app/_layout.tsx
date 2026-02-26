import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind, useUniwind } from "uniwind";
import AppBottomSheet from "../components/Sheet/AppBottomSheet";
import "../global.css";
import { NAV_THEME } from "../lib/theme";
export default function RootLayout() {
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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </SafeAreaListener>
        <AppBottomSheet />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
