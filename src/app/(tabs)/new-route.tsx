import { RoutePolyline } from "@/src/components/Map/RoutePolyline";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import type {
  MyPublishedTrip,
  PassengerRequest,
} from "@/src/data/myPublishedTrips";
import { mapRouteToMyPublishedTrip, mapVehicleToUi } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
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
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
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

type TripSheetContentProps = {
  tripId: string;
  onAccept: (trip: MyPublishedTrip, passengerId: string) => void;
  onReject: (tripId: string, passengerId: string) => void;
  onStartTrip: (tripId: string) => void;
  onCompleteTrip: (tripId: string) => void;
  onCancelTrip: (tripId: string) => void;
  onOpenPassengerMap: (trip: MyPublishedTrip, p: PassengerRequest) => void;
  onOpenTripMap: (trip: MyPublishedTrip) => void;
  onCallPassenger: (phone: string) => void;
  isRouteStatusPending: boolean;
};

const TripSheetContent = ({
  tripId,
  onAccept,
  onReject,
  onStartTrip,
  onCompleteTrip,
  onCancelTrip,
  onOpenPassengerMap,
  onOpenTripMap,
  onCallPassenger,
  isRouteStatusPending,
}: TripSheetContentProps) => {
  const { close, expandedPassengerId, setExpandedPassengerId } =
    useBottomSheetStore();
  const { data: routesData } = useQuery(getMyRoutes());
  const trip: MyPublishedTrip | undefined = React.useMemo(() => {
    const route = (routesData ?? []).find((r) => r.id === tripId);
    return route ? mapRouteToMyPublishedTrip(route) : undefined;
  }, [routesData, tripId]);

  if (!trip) {
    return (
      <View className="p-5">
        <Text className="text-muted-foreground">Chargement...</Text>
      </View>
    );
  }

  const statusStyle = statusConfig(trip.status);
  const pendingPassengers = trip.passengers.filter(
    (p) => p.status === "PENDING",
  );
  const acceptedPassengers = trip.passengers.filter(
    (p) => p.status === "ACCEPTED",
  );

  const PassengerAccordion = ({
    p,
    trip,
    isAccepted,
  }: {
    p: PassengerRequest;
    trip: MyPublishedTrip;
    isAccepted: boolean;
  }) => (
    <View
      key={p.id}
      className={cn(
        "overflow-hidden rounded-xl",
        isAccepted ? "border border-emerald-200" : "border border-gray-200",
      )}
    >
      <TouchableOpacity
        onPress={() =>
          setExpandedPassengerId(expandedPassengerId === p.id ? null : p.id)
        }
        className={cn(
          "flex-row justify-between items-center p-3",
          isAccepted ? "bg-emerald-50" : "bg-gray-50",
        )}
      >
        <View className="flex-row flex-1 items-center">
          <Avatar
            className={cn(isAccepted ? "size-8" : "size-10")}
            alt={p.name}
          >
            <AvatarImage source={{ uri: p.image }} />
            <AvatarFallback>
              <Text className={cn(isAccepted ? "text-[10px]" : "text-xs")}>
                {p.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-semibold">{p.name}</Text>
            <Text className="text-xs text-muted-foreground">
              {p.seats} place(s) • {p.rating}★{" "}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {!isAccepted && `${p.requestedAt}`}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2 items-center">
          <TouchableOpacity
            onPress={() => onOpenPassengerMap(trip, p)}
            className={cn(
              "rounded-full",
              isAccepted ? "p-1.5 bg-blue-500/15" : "p-2 bg-blue-500/15",
            )}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={isAccepted ? 14 : 18}
              color="#2563eb"
            />
          </TouchableOpacity>
          {!isAccepted && (
            <>
              <TouchableOpacity
                onPress={() => onReject(trip.id, p.id)}
                className="p-2 rounded-full bg-red-500/15"
              >
                <Ionicons name="close" size={18} color="#dc2626" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAccept(trip, p.id)}
                disabled={trip.availableSeats < p.seats}
                className={cn(
                  "p-2 rounded-full",
                  trip.availableSeats >= p.seats
                    ? "bg-emerald-500/15"
                    : "bg-gray-200 opacity-50",
                )}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={trip.availableSeats >= p.seats ? "#059669" : "#9ca3af"}
                />
              </TouchableOpacity>
            </>
          )}
          {isAccepted && p.phone && (
            <TouchableOpacity
              onPress={() => onCallPassenger(p.phone!)}
              className="p-1.5 rounded-full bg-emerald-500/15"
            >
              <Ionicons name="call" size={14} color="#059669" />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expandedPassengerId === p.id ? "chevron-up" : "chevron-down"}
            size={isAccepted ? 16 : 18}
            color="#64748b"
          />
        </View>
      </TouchableOpacity>
      {expandedPassengerId === p.id && (
        <View
          className={cn(
            "p-3 bg-white border-t",
            isAccepted ? "border-emerald-200" : "border-gray-200",
          )}
        >
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color="#2563eb"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Départ: {p.pickupAddress ?? trip.from}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color="#e11d48"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Arrivée: {p.dropAddress ?? trip.to}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="calendar-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Date: {p.date ?? trip.date}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Heure: {p.time ?? trip.time}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="account-group-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Places réservées: {p.seats}
            </Text>
          </View>
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="cash-multiple"
              size={14}
              color="#10b981"
            />
            <Text className="ml-1 text-xs font-semibold">
              Prix: {p.price ?? trip.price}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView className="px-5 pt-2 pb-7" showsVerticalScrollIndicator={false}>
      <View className="flex-row justify-between items-center">
        <Text className="text-lg font-bold text-foreground">
          Détails du trajet
        </Text>
        {trip.pickupLat != null && trip.dropLat != null && (
          <TouchableOpacity
            onPress={() => {
              close();
              onOpenTripMap(trip);
            }}
            className="p-2 rounded-full bg-primary/10"
          >
            <MaterialCommunityIcons
              name="map-marker-path"
              size={22}
              color="#6366f1"
            />
          </TouchableOpacity>
        )}
      </View>

      <View className="p-4 mt-4 bg-white rounded-2xl border border-gray-300">
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
            <Text className="ml-1 text-xs font-semibold">{trip.status}</Text>
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
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              {trip.date} - {trip.time}
            </Text>
          </View>
          <View className="flex-row items-center">
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
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="car-outline"
            size={16}
            color="#9ca3af"
          />
          <Text className="ml-1 text-xs text-muted-foreground">
            {trip.vehicleName} • {trip.availableSeats}/{trip.totalSeats} places
          </Text>
        </View>
      </View>

      {pendingPassengers.length > 0 && (
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-foreground">
              Demandes en attente ({pendingPassengers.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                close();
                onOpenTripMap(trip);
              }}
              className="flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/10"
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={16}
                color="#6366f1"
              />
              <Text className="text-xs font-semibold text-primary">
                Voir sur carte
              </Text>
            </TouchableOpacity>
          </View>
          <View className="gap-2">
            {pendingPassengers.map((p) => (
              <PassengerAccordion
                key={p.id}
                p={p}
                trip={trip}
                isAccepted={false}
              />
            ))}
          </View>
        </View>
      )}

      {(trip.status === "En attente" || trip.status === "En cours") && (
        <View className="flex-row gap-2 mt-4">
          {trip.status === "En attente" ? (
            <Button
              className="flex-1 rounded-xl"
              onPress={() => onStartTrip(trip.id)}
              disabled={isRouteStatusPending || acceptedPassengers.length === 0}
            >
              <Text>Démarrer le trajet</Text>
            </Button>
          ) : trip.status === "En cours" ? (
            <Button
              className="flex-1 rounded-xl"
              onPress={() => onCompleteTrip(trip.id)}
              disabled={isRouteStatusPending}
            >
              <Text>Terminer le trajet</Text>
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="rounded-xl"
            onPress={() => onCancelTrip(trip.id)}
            disabled={isRouteStatusPending}
          >
            <Text>Annuler</Text>
          </Button>
        </View>
      )}

      {acceptedPassengers.length > 0 && (
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-foreground">
              Passagers acceptés
            </Text>
            <TouchableOpacity
              onPress={() => {
                close();
                onOpenTripMap(trip);
              }}
              className="flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/10"
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={16}
                color="#6366f1"
              />
              <Text className="text-xs font-semibold text-primary">
                Voir sur carte
              </Text>
            </TouchableOpacity>
          </View>
          <View className="gap-2">
            {acceptedPassengers.map((p) => (
              <PassengerAccordion key={p.id} p={p} trip={trip} isAccepted />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const Setting = () => {
  const { open, close } = useBottomSheetStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("mes-trajets");

  const { data: routesData, isLoading: isLoadingRoutes } =
    useQuery(getMyRoutes());
  const { data: vehiclesData, isLoading: isLoadingVehicles } =
    useQuery(getVehicules());
  const { data: driverStats } = useQuery(getDriverStats());

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicules.all });
      queryClient.invalidateQueries({ queryKey: ["routes", "stats"] });
    }, [queryClient]),
  );

  const trips: MyPublishedTrip[] = (routesData ?? []).map(
    mapRouteToMyPublishedTrip,
  );
  const vehicules: Vehicule[] = (vehiclesData ?? []).map(mapVehicleToUi);

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
    updateRouteStatusMutation.mutate({ routeId: tripId, status: "ACCEPTED" });
  };

  const handleCompleteTrip = (tripId: string): void => {
    updateRouteStatusMutation.mutate({ routeId: tripId, status: "COMPLETED" });
  };

  const handleCancelTrip = (tripId: string): void => {
    updateRouteStatusMutation.mutate({ routeId: tripId, status: "CANCELLED" });
  };

  const callPassenger = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
  };

  const getPassengerRoute = (
    trip: MyPublishedTrip,
    passenger: PassengerRequest,
  ) => {
    const coords = passenger.routeCoordinates?.length
      ? passenger.routeCoordinates
      : trip.routeCoordinates;
    const pickup =
      passenger.pickupLat != null
        ? { lat: passenger.pickupLat, lng: passenger.pickupLng! }
        : coords?.[0]
          ? { lat: coords[0].latitude, lng: coords[0].longitude }
          : null;
    const drop =
      passenger.dropLat != null
        ? { lat: passenger.dropLat, lng: passenger.dropLng! }
        : coords?.[coords.length - 1]
          ? {
              lat: coords[coords.length - 1].latitude,
              lng: coords[coords.length - 1].longitude,
            }
          : null;
    return { coords: coords ?? [], pickup, drop };
  };

  const openPassengerMapSheet = (
    trip: MyPublishedTrip,
    passenger: PassengerRequest,
  ): void => {
    const { pickup, drop } = getPassengerRoute(trip, passenger);
    if (!pickup || !drop) return;

    const region = {
      latitude: (pickup.lat + drop.lat) / 2,
      longitude: (pickup.lng + drop.lng) / 2,
      latitudeDelta: Math.max(0.05, Math.abs(drop.lat - pickup.lat) * 1.5),
      longitudeDelta: Math.max(0.05, Math.abs(drop.lng - pickup.lng) * 1.5),
    };

    open(
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-5 py-3 border-b border-gray-200">
          <Text className="text-base font-semibold">
            Trajet de {passenger.name}
          </Text>
          <TouchableOpacity onPress={close} className="p-2">
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 min-h-[400px]">
          <MapView
            style={{ flex: 1, width: "100%" }}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
          >
            <Marker
              coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
              title="Prise en charge"
              pinColor="#2563eb"
            />
            <Marker
              coordinate={{ latitude: drop.lat, longitude: drop.lng }}
              title="Dépose"
              pinColor="#e11d48"
            />
            <RoutePolyline
              pickupLat={pickup.lat}
              pickupLng={pickup.lng}
              dropLat={drop.lat}
              dropLng={drop.lng}
              strokeColor="#0ea5e9"
              strokeWidth={4}
            />
          </MapView>
        </View>
      </View>,
      ["50%"],
    );
  };

  const openTripMapSheet = (trip: MyPublishedTrip): void => {
    const hasCoords =
      trip.pickupLat != null &&
      trip.pickupLng != null &&
      trip.dropLat != null &&
      trip.dropLng != null;
    if (!hasCoords) return;

    const allPassengers = trip.passengers.filter(
      (p) => p.status === "PENDING" || p.status === "ACCEPTED",
    );

    const allPoints: { lat: number; lng: number }[] = [];
    trip.routeCoordinates?.forEach((c) =>
      allPoints.push({ lat: c.latitude, lng: c.longitude }),
    );
    allPassengers.forEach((p) => {
      p.routeCoordinates?.forEach((c) =>
        allPoints.push({ lat: c.latitude, lng: c.longitude }),
      );
    });

    if (allPoints.length === 0 && trip.routeCoordinates?.length) {
      trip.routeCoordinates.forEach((c) =>
        allPoints.push({ lat: c.latitude, lng: c.longitude }),
      );
    }

    const region =
      allPoints.length === 0
        ? {
            latitude: 12.6392,
            longitude: -8.0029,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
          }
        : (() => {
            const lats = allPoints.map((x) => x.lat);
            const lngs = allPoints.map((x) => x.lng);
            return {
              latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
              longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
              latitudeDelta: Math.max(
                0.05,
                (Math.max(...lats) - Math.min(...lats)) * 1.5,
              ),
              longitudeDelta: Math.max(
                0.05,
                (Math.max(...lngs) - Math.min(...lngs)) * 1.5,
              ),
            };
          })();

    const colors = ["#2563eb", "#059669", "#7c3aed", "#ea580c", "#0d9488"];

    open(
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-5 py-3 border-b border-gray-200">
          <Text className="text-base font-semibold">
            {allPassengers.length > 0
              ? "Mon itinéraire et passagers"
              : "Mon itinéraire"}
          </Text>
          <TouchableOpacity onPress={close} className="p-2">
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 min-h-[400px]">
          <MapView
            style={{ flex: 1, width: "100%" }}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
          >
            <RoutePolyline
              pickupLat={trip.pickupLat!}
              pickupLng={trip.pickupLng!}
              dropLat={trip.dropLat!}
              dropLng={trip.dropLng!}
              strokeColor="#0ea5e9"
              strokeWidth={5}
            />
            {trip.pickupLat != null && trip.dropLat != null && (
              <Marker
                coordinate={{
                  latitude: trip.pickupLat,
                  longitude: trip.pickupLng!,
                }}
                title="Votre départ"
                pinColor="#2563eb"
              />
            )}
            {trip.dropLat != null && (
              <Marker
                coordinate={{
                  latitude: trip.dropLat,
                  longitude: trip.dropLng!,
                }}
                title="Votre arrivée"
                pinColor="#e11d48"
              />
            )}
            {allPassengers.map((p, i) => {
              const { pickup, drop } = getPassengerRoute(trip, p);
              const color = colors[i % colors.length];
              if (!pickup || !drop) return null;
              return (
                <React.Fragment key={p.id}>
                  <Marker
                    coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                    title={p.name}
                    pinColor={color}
                  />
                  <RoutePolyline
                    pickupLat={pickup.lat}
                    pickupLng={pickup.lng}
                    dropLat={drop.lat}
                    dropLng={drop.lng}
                    strokeColor={color}
                    strokeWidth={3}
                  />
                </React.Fragment>
              );
            })}
          </MapView>
        </View>
        <ScrollView
          horizontal
          className="px-4 py-3 max-h-32 border-t border-gray-200"
          showsHorizontalScrollIndicator={false}
        >
          {allPassengers.map((p, i) => (
            <View
              key={p.id}
              className="flex-row items-center mr-3 p-3 rounded-xl border border-gray-200 bg-gray-50 min-w-[140px]"
            >
              <Avatar className="size-8" alt={p.name}>
                <AvatarImage source={{ uri: p.image }} />
                <AvatarFallback>
                  <Text className="text-[10px]">{p.name[0]}</Text>
                </AvatarFallback>
              </Avatar>
              <View className="flex-1 ml-2">
                <Text className="text-xs font-semibold" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {p.status === "ACCEPTED" ? "Accepté" : "En attente"}
                </Text>
              </View>
              {p.status === "PENDING" ? (
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    onPress={() => {
                      handleRejectPassenger(trip.id, p.id);
                      close();
                    }}
                    className="p-1.5 rounded-full bg-red-500/15"
                  >
                    <Ionicons name="close" size={14} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      handleAcceptPassenger(trip, p.id);
                      close();
                    }}
                    className="p-1.5 rounded-full bg-emerald-500/15"
                  >
                    <Ionicons name="checkmark" size={14} color="#059669" />
                  </TouchableOpacity>
                </View>
              ) : p.phone ? (
                <TouchableOpacity
                  onPress={() => callPassenger(p.phone!)}
                  className="p-1.5 rounded-full bg-primary/15"
                >
                  <Ionicons name="call" size={14} color="#6366f1" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>,
      ["60%"],
    );
  };

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
              <Text className="text-lg font-semibold">Mes trajets publiés</Text>
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
                                      <AvatarImage source={{ uri: p.image }} />
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
                                {acceptedCount} passager
                                {acceptedCount > 1 ? "s" : ""} accepté
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
                  <Text className="text-muted-foreground">Aucun véhicule</Text>
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
  );
};

export default Setting;
