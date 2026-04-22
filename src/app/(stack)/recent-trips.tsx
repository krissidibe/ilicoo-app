import { RouteMapView } from "@/src/components/Map/RouteMapView";
import StarRating from "@/src/components/StarRating";
import { Text } from "@/src/components/ui/text";
import { VerifiedBadge } from "@/src/components/VerifiedBadge";
import type { RecentTrip, TripStatus } from "@/src/data/recentTrips";
import { getUser } from "@/src/lib/get-user";
import { mapRoutePassengerToRecentTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { createRating } from "@/src/services/rating.service";
import {
  cancelMyTrip,
  getRoutePassengers,
} from "@/src/services/routePassenger.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type TripTab = "Avenir" | "Passe";

const AVENIR_STATUSES: TripStatus[] = ["En attente", "En cours"];
const PASSE_STATUSES: TripStatus[] = ["Termine", "Annule"];

const statusConfig = (
  status: TripStatus,
): {
  statusColor: string;
  statusIconColor: string;
  icon:
    | "check-circle-outline"
    | "close-circle-outline"
    | "timer-outline"
    | "car-outline";
} => {
  if (status === "Termine")
    return {
      statusColor: "bg-emerald-500/15 text-emerald-600",
      statusIconColor: "#059669",
      icon: "check-circle-outline",
    };
  if (status === "Annule")
    return {
      statusColor: "bg-red-500/15 text-red-600",
      statusIconColor: "#dc2626",
      icon: "close-circle-outline",
    };
  if (status === "En cours")
    return {
      statusColor: "bg-blue-500/15 text-blue-600",
      statusIconColor: "#2563eb",
      icon: "car-outline",
    };
  return {
    statusColor: "bg-amber-500/15 text-amber-600",
    statusIconColor: "#d97706",
    icon: "timer-outline",
  };
};

const TripRatingSection = ({
  driverName,
  onRate,
  isPending,
}: {
  driverName: string;
  onRate: (stars: number) => void;
  isPending: boolean;
}) => {
  const [selectedStars, setSelectedStars] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <View className="p-4 mt-4 bg-amber-50 rounded-2xl border border-amber-200">
      <Text className="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
        Noter le chauffeur
      </Text>
      <Text className="mb-3 text-sm text-muted-foreground">
        Comment était votre trajet avec {driverName} ?
      </Text>
      <View className="items-center">
        <StarRating
          rating={selectedStars}
          size={32}
          editable={!submitted}
          onChange={(stars) => {
            setSelectedStars(stars);
            if (!submitted) {
              setSubmitted(true);
              onRate(stars);
            }
          }}
        />
        {submitted && (
          <Text className="mt-2 text-xs font-medium text-amber-700">
            Merci pour votre note !
          </Text>
        )}
      </View>
    </View>
  );
};

const RecentTripsScreen = () => {
  const [activeTab, setActiveTab] = React.useState<TripTab>("Avenir");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { open, close } = useBottomSheetStore();
  const queryClient = useQueryClient();

  const { data: routePassengersData, isLoading } =
    useQuery(getRoutePassengers());

  useEffect(() => {
    (async () => {
      const user = await getUser();
      setCurrentUser(user);
    })();
  }, []);

  const allTrips: RecentTrip[] = (routePassengersData ?? []).map((rp) =>
    mapRoutePassengerToRecentTrip(rp, currentUser?.id),
  );

  const filteredTrips = React.useMemo(() => {
    const statuses = activeTab === "Avenir" ? AVENIR_STATUSES : PASSE_STATUSES;
    return allTrips.filter((trip) => statuses.includes(trip.status));
  }, [allTrips, activeTab]);

  const cancelMutation = useMutation({
    mutationFn: cancelMyTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-passengers"] });
      close();
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'annuler",
      );
    },
  });

  const ratingMutation = useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      Alert.alert("Merci", "Votre note a été enregistrée !");
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible de noter",
      );
    },
  });

  const callDriver = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
  };

  const openMapSheet = (trip: RecentTrip): void => {
    const driverLat = trip.pickupLat ?? 0;
    const driverLng = trip.pickupLng ?? 0;
    const driverDropLat = trip.dropLat ?? 0;
    const driverDropLng = trip.dropLng ?? 0;
    if (
      driverLat === 0 ||
      driverLng === 0 ||
      driverDropLat === 0 ||
      driverDropLng === 0
    )
      return;

    const myInfo = trip.myPassengerInfo;
    const hasMyRoute =
      myInfo?.pickupLat != null &&
      myInfo?.pickupLng != null &&
      myInfo?.dropLat != null &&
      myInfo?.dropLng != null;

    open(
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-5 py-3 border-b border-gray-200">
          <Text className="text-base font-semibold">
            Itinéraire sur la carte
          </Text>
          <TouchableOpacity onPress={close} className="p-2">
            <MaterialCommunityIcons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <RouteMapView
          pickupLat={driverLat}
          pickupLng={driverLng}
          dropLat={driverDropLat}
          dropLng={driverDropLng}
          pickupTitle="Départ chauffeur"
          dropTitle="Arrivée chauffeur"
          strokeColor="#0ea5e9"
          secondaryRoute={
            hasMyRoute
              ? {
                  pickupLat: myInfo!.pickupLat!,
                  pickupLng: myInfo!.pickupLng!,
                  dropLat: myInfo!.dropLat!,
                  dropLng: myInfo!.dropLng!,
                  pickupTitle: "Mon départ",
                  dropTitle: "Mon arrivée",
                  strokeColor: "#7c3aed",
                }
              : undefined
          }
        />
      </View>,
      ["70%"],
    );
  };

  const openTripDetails = (trip: RecentTrip): void => {
    const statusStyle = statusConfig(trip.status);
    const myInfo = trip.myPassengerInfo;

    open(
      <View className="px-5 pt-2 pb-7">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold text-foreground">
            Détails du trajet
          </Text>
        </View>

        <View className="p-4 mt-4 bg-white rounded-2xl border border-gray-300">
          <Text className="mb-3 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Trajet du chauffeur
          </Text>
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
            {false && (
              <View
                className={`flex-row items-center rounded-full px-2 py-1 ${statusStyle.statusColor}`}
              >
                <MaterialCommunityIcons
                  name={statusStyle.icon}
                  size={14}
                  color={statusStyle.statusIconColor}
                />
                <Text className="ml-1 text-xs font-semibold">
                  {trip.status}
                </Text>
              </View>
            )}
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
                {trip.date}
              </Text>
            </View>
          </View>

          {trip.pickupLat != null && trip.dropLat != null && (
            <TouchableOpacity
              onPress={() => {
                close();
                openMapSheet(trip);
              }}
              className="flex-row gap-2 justify-center items-center py-3 mt-3 rounded-xl border border-primary bg-primary/10"
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={18}
                color="#6366f1"
              />
              <Text className="text-sm font-semibold text-primary">
                Voir l&apos;itinéraire sur la carte
              </Text>
            </TouchableOpacity>
          )}

          {trip.driver && (
            <View className="flex-row justify-between items-center px-3 py-2 mt-4 rounded-xl border border-gray-300">
              <View className="flex-row items-center">
                <View className="p-2 mr-2 rounded-full bg-primary/10">
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={16}
                    color="#6366f1"
                  />
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">
                    Chauffeur
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(stack)/user-reviews",
                        params: {
                          userId: trip.driver?.id ?? "",
                          name: trip.driver?.name ?? "Chauffeur",
                        },
                      } as any)
                    }
                  >
                    <View className="flex-row items-center gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {trip.driver.name}
                      </Text>
                      {trip.driver.isVerified ? (
                        <VerifiedBadge size={16} className="shrink-0" />
                      ) : null}
                      <Text className="text-sm font-semibold text-foreground">
                        {" "}
                        - {trip.driver.rating}★
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                className="flex-row items-center rounded-full bg-primary px-3 py-1.5"
                onPress={() => callDriver(trip.driver!.phone)}
              >
                <MaterialCommunityIcons name="phone" size={13} color="white" />
                <Text className="ml-1 text-xs font-semibold text-white">
                  Appeler
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {myInfo && (
          <View className="p-4 mt-4 rounded-2xl border bg-primary/5 border-primary/20">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-semibold tracking-wide uppercase text-primary">
                Mon trajet
              </Text>
              <View
                className={cn(
                  "rounded-full px-2 py-1",
                  myInfo.passengerStatus === "Confirmé" && "bg-emerald-500/20",
                  myInfo.passengerStatus === "En attente" && "bg-amber-500/20",
                  myInfo.passengerStatus === "Refusé" && "bg-red-500/20",
                  myInfo.passengerStatus === "Annulé" && "bg-gray-500/20",
                  myInfo.passengerStatus === "Terminé" && "bg-blue-500/20",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    myInfo.passengerStatus === "Confirmé" && "text-emerald-700",
                    myInfo.passengerStatus === "En attente" && "text-amber-700",
                    myInfo.passengerStatus === "Refusé" && "text-red-700",
                    myInfo.passengerStatus === "Annulé" && "text-gray-700",
                    myInfo.passengerStatus === "Terminé" && "text-blue-700",
                  )}
                >
                  {myInfo.passengerStatus}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color="#2563eb"
              />
              <Text className="ml-1 text-xs text-muted-foreground">
                Départ: {myInfo.from}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color="#e11d48"
              />
              <Text className="ml-1 text-xs text-muted-foreground">
                Arrivée: {myInfo.to}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons
                name="calendar-outline"
                size={14}
                color="#9ca3af"
              />
              <Text className="ml-1 text-xs text-muted-foreground">
                Date: {myInfo.date} - {myInfo.time}
              </Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="cash-multiple"
                size={14}
                color="#10b981"
              />
              <Text className="ml-1 text-xs font-semibold">
                Prix: {myInfo.price}
              </Text>
            </View>
            <View className="flex-row items-center mt-2">
              <MaterialCommunityIcons
                name="seat-passenger"
                size={14}
                color="#6366f1"
              />
              <Text className="ml-1 text-xs font-semibold text-primary">
                Places réservées: {myInfo.seats ?? 1}
              </Text>
            </View>
            {trip.distanceKm != null && (
              <View className="flex-row items-center mt-2">
                <MaterialCommunityIcons
                  name="map-marker-distance"
                  size={14}
                  color="#f97316"
                />
                <Text className="ml-1 text-xs font-semibold text-orange-600">
                  Distance: {trip.distanceKm.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        )}

        {trip.otherPassengerNames && trip.otherPassengerNames.length > 0 && (
          <View className="mt-4">
            <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Autres passagers
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {trip.otherPassengerNames.map((name) => (
                <View
                  key={name}
                  className="px-3 py-2 bg-gray-100 rounded-xl border border-gray-200"
                >
                  <Text className="text-sm font-medium text-foreground">
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {trip.status === "Termine" && trip.driver?.id && (
          <TripRatingSection
            driverName={trip.driver.name}
            onRate={(stars) =>
              ratingMutation.mutate({
                routeId: String(trip.id),
                toUserId: trip.driver!.id!,
                stars,
              })
            }
            isPending={ratingMutation.isPending}
          />
        )}

        {trip.canCancel && trip.routePassengerId && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Annuler le trajet",
                "Êtes-vous sûr de vouloir annuler votre réservation ?",
                [
                  { text: "Non", style: "cancel" },
                  {
                    text: "Oui, annuler",
                    style: "destructive",
                    onPress: () =>
                      cancelMutation.mutate(trip.routePassengerId!),
                  },
                ],
              );
            }}
            disabled={cancelMutation.isPending}
            className="flex-row gap-2 justify-center items-center py-3 mt-6 rounded-xl border border-destructive/30 bg-destructive/5"
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={18}
              color="#dc2626"
            />
            <Text className="text-sm font-semibold text-destructive">
              {cancelMutation.isPending
                ? "Annulation..."
                : "Annuler mon trajet"}
            </Text>
          </TouchableOpacity>
        )}
      </View>,
      ["55%"],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-4 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Tous les trajets</Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center p-1 rounded-2xl bg-white/15">
          {(["Avenir", "Passe"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={cn(
                "flex-1 rounded-xl py-2.5",
                activeTab === tab && "bg-white",
              )}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={cn(
                  "text-center text-xs font-semibold text-white",
                  activeTab === tab && "text-slate-900",
                )}
              >
                {tab === "Avenir" ? "Avenir" : "Passé"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
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
              const passengerStatus = trip.myPassengerInfo?.passengerStatus;
              const passengerStatusStyle =
                passengerStatus === "Confirmé"
                  ? {
                      color: "bg-emerald-500/15 text-emerald-600",
                      iconColor: "#059669",
                      icon: "check-circle-outline" as const,
                    }
                  : passengerStatus === "Refusé" || passengerStatus === "Annulé"
                    ? {
                        color: "bg-red-500/15 text-red-600",
                        iconColor: "#dc2626",
                        icon: "close-circle-outline" as const,
                      }
                    : passengerStatus === "Terminé"
                      ? {
                          color: "bg-blue-500/15 text-blue-600",
                          iconColor: "#2563eb",
                          icon: "check-circle-outline" as const,
                        }
                      : {
                          color: "bg-amber-500/15 text-amber-600",
                          iconColor: "#d97706",
                          icon: "timer-outline" as const,
                        };

              return (
                <Animated.View
                  key={trip.id + String(index)}
                  entering={FadeInDown.delay(100 + index * 80).duration(350)}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="p-4 bg-white rounded-2xl border border-gray-300 shadow-sm shadow-black/5"
                    onPress={() => openTripDetails(trip)}
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
                      {passengerStatus && (
                        <View
                          className={`flex-row items-center rounded-full px-2 py-1 ${passengerStatusStyle.color}`}
                        >
                          <MaterialCommunityIcons
                            name={passengerStatusStyle.icon}
                            size={14}
                            color={passengerStatusStyle.iconColor}
                          />
                          <Text className="ml-1 text-xs font-semibold">
                            {passengerStatus}
                          </Text>
                        </View>
                      )}
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
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={16}
                          color="#9ca3af"
                        />
                        <Text className="ml-1 text-xs text-muted-foreground">
                          {trip.myPassengerInfo?.date}{" "}
                          {trip.myPassengerInfo?.time}
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

export default RecentTripsScreen;
