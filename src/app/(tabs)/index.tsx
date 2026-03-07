import { RouteMapView } from "@/src/components/Map/RouteMapView";
import type { RecentTrip, TripStatus } from "@/src/data/recentTrips";
import { getUser } from "@/src/lib/get-user";
import { mapRoutePassengerToRecentTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { getNotifications } from "@/src/services/notification.service";
import { queryKeys } from "@/src/services/queryKeys";
import {
  cancelMyTrip,
  getRoutePassengers,
} from "@/src/services/routePassenger.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { ChevronRightIcon, SearchIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

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

const HomeScreen = () => {
  const isLoadingUser = false;
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { open, close } = useBottomSheetStore();
  const { data: routePassengersData, isLoading: isLoadingTrips } =
    useQuery(getRoutePassengers());
  const { data: notificationsData } = useQuery(getNotifications());
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const cancelMutation = useMutation({
    mutationFn: cancelMyTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.routePassengers.all,
      });
      close();
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'annuler",
      );
    },
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["route-passengers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, [queryClient]),
  );

  const displayedTrips: RecentTrip[] = (routePassengersData ?? [])
    .map((rp) => mapRoutePassengerToRecentTrip(rp, currentUser?.id))
    .slice(0, 3);

  const callDriver = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
  };

  useEffect(() => {
    (async () => {
      const user = await getUser();
      setCurrentUser(user);
    })();
  }, []);

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

        {/* Infos trajet chauffeur */}
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
            <View
              className={`flex-row items-center rounded-full px-2 py-1 ${statusStyle.statusColor}`}
            >
              <MaterialCommunityIcons
                name={statusStyle.icon}
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
                {trip.date}
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
                Voir l'itinéraire sur la carte
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
                  <Text className="text-sm font-semibold text-foreground">
                    {trip.driver.name} - {trip.driver.rating}★
                  </Text>
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

        {/* Mes infos passager */}
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
          </View>
        )}

        {/* Autres passagers */}
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

        {/* Annuler mon trajet */}
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
      <Animated.View
        entering={FadeIn.duration(500)}
        className="relative z-50 px-5 pb-16 rounded-b-3xl pt-safe bg-primary"
      >
        <View className="flex-row justify-between items-center">
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text className="pt-5 text-base text-primary-foreground/80">
              Bonjour 👋
            </Text>
            {isLoadingUser ? (
              <ActivityIndicator size="small" color="white" className="mt-2" />
            ) : (
              <Text className="text-2xl font-bold text-primary-foreground">
                {currentUser?.name || "Utilisateur"}
              </Text>
            )}
          </Animated.View>

          <Animated.View
            className="z-30"
            entering={ZoomIn.delay(200).duration(400)}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(stack)/notifications" as any);
              }}
              className="relative p-3 rounded-full bg-primary-foreground/20"
            >
              <MaterialCommunityIcons name="bell" size={22} color="white" />
              {unreadCount > 0 && (
                <View className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-primary items-center justify-center px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View className="absolute right-0 left-0 -bottom-7 z-40 px-5">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(stack)/search-route" as any);
            }}
            activeOpacity={1}
            className="z-30 flex-row gap-3 items-center p-4 bg-white rounded-2xl shadow-lg shadow-black/10"
          >
            <View className="p-2 rounded-full bg-primary/10">
              <SearchIcon size={20} color="#6366f1" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                Où allez-vous ?
              </Text>
              <Text className="text-xs text-muted-foreground">
                Trouvez votre prochain trajet
              </Text>
            </View>
            <ChevronRightIcon size={20} color="#666" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-foreground">
            Trajets récents
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(stack)/recent-trips" as any);
            }}
          >
            <Text className="text-sm font-medium text-primary">Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {isLoadingTrips ? (
            <ActivityIndicator size="large" color="#6366f1" className="py-8" />
          ) : displayedTrips.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-muted-foreground">Aucun trajet récent</Text>
            </View>
          ) : (
            displayedTrips.map((trip, index) => {
              const statusStyle = statusConfig(trip.status);
              return (
                <Animated.View
                  key={trip.id}
                  entering={FadeInDown.delay(250 + index * 90).duration(450)}
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
                          {trip.date}
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

export default HomeScreen;
