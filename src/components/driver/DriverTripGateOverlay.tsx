import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import type { MyPublishedTrip } from "@/src/data/myPublishedTrips";
import { formatDepartureLabel } from "@/src/lib/departureDisplay";
import {
  formatTimeFr,
  getRouteArrivalAt,
  isArrivalDue,
  isDepartureDue,
} from "@/src/lib/tripSchedule";
import { mapRouteToMyPublishedTrip } from "@/src/lib/mappers";
import { getMyRoutes, updateRouteStatus } from "@/src/services/route.service";
import { queryKeys } from "@/src/services/queryKeys";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, View } from "react-native";

type GateTrip = MyPublishedTrip & { gate: "start" | "complete" };

export function DriverTripGateOverlay() {
  const queryClient = useQueryClient();
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

    const mustComplete = trips.find(
      (trip) =>
        trip.status === "En cours" &&
        trip.departureAt &&
        isDepartureDue(trip.departureAt, now) &&
        !isArrivalDue(trip.departureAt, trip.durationMin ?? 0, now),
    );
    if (mustComplete) {
      return { ...mustComplete, gate: "complete" };
    }

    const mustStart = trips.find(
      (trip) =>
        trip.status === "En attente" &&
        trip.departureAt &&
        isDepartureDue(trip.departureAt, now) &&
        trip.passengers.some((p) => p.status === "ACCEPTED"),
    );
    if (mustStart) {
      return { ...mustStart, gate: "start" };
    }

    return null;
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

  if (!gateTrip) {
    return null;
  }

  const arrivalAt = getRouteArrivalAt(
    gateTrip.departureAt,
    gateTrip.durationMin ?? 0,
  );
  const arrivalLabel = arrivalAt ? formatTimeFr(arrivalAt) : "—";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View className="flex-1 justify-center items-center px-6 bg-black/60">
        <View className="p-6 w-full max-w-md bg-white rounded-3xl">
          <View className="items-center mb-4">
            <MaterialCommunityIcons
              name={gateTrip.gate === "start" ? "clock-alert-outline" : "flag-checkered"}
              size={48}
              color="#6366f1"
            />
          </View>
          <Text className="mb-2 text-lg font-bold text-center text-foreground">
            {gateTrip.gate === "start"
              ? "Il est l'heure de démarrer"
              : "Trajet en cours"}
          </Text>
          <Text className="mb-1 text-sm text-center text-muted-foreground">
            {gateTrip.from} → {gateTrip.to}
          </Text>
          <Text className="mb-6 text-sm text-center text-muted-foreground">
            Départ : {formatDepartureLabel(gateTrip.departureAt)}
          </Text>

          {gateTrip.gate === "start" ? (
            <Button
              className="rounded-xl"
              disabled={startMutation.isPending}
              onPress={() => startMutation.mutate(gateTrip.id)}
            >
              <Text className="font-semibold text-primary-foreground">
                {startMutation.isPending ? "Démarrage..." : "Démarrer le trajet"}
              </Text>
            </Button>
          ) : (
            <>
              <Text className="mb-4 text-sm text-center text-muted-foreground">
                Le trajet vient d&apos;être démarré. Il ne peut être terminé
                qu&apos;à partir de {arrivalLabel} (heure d&apos;arrivée selon
                Maps).
              </Text>
              <Button
                className="rounded-xl"
                disabled
                variant="secondary"
              >
                <Text>Terminer le trajet</Text>
              </Button>
              <Button
                className="mt-3 rounded-xl"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/(stack)/active-trip",
                    params: { routeId: gateTrip.id },
                  } as any)
                }
              >
                <Text>Voir le trajet en cours</Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
