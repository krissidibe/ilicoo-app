import HeaderApp from "@/src/components/Header/HeaderApp";
import { TripSheetContent } from "@/src/components/driver/TripSheetContent";
import { PassengerTripDetailBody } from "@/src/components/passenger/PassengerTripDetailBody";
import { Text } from "@/src/components/ui/text";
import type { MyPublishedTrip } from "@/src/data/myPublishedTrips";
import type { RecentTrip } from "@/src/data/recentTrips";
import { getUser } from "@/src/lib/get-user";
import { mapRoutePassengerToRecentTrip } from "@/src/lib/mappers";
import { queryKeys } from "@/src/services/queryKeys";
import { getMyRoutes, updateRouteStatus } from "@/src/services/route.service";
import {
  getRoutePassengers,
  updateRoutePassengerStatus,
} from "@/src/services/routePassenger.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
} from "react-native";
import { useTripMapSheets } from "@/src/hooks/useTripMapSheets";

type ViewMode = "passenger" | "driver";

const TripDetailScreen = () => {
  const params = useLocalSearchParams<{
    routeId: string;
    type: ViewMode;
  }>();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const user = await getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, []);

  const mode: ViewMode = params.type === "driver" ? "driver" : "passenger";

  const { data: routePassengersData, isLoading: loadingPassenger } = useQuery({
    ...getRoutePassengers(),
    enabled: mode === "passenger",
  });

  const { data: myRoutesData, isLoading: loadingDriver } = useQuery({
    ...getMyRoutes(),
    enabled: mode === "driver",
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "ACCEPTED" | "REJECTED";
    }) => updateRoutePassengerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
    },
  });

  const updateRouteStatusMutation = useMutation({
    mutationFn: ({
      routeId,
      status,
    }: {
      routeId: string;
      status: "ACCEPTED" | "COMPLETED" | "CANCELLED";
    }) => updateRouteStatus(routeId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      queryClient.invalidateQueries({ queryKey: ["routes", "stats"] });
    },
  });

  const handleAcceptPassenger = (
    trip: MyPublishedTrip,
    passengerId: string,
  ): void => {
    const passenger = trip.passengers.find((p) => p.id === passengerId);
    if (passenger && trip.availableSeats < passenger.seats) return;
    updateStatusMutation.mutate({ id: passengerId, status: "ACCEPTED" });
  };

  const handleRejectPassenger = (
    _tripId: string,
    passengerId: string,
  ): void => {
    updateStatusMutation.mutate({ id: passengerId, status: "REJECTED" });
  };

  const handleStartTrip = (tripId: string): void => {
    updateRouteStatusMutation.mutate(
      { routeId: tripId, status: "ACCEPTED" },
      {
        onSuccess: () => {
          router.push({
            pathname: "/(stack)/active-trip",
            params: { routeId: tripId },
          } as any);
        },
      },
    );
  };

  const handleCompleteTrip = (tripId: string): void => {
    updateRouteStatusMutation.mutate({ routeId: tripId, status: "COMPLETED" });
  };

  const handleCancelTrip = (tripId: string): void => {
    updateRouteStatusMutation.mutate({ routeId: tripId, status: "CANCELLED" });
  };

  const { openPassengerMapSheet, openTripMapSheet, callPassenger } =
    useTripMapSheets({
      onAcceptPassenger: handleAcceptPassenger,
      onRejectPassenger: handleRejectPassenger,
    });

  const isLoading = mode === "passenger" ? loadingPassenger : loadingDriver;

  /* ──────────────── PASSENGER : même contenu que le sheet index.tsx ──────────────── */
  if (mode === "passenger") {
    const tripData = (routePassengersData ?? []).find(
      (rp) => rp.route?.id === params.routeId || rp.routeID === params.routeId,
    );
    const trip: RecentTrip | null = tripData
      ? mapRoutePassengerToRecentTrip(tripData, currentUserId ?? undefined)
      : null;

    return (
      <View className="flex-1 bg-background">
        <HeaderApp title="Détails du trajet" />
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : !trip ? (
          <View className="flex-1 justify-center items-center px-8">
            <Text className="text-center text-muted-foreground">
              Trajet introuvable
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="px-6 py-3 mt-4 rounded-xl bg-primary"
            >
              <Text className="font-semibold text-white">Retour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <PassengerTripDetailBody trip={trip} />
        )}
      </View>
    );
  }

  /* ──────────────── CHAUFFEUR : même contenu que le sheet new-route (TripSheetContent) ──────────────── */
  if (!params.routeId) {
    return (
      <View className="flex-1 justify-center items-center px-8">
        <Text className="text-center text-muted-foreground">
          Paramètre manquant
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Détails du trajet" />
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : !(myRoutesData ?? []).some((r) => r.id === params.routeId) ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-center text-muted-foreground">
            Trajet introuvable
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 mt-4 rounded-xl bg-primary"
          >
            <Text className="font-semibold text-white">Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TripSheetContent
          tripId={params.routeId}
          onAccept={handleAcceptPassenger}
          onReject={handleRejectPassenger}
          onStartTrip={handleStartTrip}
          onCompleteTrip={handleCompleteTrip}
          onCancelTrip={handleCancelTrip}
          onOpenPassengerMap={openPassengerMapSheet}
          onOpenTripMap={openTripMapSheet}
          onCallPassenger={callPassenger}
          isRouteStatusPending={updateRouteStatusMutation.isPending}
        />
      )}
    </View>
  );
};

export default TripDetailScreen;
