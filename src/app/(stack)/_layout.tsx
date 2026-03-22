import { Stack } from "expo-router";
import React from "react";

/**
 * Écran active-trip : pas de swipe retour — le chauffeur doit terminer ou annuler.
 */
export default function StackGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="active-trip"
        options={{
          gestureEnabled: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
