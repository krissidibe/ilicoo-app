import { TripSheetContent } from "@/src/components/driver/TripSheetContent";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import type { MyPublishedTrip } from "@/src/data/myPublishedTrips";
import { useTripMapSheets } from "@/src/hooks/useTripMapSheets";
import { mapRouteToMyPublishedTrip, mapVehicleToUi } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { getPaymentsSummary } from "@/src/services/payment.service";
import { queryKeys } from "@/src/services/queryKeys";
import {
  getDriverStats,
  getMyRoutes,
  updateRouteStatus,
} from "@/src/services/route.service";
import { updateRoutePassengerStatus } from "@/src/services/routePassenger.service";
import {
  getVehicules,
  setDefaultVehicle,
} from "@/src/services/vehicle.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Vehicule = {
  id: string;
  name: string;
  default: boolean;
  color: string;
  NM: string;
  maximumPassenger: number;
  type?: "CAR" | "MOTORCYCLE";
};

const statusConfig = (
  status: MyPublishedTrip["status"],
): { statusColor: string; statusIconColor: string; icon: string } => {
  if (status === "Termine") {
    return {
      statusColor: "bg-emerald-500/15 text-emerald-600",
      statusIconColor: "#059669",
      icon: "check-circle-outline",
    };
  }
  if (status === "Annule") {
    return {
      statusColor: "bg-red-500/15 text-red-600",
      statusIconColor: "#dc2626",
      icon: "close-circle-outline",
    };
  }
  if (status === "En cours") {
    return {
      statusColor: "bg-blue-500/15 text-blue-600",
      statusIconColor: "#2563eb",
      icon: "car-outline",
    };
  }
  return {
    statusColor: "bg-amber-500/15 text-amber-600",
    statusIconColor: "#d97706",
    icon: "timer-outline",
  };
};

const Setting = () => {
  const { open, close } = useBottomSheetStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("mes-trajets");
  const [commissionPopupVisible, setCommissionPopupVisible] = useState(false);

  const { data: routesData, isLoading: isLoadingRoutes } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
    ...getVehicules(),
    refetchInterval: 5000,
  });
  const { data: driverStats } = useQuery({
    ...getDriverStats(),
    refetchInterval: 5000,
  });
  const { data: paymentsData } = useQuery({
    ...getPaymentsSummary(),
    refetchInterval: 5000,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules.all });
      queryClient.invalidateQueries({ queryKey: ["routes", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["payments", "summary"] });
    }, [queryClient]),
  );

  useEffect(() => {
    if ((paymentsData?.pendingPayments?.length ?? 0) > 0) {
      setCommissionPopupVisible(true);
    }
  }, [paymentsData?.pendingPayments?.length]);

  const trips: MyPublishedTrip[] = (routesData ?? []).map(
    mapRouteToMyPublishedTrip,
  );
  const vehicules: Vehicule[] = (vehiclesData ?? []).map(mapVehicleToUi);
  const firstPendingPayment = paymentsData?.pendingPayments?.[0];

  const activeTripInProgress = trips.find((t) => t.status === "En cours");

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules.all });
      close();
    },
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
      close();
    },
  });

  const toggleDefaultVehicule = (vehiculeId: string): void => {
    setDefaultMutation.mutate(vehiculeId);
  };

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

  const openTripSheet = (trip: MyPublishedTrip): void => {
    open(
      <TripSheetContent
        tripId={trip.id}
        onAccept={handleAcceptPassenger}
        onReject={handleRejectPassenger}
        onStartTrip={handleStartTrip}
        onCompleteTrip={handleCompleteTrip}
        onCancelTrip={handleCancelTrip}
        onOpenPassengerMap={openPassengerMapSheet}
        onOpenTripMap={openTripMapSheet}
        onCallPassenger={callPassenger}
        isRouteStatusPending={updateRouteStatusMutation.isPending}
      />,
      ["72%"],
    );
  };

  const openVehiculeModal = (vehicule: Vehicule): void => {
    open(
      <View className="px-5 pt-2 pb-7">
        <View className="flex-row items-center mb-4">
          <View className="justify-center items-center mr-3 bg-gray-200 rounded-xl size-12">
            <Ionicons
              name={
                vehicule.type === "MOTORCYCLE"
                  ? "bicycle-outline"
                  : "car-sport-outline"
              }
              size={24}
              color="black"
            />
          </View>
          <View>
            <Text className="text-lg font-semibold">{vehicule.name}</Text>
            <Text className="text-xs opacity-50">
              {vehicule.default ? "Véhicule par défaut" : "Véhicule secondaire"}
            </Text>
          </View>
        </View>

        <View className="gap-2 p-4 mb-6 rounded-2xl border border-gray">
          <Text className="text-sm">
            <Text className="font-semibold">Couleur: </Text>
            {vehicule.color}
          </Text>
          <Text className="text-sm">
            <Text className="font-semibold">Numéro matricule: </Text>
            {vehicule.NM}
          </Text>
          <Text className="text-sm">
            <Text className="font-semibold">Nombre de places: </Text>
            {vehicule.maximumPassenger}
          </Text>
        </View>

        <Button
          onPress={() => {
            if (!vehicule.default) toggleDefaultVehicule(vehicule.id);
            else close();
          }}
          className={cn("rounded-xl", vehicule.default && "bg-muted")}
        >
          <Text>
            {vehicule.default
              ? "Véhicule par défaut (sélectionnez un autre pour changer)"
              : "Définir comme véhicule par défaut"}
          </Text>
        </Button>
      </View>,
      ["40%"],
    );
  };

  return (
    <>
      {/* Popup optionnel: payer la commission - réaffiché à chaque retour sur l'app */}
      <Modal
        visible={commissionPopupVisible && firstPendingPayment != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCommissionPopupVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="p-6 w-[90%] max-w-md bg-white rounded-3xl items-center">
            <MaterialCommunityIcons
              name="cash-check"
              size={52}
              color="#6366f1"
              style={{ marginBottom: 12 }}
            />
            <Text className="mb-1 text-lg font-bold text-foreground">
              Commission à payer
            </Text>
            <Text className="mb-1 text-sm text-center text-muted-foreground">
              Trajet terminé: {firstPendingPayment?.route.pickupAddress} →{" "}
              {firstPendingPayment?.route.dropAddress}
            </Text>
            <Text className="mb-5 text-sm text-center text-muted-foreground">
              Vous avez une commission de{" "}
              {firstPendingPayment?.ilicoCommission.toLocaleString("fr-FR")}{" "}
              FCFA en attente de paiement.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setCommissionPopupVisible(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300"
              >
                <Text className="text-sm font-semibold text-muted-foreground">
                  Plus tard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCommissionPopupVisible(false);
                  router.push("/(stack)/payment" as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary"
              >
                <Text className="text-sm font-semibold text-white">Payer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View className="flex-1 bg-background">
        <View className="px-5 h-30 bg-primary pt-safe">
          <View className="flex-row justify-between items-center pt-3">
            <Text className="text-2xl font-bold text-white">
              {activeTab === "mes-trajets"
                ? "Publier un trajet"
                : "Mes véhicules"}
            </Text>
            {activeTab === "mes-trajets" ? (
              <TouchableOpacity
                onPress={() => router.push("/(stack)/share-route" as any)}
                className="p-2 rounded-full bg-white/0"
              >
                <Ionicons name="add-circle" size={28} color="white" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="flex-1 px-5 pt-4">
          <View className="hidden flex-row p-1 mb-4 rounded-xl bg-muted">
            <TouchableOpacity
              onPress={() => setActiveTab("mes-trajets")}
              className={cn(
                "flex-1 py-2 rounded-lg items-center justify-center",
                activeTab === "mes-trajets" && "bg-background shadow-sm",
              )}
            >
              <Text
                className={cn(
                  "font-semibold text-sm",
                  activeTab === "mes-trajets"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Mes trajets
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("vehicules")}
              className={cn(
                "flex-1 py-2 rounded-lg items-center justify-center",
                activeTab === "vehicules" && "bg-background shadow-sm",
              )}
            >
              <Text
                className={cn(
                  "font-semibold text-sm",
                  activeTab === "vehicules"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Véhicules
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "mes-trajets" ? (
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-0 pb-8"
              showsVerticalScrollIndicator={false}
            >
              {activeTripInProgress ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/(stack)/active-trip",
                      params: { routeId: activeTripInProgress.id },
                    } as any)
                  }
                  className="flex-row gap-3 items-center p-4 mb-4 bg-blue-50 rounded-2xl border border-blue-300"
                >
                  <MaterialCommunityIcons
                    name="map-marker-path"
                    size={28}
                    color="#2563eb"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-blue-900">
                      Trajet en cours
                    </Text>
                    <Text
                      className="text-xs text-blue-800/90"
                      numberOfLines={2}
                    >
                      {activeTripInProgress.from} → {activeTripInProgress.to}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-primary">
                      Reprendre la carte du trajet
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#2563eb" />
                </TouchableOpacity>
              ) : null}
              {/* Gains */}
              <View className="p-4 mb-6 rounded-2xl border border-primary/20 bg-primary/10">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm opacity-70">Gains gagnés</Text>
                  {driverStats && driverStats.completedCount > 0 ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-emerald-500/15">
                      <Ionicons
                        name="trending-up-outline"
                        size={14}
                        color="#10b981"
                      />
                      <Text className="ml-1 text-xs text-emerald-600">
                        {driverStats.completedCount} trajet(s) terminé(s)
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-2 text-3xl font-bold">
                  {(driverStats?.totalGains ?? 0).toLocaleString("fr-FR")} FCFA
                </Text>
                <Text className="mt-1 text-xs opacity-60">
                  Cumul des trajets terminés
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold">
                  Mes trajets publiés
                </Text>
              </View>

              <View className="gap-3">
                {isLoadingRoutes ? (
                  <ActivityIndicator
                    size="large"
                    color="#6366f1"
                    className="py-8"
                  />
                ) : trips.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground">
                      Aucun trajet publié
                    </Text>
                  </View>
                ) : (
                  trips.map((trip, index) => {
                    const statusStyle = statusConfig(trip.status);
                    const pendingCount = trip.passengers.filter(
                      (p) => p.status === "PENDING",
                    ).length;
                    const acceptedCount = trip.passengers.filter(
                      (p) => p.status === "ACCEPTED",
                    ).length;

                    return (
                      <Animated.View
                        key={trip.id}
                        entering={FadeInDown.delay(index * 80).duration(350)}
                      >
                        <TouchableOpacity
                          activeOpacity={0.9}
                          className="p-4 bg-white rounded-2xl border border-gray-300 shadow-sm shadow-black/5"
                          onPress={() => openTripSheet(trip)}
                        >
                          <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row flex-1 items-center pr-3">
                              <View className="p-2 mr-2 rounded-full bg-blue-500/10">
                                <MaterialCommunityIcons
                                  name="map-marker-outline"
                                  size={18}
                                  color="#2563eb"
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Départ
                                </Text>
                                <Text
                                  className="text-sm font-semibold text-foreground"
                                  numberOfLines={1}
                                >
                                  {trip.from}
                                </Text>
                              </View>
                            </View>
                            <View
                              className={cn(
                                "flex-row items-center rounded-full px-2 py-1",
                                statusStyle.statusColor,
                              )}
                            >
                              <MaterialCommunityIcons
                                name={statusStyle.icon as any}
                                size={14}
                                color={statusStyle.statusIconColor}
                              />
                              <Text className="ml-1 text-xs font-semibold">
                                {trip.status}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center mb-3">
                            <View className="p-2 mr-2 rounded-full bg-rose-500/10">
                              <MaterialCommunityIcons
                                name="map-marker-outline"
                                size={18}
                                color="#e11d48"
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Arrivée
                              </Text>
                              <Text
                                className="text-sm font-semibold text-foreground"
                                numberOfLines={1}
                              >
                                {trip.to}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row justify-between items-center">
                            <View className="flex-row gap-3 items-center">
                              <View className="flex-row items-center">
                                <MaterialCommunityIcons
                                  name="clock-outline"
                                  size={16}
                                  color="#9ca3af"
                                />
                                <Text className="ml-1 text-xs text-muted-foreground">
                                  {trip.date} {trip.time}
                                </Text>
                              </View>
                              <View className="flex-row flex-1 justify-end items-center">
                                <MaterialCommunityIcons
                                  name="cash-multiple"
                                  size={16}
                                  color="#10b981"
                                />
                                <Text className="ml-1 text-sm font-bold text-foreground">
                                  {trip.price}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View className="flex-row flex-wrap gap-2 items-center mt-2">
                            {pendingCount > 0 ? (
                              <View className="flex-row items-center">
                                <View className="flex-row -space-x-2">
                                  {trip.passengers
                                    .filter((p) => p.status === "PENDING")
                                    .slice(0, 3)
                                    .map((p) => (
                                      <Avatar
                                        key={p.id}
                                        className="border-2 border-white size-7"
                                        alt={p.name}
                                      >
                                        <AvatarImage
                                          source={{ uri: p.image }}
                                        />
                                        <AvatarFallback>
                                          <Text className="text-[8px]">
                                            {p.name[0]}
                                          </Text>
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                </View>
                                <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15">
                                  <Text className="text-xs font-semibold text-amber-700">
                                    {pendingCount} demande
                                    {pendingCount > 1 ? "s" : ""} en attente
                                  </Text>
                                </View>
                              </View>
                            ) : null}
                            {acceptedCount > 0 ? (
                              <View className="px-2 py-0.5 rounded-full bg-emerald-500/15">
                                <Text className="text-xs font-semibold text-emerald-700">
                                  {acceptedCount} demande
                                  {acceptedCount > 1 ? "s" : ""} acceptée
                                  {acceptedCount > 1 ? "s" : ""}
                                </Text>
                              </View>
                            ) : null}
                            {trip.passengers.length === 0 ? (
                              <View className="px-2 py-0.5 rounded-full bg-gray-200">
                                <Text className="text-xs font-medium text-muted-foreground">
                                  Aucune demande
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-0 pb-8"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-lg font-semibold">
                  Choisir un type de véhicule
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(stack)/manage-vehicle" as any)}
                >
                  <Text className="font-medium text-primary">Gérer</Text>
                </TouchableOpacity>
              </View>

              <View className="gap-4">
                {isLoadingVehicles ? (
                  <ActivityIndicator
                    size="large"
                    color="#6366f1"
                    className="py-8"
                  />
                ) : vehicules.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground">
                      Aucun véhicule
                    </Text>
                  </View>
                ) : (
                  vehicules.map((vehicule) => (
                    <TouchableOpacity
                      onPress={() => openVehiculeModal(vehicule)}
                      className={cn(
                        "flex-row items-center rounded-2xl border border-gray p-4 opacity-60",
                        vehicule.default &&
                          "border-primary bg-primary/5 opacity-100",
                      )}
                      key={vehicule.id}
                    >
                      <View className="justify-center items-center bg-gray-200 rounded-xl size-12">
                        <Ionicons
                          name={
                            vehicule.type === "MOTORCYCLE"
                              ? "bicycle-outline"
                              : "car-sport-outline"
                          }
                          size={24}
                          color="black"
                        />
                      </View>
                      <View className="flex-1 pl-3">
                        <Text className="text-base font-semibold">
                          {vehicule.name}
                        </Text>
                        <Text className="text-xs opacity-50">
                          {vehicule.default
                            ? "Véhicule par défaut"
                            : "Véhicule secondaire"}
                        </Text>
                      </View>

                      {vehicule.default ? (
                        <View className="px-2 py-1 rounded-full bg-primary/15">
                          <Text className="text-xs font-medium text-primary">
                            Sélectionné
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </>
  );
};

export default Setting;
