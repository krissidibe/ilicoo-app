import StarRating from "@/src/components/StarRating";
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
import { mapRouteToMyPublishedTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { createRating } from "@/src/services/rating.service";
import { getMyRoutes } from "@/src/services/route.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

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

export type TripSheetContentProps = {
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
  /** Masque Démarrer / Terminer / Annuler (ex. fiche ouverte depuis la liste « Mes trajets ») */
  hideRouteActions?: boolean;
};

export const TripSheetContent = ({
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
  hideRouteActions = false,
}: TripSheetContentProps) => {
  const { close, expandedPassengerId, setExpandedPassengerId } =
    useBottomSheetStore();
  const [ratedPassengers, setRatedPassengers] = React.useState<Set<string>>(
    new Set(),
  );
  const ratingMutation = useMutation({
    mutationFn: createRating,
  });
  const { data: routesData } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });
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
    trip: t,
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
            onPress={() => onOpenPassengerMap(t, p)}
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
                onPress={() => onReject(t.id, p.id)}
                className="p-2 rounded-full bg-red-500/15"
              >
                <Ionicons name="close" size={18} color="#dc2626" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAccept(t, p.id)}
                disabled={t.availableSeats < p.seats}
                className={cn(
                  "p-2 rounded-full",
                  t.availableSeats >= p.seats
                    ? "bg-emerald-500/15"
                    : "bg-gray-200 opacity-50",
                )}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={t.availableSeats >= p.seats ? "#059669" : "#9ca3af"}
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
              Départ: {p.pickupAddress ?? t.from}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color="#e11d48"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Arrivée: {p.dropAddress ?? t.to}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="calendar-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Date: {p.date ?? t.date}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              Heure: {p.time ?? t.time}
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
              Prix: {p.price ?? t.price}
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
              name={statusStyle.icon as never}
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
            {trip.vehicleName} • {trip.availableSeats} places disponible
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

      {(trip.status === "En attente" || trip.status === "En cours") &&
        !hideRouteActions && (
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

      {trip.status === "Termine" && acceptedPassengers.length > 0 && (
        <View className="p-4 mt-4 bg-amber-50 rounded-2xl border border-amber-200">
          <Text className="mb-3 text-xs font-semibold tracking-wide text-amber-700 uppercase">
            Noter les passagers
          </Text>
          {acceptedPassengers
            .filter((p) => p.userId)
            .map((p) => (
              <View
                key={p.id}
                className="flex-row justify-between items-center mb-3"
              >
                <Text className="text-sm font-medium text-foreground">
                  {p.name}
                </Text>
                <StarRating
                  rating={0}
                  size={22}
                  editable={!ratedPassengers.has(p.id)}
                  onChange={(stars) => {
                    setRatedPassengers((prev) => new Set(prev).add(p.id));
                    ratingMutation.mutate({
                      routeId: trip.id,
                      toUserId: p.userId!,
                      stars,
                    });
                  }}
                />
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
};
