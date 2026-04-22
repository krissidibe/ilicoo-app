import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { AvatarWithVerifiedOutline } from "@/src/components/VerifiedBadge";
import type {
  MyPublishedTrip,
  PassengerRequest,
} from "@/src/data/myPublishedTrips";
import { mapRouteToMyPublishedTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { getMyRoutes } from "@/src/services/route.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
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
  const completedPassengers = trip.passengers.filter(
    (p) => p.status === "COMPLETED",
  );
  const passengersOnBoard =
    trip.status === "Termine" ? completedPassengers : acceptedPassengers;

  const PassengerAccordion = ({
    p,
    trip: t,
    isOnBoard,
  }: {
    p: PassengerRequest;
    trip: MyPublishedTrip;
    isOnBoard: boolean;
  }) => (
    <View
      key={p.id}
      className={cn(
        "overflow-hidden rounded-xl",
        isOnBoard ? "border border-emerald-200" : "border border-gray-200",
      )}
    >
      <TouchableOpacity
        onPress={() =>
          setExpandedPassengerId(expandedPassengerId === p.id ? null : p.id)
        }
        className={cn(
          "flex-row justify-between items-center p-3",
          isOnBoard ? "bg-emerald-50" : "bg-gray-50",
        )}
      >
        <View className="flex-row flex-1 items-center">
          <AvatarWithVerifiedOutline isVerified={p.isVerified} badgeSize={12}>
            <Avatar
              className={cn(isOnBoard ? "size-8" : "size-10")}
              alt={p.name}
            >
              <AvatarImage source={{ uri: p.image }} />
              <AvatarFallback>
                <Text className={cn(isOnBoard ? "text-[10px]" : "text-xs")}>
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </Text>
              </AvatarFallback>
            </Avatar>
          </AvatarWithVerifiedOutline>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-semibold">{p.name}</Text>
            <Text className="text-xs text-muted-foreground">
              {p.seats} place(s) • {p.rating}★{" "}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {!isOnBoard && `${p.requestedAt}`}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2 items-center">
          <TouchableOpacity
            onPress={() => onOpenPassengerMap(t, p)}
            className={cn(
              "rounded-full",
              isOnBoard ? "p-1.5 bg-blue-500/15" : "p-2 bg-blue-500/15",
            )}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={isOnBoard ? 14 : 18}
              color="#2563eb"
            />
          </TouchableOpacity>
          {!isOnBoard && (
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
          {isOnBoard && p.phone && (
            <TouchableOpacity
              onPress={() => onCallPassenger(p.phone!)}
              className="p-1.5 rounded-full bg-emerald-500/15"
            >
              <Ionicons name="call" size={14} color="#059669" />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expandedPassengerId === p.id ? "chevron-up" : "chevron-down"}
            size={isOnBoard ? 16 : 18}
            color="#64748b"
          />
        </View>
      </TouchableOpacity>
      {expandedPassengerId === p.id && (
        <View
          className={cn(
            "p-3 bg-white border-t",
            isOnBoard ? "border-emerald-200" : "border-gray-200",
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
          {t.status === "Termine" &&
            p.status === "COMPLETED" &&
            p.userId &&
            (!p.ratedByDriver || !p.reportedByDriver) && (
              <View className="gap-2 mt-3 pt-3 border-t border-gray-100">
                {!p.ratedByDriver && (
                  <TouchableOpacity
                    onPress={() => {
                      close();
                      router.push({
                        pathname: "/(stack)/report-passenger",
                        params: {
                          routeId: t.id,
                          passengerId: p.userId!,
                          passengerName: p.name,
                          from: t.from,
                          to: t.to,
                          mode: "rate",
                        },
                      } as never);
                    }}
                    className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/15"
                  >
                    <MaterialCommunityIcons
                      name="star-outline"
                      size={16}
                      color="#d97706"
                    />
                    <Text className="text-xs font-semibold text-amber-700">
                      Noter le passager
                    </Text>
                  </TouchableOpacity>
                )}
                {!p.reportedByDriver && (
                  <TouchableOpacity
                    onPress={() => {
                      close();
                      router.push({
                        pathname: "/(stack)/report-passenger",
                        params: {
                          routeId: t.id,
                          passengerId: p.userId!,
                          passengerName: p.name,
                          from: t.from,
                          to: t.to,
                          mode: "report",
                        },
                      } as never);
                    }}
                    className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10"
                  >
                    <MaterialCommunityIcons
                      name="flag-outline"
                      size={16}
                      color="#dc2626"
                    />
                    <Text className="text-xs font-semibold text-red-600">
                      Signaler le passager
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
                isOnBoard={false}
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
                disabled={
                  isRouteStatusPending || acceptedPassengers.length === 0
                }
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

      {passengersOnBoard.length > 0 && (
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-foreground">
              {trip.status === "Termine" ? "Passagers" : "Demandes acceptées"}
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
            {passengersOnBoard.map((p) => (
              <PassengerAccordion key={p.id} p={p} trip={trip} isOnBoard />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};
