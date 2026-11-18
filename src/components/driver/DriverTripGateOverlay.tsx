import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import type { MyPublishedTrip } from "@/src/data/myPublishedTrips";
import { formatDepartureLabel } from "@/src/lib/departureDisplay";
import { isDepartureDue } from "@/src/lib/tripSchedule";
import { mapRouteToMyPublishedTrip } from "@/src/lib/mappers";
import { getMyRoutes, updateRouteStatus } from "@/src/services/route.service";
import { queryKeys } from "@/src/services/queryKeys";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, View } from "react-native";

/**
 * Démarrage obligatoire à l'heure du trajet.
 * Un trajet déjà démarré est géré par DriverActiveTripGuard (redirection vers
 * la carte « active-trip ») : la pop-up « trop tôt pour terminer » vit dans cet écran.
 */
type GateTrip = MyPublishedTrip;

export function DriverTripGateOverlay() {
  const queryClient = useQueryClient();
  const segments = useSegments();
  const [now, setNow] = useState(() => new Date());

  const { data: routesData } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const gateTrip = useMemo((): GateTrip | null => {
    const trips = (routesData ?? []).map(mapRouteToMyPublishedTrip);

    const mustStart = trips.find(
      (trip) =>
        trip.status === "En attente" &&
        trip.departureAt &&
        isDepartureDue(trip.departureAt, now) &&
        trip.passengers.some((p) => p.status === "ACCEPTED"),
    );
    return mustStart ?? null;
  }, [routesData, now]);

  const startMutation = useMutation({
    mutationFn: (routeId: string) => updateRouteStatus(routeId, "ACCEPTED"),
    onSuccess: (_data, routeId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      router.push({
        pathname: "/(stack)/active-trip",
        params: { routeId },
      } as any);
    },
    onError: (error) => {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Impossible de démarrer le trajet",
      );
    },
  });

  // Modal RN = au-dessus de tout : on ne l'affiche que sur les onglets,
  // sinon elle masquerait les écrans empilés (carte du trajet, etc.).
  const onTabs = (segments as readonly string[])[0] === "(tabs)";
  if (!gateTrip || !onTabs) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View className="flex-1 justify-center items-center px-6 bg-black/60">
        <View className="p-6 w-full max-w-md bg-white rounded-3xl">
          <View className="items-center mb-4">
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={48}
              color="#6366f1"
            />
          </View>
          <Text className="mb-2 text-lg font-bold text-center text-foreground">
            Il est l&apos;heure de démarrer
          </Text>
          <Text className="mb-1 text-sm text-center text-muted-foreground">
            {gateTrip.from} → {gateTrip.to}
          </Text>
          <Text className="mb-6 text-sm text-center text-muted-foreground">
            Départ : {formatDepartureLabel(gateTrip.departureAt)}
          </Text>

          <Button
            className="rounded-xl"
            disabled={startMutation.isPending}
            onPress={() => startMutation.mutate(gateTrip.id)}
          >
            <Text className="font-semibold text-primary-foreground">
              {startMutation.isPending ? "Démarrage..." : "Démarrer le trajet"}
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
