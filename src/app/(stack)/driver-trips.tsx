import { TripSheetContent } from "@/src/components/driver/TripSheetContent";
import { Text } from "@/src/components/ui/text";
import type {
  MyPublishedTrip,
  MyPublishedTripStatus,
} from "@/src/data/myPublishedTrips";
import { useTripMapSheets } from "@/src/hooks/useTripMapSheets";
import { mapRouteToMyPublishedTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { queryKeys } from "@/src/services/queryKeys";
import { getMyRoutes } from "@/src/services/route.service";
import { updateRoutePassengerStatus } from "@/src/services/routePassenger.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type TripTab = "Avenir" | "Passe";
const AVENIR_STATUSES: MyPublishedTripStatus[] = ["En attente", "En cours"];
const PASSE_STATUSES: MyPublishedTripStatus[] = ["Termine", "Annule"];

const statusConfig = (
  status: MyPublishedTripStatus,
): { statusColor: string; statusIconColor: string; icon: string } => {
  if (status === "Termine")
    return { statusColor: "bg-emerald-500/15 text-emerald-600", statusIconColor: "#059669", icon: "check-circle-outline" };
  if (status === "Annule")
    return { statusColor: "bg-red-500/15 text-red-600", statusIconColor: "#dc2626", icon: "close-circle-outline" };
  if (status === "En cours")
    return { statusColor: "bg-blue-500/15 text-blue-600", statusIconColor: "#2563eb", icon: "car-outline" };
  return { statusColor: "bg-amber-500/15 text-amber-600", statusIconColor: "#d97706", icon: "timer-outline" };
};

const DriverTripsScreen = () => {
  const [activeTab, setActiveTab] = useState<TripTab>("Avenir");
  const { open } = useBottomSheetStore();
  const queryClient = useQueryClient();

  const { data: routesData, isLoading } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });

  const allTrips: MyPublishedTrip[] = (routesData ?? []).map(mapRouteToMyPublishedTrip);

  const filteredTrips = React.useMemo(() => {
    const statuses = activeTab === "Avenir" ? AVENIR_STATUSES : PASSE_STATUSES;
    return allTrips.filter((trip) => statuses.includes(trip.status));
  }, [allTrips, activeTab]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "REJECTED" }) =>
      updateRoutePassengerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
    },
  });

  const handleAcceptPassenger = useCallback(
    (trip: MyPublishedTrip, passengerId: string): void => {
      const passenger = trip.passengers.find((p) => p.id === passengerId);
      if (passenger && trip.availableSeats < passenger.seats) return;
      updateStatusMutation.mutate({ id: passengerId, status: "ACCEPTED" });
    },
    [updateStatusMutation],
  );

  const handleRejectPassenger = useCallback(
    (_tripId: string, passengerId: string): void => {
      updateStatusMutation.mutate({ id: passengerId, status: "REJECTED" });
    },
    [updateStatusMutation],
  );

  const { openPassengerMapSheet, openTripMapSheet, callPassenger } =
    useTripMapSheets({
      onAcceptPassenger: handleAcceptPassenger,
      onRejectPassenger: handleRejectPassenger,
    });

  const openTripDetails = (trip: MyPublishedTrip) => {
    open(
      <TripSheetContent
        tripId={trip.id}
        onAccept={handleAcceptPassenger}
        onReject={handleRejectPassenger}
        onStartTrip={() => {}}
        onCompleteTrip={() => {}}
        onCancelTrip={() => {}}
        onOpenPassengerMap={openPassengerMapSheet}
        onOpenTripMap={openTripMapSheet}
        onCallPassenger={callPassenger}
        isRouteStatusPending={false}
        hideRouteActions
      />,
      ["72%"],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-4 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Mes trajets (Chauffeur)</Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center p-1 rounded-2xl bg-white/15">
          {(["Avenir", "Passe"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={cn("flex-1 rounded-xl py-2.5", activeTab === tab && "bg-white")}
              onPress={() => setActiveTab(tab)}
            >
              <Text className={cn("text-center text-xs font-semibold text-white", activeTab === tab && "text-slate-900")}>
                {tab === "Avenir" ? "Avenir" : "Passé"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-5" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {isLoading ? (
            <ActivityIndicator size="large" color="#6366f1" className="py-8" />
          ) : filteredTrips.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-muted-foreground">
                Aucun trajet {activeTab === "Avenir" ? "à venir" : "passé"}
              </Text>
            </View>
          ) : (
            filteredTrips.map((trip, index) => {
              const statusStyle = statusConfig(trip.status);
              const pendingCount = trip.passengers.filter((p) => p.status === "PENDING").length;
              const acceptedCount = trip.passengers.filter((p) => p.status === "ACCEPTED").length;

              return (
                <Animated.View key={trip.id} entering={FadeInDown.delay(100 + index * 80).duration(350)}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="p-4 bg-white rounded-2xl border border-gray-300 shadow-sm shadow-black/5"
                    onPress={() => openTripDetails(trip)}
                  >
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row flex-1 items-center pr-3">
                        <View className="p-2 mr-2 rounded-full bg-blue-500/10">
                          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Départ</Text>
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{trip.from}</Text>
                        </View>
                      </View>
                      <View className={cn("flex-row items-center rounded-full px-2 py-1", statusStyle.statusColor)}>
                        <MaterialCommunityIcons name={statusStyle.icon as any} size={14} color={statusStyle.statusIconColor} />
                        <Text className="ml-1 text-xs font-semibold">{trip.status}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-3">
                      <View className="p-2 mr-2 rounded-full bg-rose-500/10">
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color="#e11d48" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Arrivée</Text>
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{trip.to}</Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#9ca3af" />
                        <Text className="ml-1 text-xs text-muted-foreground">{trip.date} {trip.time}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="cash-multiple" size={16} color="#10b981" />
                        <Text className="ml-1 text-sm font-bold text-foreground">{trip.price}</Text>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap gap-2 items-center mt-2">
                      {pendingCount > 0 && (
                        <View className="px-2 py-0.5 rounded-full bg-amber-500/15">
                          <Text className="text-xs font-semibold text-amber-700">
                            {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente
                          </Text>
                        </View>
                      )}
                      {acceptedCount > 0 && (
                        <View className="px-2 py-0.5 rounded-full bg-emerald-500/15">
                          <Text className="text-xs font-semibold text-emerald-700">
                            {acceptedCount} passager{acceptedCount > 1 ? "s" : ""} accepté{acceptedCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                      {trip.passengers.length === 0 && (
                        <View className="px-2 py-0.5 rounded-full bg-gray-200">
                          <Text className="text-xs font-medium text-muted-foreground">Aucune demande</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default DriverTripsScreen;
