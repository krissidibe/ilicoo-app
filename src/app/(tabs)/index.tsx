import { CommissionPendingModal } from "@/src/components/CommissionPendingModal";
import { RouteMapView } from "@/src/components/Map/RouteMapView";
import StarRating from "@/src/components/StarRating";
import type { RecentTrip, TripStatus } from "@/src/data/recentTrips";
import { getUser } from "@/src/lib/get-user";
import { mapRoutePassengerToRecentTrip } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { getNotifications } from "@/src/services/notification.service";
import { getReportedRouteIds } from "@/src/services/report.service";
import { getPaymentsSummary } from "@/src/services/payment.service";
import { queryKeys } from "@/src/services/queryKeys";
import { createRating, getRatedTripIds } from "@/src/services/rating.service";
import {
  cancelMyTrip,
  getRoutePassengers,
} from "@/src/services/routePassenger.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { ChevronRightIcon, SearchIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  Modal,
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
  const { data: routePassengersData, isLoading: isLoadingTrips } = useQuery({
    ...getRoutePassengers(),
    refetchInterval: 5000,
  });
  const { data: notificationsData } = useQuery({
    ...getNotifications(),
    refetchInterval: 5000,
  });
  const { data: paymentsData } = useQuery({
    ...getPaymentsSummary(),
    refetchInterval: 5000,
  });
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const [commissionPopupVisible, setCommissionPopupVisible] = useState(false);
  const firstPendingPayment = paymentsData?.pendingPayments?.[0];

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

  const ratingMutation = useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      Alert.alert("Merci", "Votre note a été enregistrée !");
      queryClient.invalidateQueries({ queryKey: queryKeys.routePassengers.all });
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible de noter",
      );
    },
  });

  const [ratingPopupTrip, setRatingPopupTrip] = useState<RecentTrip | null>(
    null,
  );
  const [ratingPopupStars, setRatingPopupStars] = useState(0);
  const [ratingPopupComment, setRatingPopupComment] = useState("");
  const [ratingPopupSubmitted, setRatingPopupSubmitted] = useState(false);
  const [ratingPopupConfirmed, setRatingPopupConfirmed] = useState(false);
  /** Évite les courses async / fermeture bloquante par la modal commission (RN empile la 2e Modal au-dessus). */
  const ratingPopupTripRef = useRef<RecentTrip | null>(null);
  useEffect(() => {
    ratingPopupTripRef.current = ratingPopupTrip;
  }, [ratingPopupTrip]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["route-passengers"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["payments", "summary"] });
    }, [queryClient]),
  );

  const prevUnreadRef = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Burnt.toast({
        title: "Nouvelle notification",
        message: "Vous avez une nouvelle notification",
        preset: "done",
        haptic: "success",
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (ratingPopupTrip !== null) {
      setCommissionPopupVisible(false);
      return;
    }
    if ((paymentsData?.pendingPayments?.length ?? 0) > 0) {
      setCommissionPopupVisible(true);
    }
  }, [ratingPopupTrip, paymentsData?.pendingPayments?.length]);

  const displayedTrips: RecentTrip[] = (routePassengersData ?? [])
    .map((rp) => mapRoutePassengerToRecentTrip(rp, currentUser?.id))
    .slice(0, 3);

  useEffect(() => {
    if (!routePassengersData || routePassengersData.length === 0) return;
    const allTrips = routePassengersData.map((rp) =>
      mapRoutePassengerToRecentTrip(rp, currentUser?.id),
    );
    const completedUnrated = allTrips.filter(
      (t) => t.status === "Termine" && t.driver?.id,
    );
    if (completedUnrated.length === 0) return;

    (async () => {
      const [ratedIds, reportedIds] = await Promise.all([
        getRatedTripIds(),
        getReportedRouteIds(),
      ]);
      const excluded = new Set([
        ...ratedIds.map(String),
        ...reportedIds.map(String),
      ]);
      const unrated = completedUnrated.find(
        (t) => !excluded.has(String(t.id)),
      );
      if (unrated && !ratingPopupTripRef.current) {
        setRatingPopupTrip(unrated);
        setRatingPopupStars(0);
        setRatingPopupComment("");
        setRatingPopupSubmitted(false);
        setRatingPopupConfirmed(false);
      }
    })();
  }, [routePassengersData, currentUser?.id]);

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
            {false && (
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
            )}
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
                    <Text className="text-sm font-semibold text-foreground">
                      {trip.driver.name} - {trip.driver.rating}★
                    </Text>
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
        {/* 
        {trip.status === "Termine" && trip.driver?.id && false && (
          <TripRatingSection
            routeId={String(trip.id)}
            toUserId={trip.driver.id}
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
 */}
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
    <>
      {/* Commission en premier dans l'arbre ; la modal notation est rendue après pour rester au-dessus si besoin */}
      {/* Popup optionnel: payer la commission — masquée tant que la notation trajet est affichée */}
      <CommissionPendingModal
        visible={
          commissionPopupVisible &&
          firstPendingPayment != null &&
          ratingPopupTrip === null
        }
        onClose={() => setCommissionPopupVisible(false)}
        onPay={() => {
          setCommissionPopupVisible(false);
          router.push("/(stack)/payment" as any);
        }}
        pendingPayments={paymentsData?.pendingPayments ?? []}
        pendingCommissionTotal={paymentsData?.pendingCommission}
      />

      {/* Popup bloquant: confirmation + notation après trajet terminé (au-dessus de la commission) */}
      <Modal
        visible={ratingPopupTrip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="p-6 w-[90%] max-w-md bg-white rounded-3xl items-center">
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={52}
              color="#10b981"
              style={{ marginBottom: 12 }}
            />
            <Text className="mb-1 text-lg font-bold text-emerald-700">
              Trajet terminé !
            </Text>
            <Text className="mb-1 text-sm text-center text-muted-foreground">
              {ratingPopupTrip?.from} → {ratingPopupTrip?.to}
            </Text>

            {!ratingPopupConfirmed ? (
              <>
                <Text className="mb-6 text-sm text-center text-muted-foreground">
                  Voulez-vous confirmer le trajet ?
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      const trip = ratingPopupTrip;
                      setRatingPopupTrip(null);
                      if (trip?.driver?.id) {
                        router.push({
                          pathname: "/(stack)/report",
                          params: {
                            routeId: String(trip.id),
                            driverId: trip.driver.id,
                            driverName: trip.driver.name,
                            from: trip.from,
                            to: trip.to,
                            mode: "non-effectue",
                          },
                        } as any);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-red-300 bg-red-50"
                  >
                    <Text className="text-sm font-semibold text-red-600">
                      Non effectué
                    </Text>
                  </TouchableOpacity>
                  {false && (
                    <TouchableOpacity
                      onPress={async () => {
                        const { markTripAsRated } =
                          await import("@/src/services/rating.service");
                        await markTripAsRated(String(ratingPopupTrip?.id));
                        setRatingPopupTrip(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-gray-300"
                    >
                      <Text className="text-sm font-semibold text-muted-foreground">
                        Plus tard
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setRatingPopupConfirmed(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Confirmer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text className="mb-5 text-sm text-center text-muted-foreground">
                  Comment était votre trajet avec{" "}
                  <Text className="font-semibold">
                    {ratingPopupTrip?.driver?.name}
                  </Text>{" "}
                  ?
                </Text>
                <StarRating
                  rating={ratingPopupStars}
                  size={36}
                  editable={!ratingPopupSubmitted}
                  onChange={(stars) => setRatingPopupStars(stars)}
                />
                <TextInput
                  value={ratingPopupComment}
                  onChangeText={setRatingPopupComment}
                  placeholder="Ajouter une note (optionnel)"
                  multiline
                  numberOfLines={3}
                  className="mt-4 w-full min-h-[84px] rounded-xl border border-gray-200 px-3 py-2 text-sm text-foreground"
                  style={{ textAlignVertical: "top" }}
                />
                {!ratingPopupSubmitted ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (!ratingPopupTrip?.driver?.id || ratingPopupStars < 1) {
                        Alert.alert(
                          "Note requise",
                          "Veuillez sélectionner au moins une étoile.",
                        );
                        return;
                      }
                      setRatingPopupSubmitted(true);
                      ratingMutation.mutate(
                        {
                          routeId: String(ratingPopupTrip.id),
                          toUserId: ratingPopupTrip.driver.id,
                          stars: ratingPopupStars,
                          comment: ratingPopupComment.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            setTimeout(() => setRatingPopupTrip(null), 1200);
                          },
                          onError: () => {
                            setRatingPopupSubmitted(false);
                          },
                        },
                      );
                    }}
                    className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-600"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Envoyer la note
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {ratingPopupSubmitted && (
                  <Text className="mt-3 text-sm font-medium text-emerald-600">
                    Merci pour votre note !
                  </Text>
                )}
                {!ratingPopupSubmitted && (
                  <TouchableOpacity
                    onPress={async () => {
                      const { markTripAsRated } =
                        await import("@/src/services/rating.service");
                      await markTripAsRated(String(ratingPopupTrip?.id));
                      setRatingPopupTrip(null);
                    }}
                    className="mt-4"
                  >
                    <Text className="text-xs underline text-muted-foreground">
                      Passer
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

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
                <ActivityIndicator
                  size="small"
                  color="white"
                  className="mt-2"
                />
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
              <Text className="text-sm font-medium text-primary">
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {isLoadingTrips ? (
              <ActivityIndicator
                size="large"
                color="#6366f1"
                className="py-8"
              />
            ) : displayedTrips.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-muted-foreground">
                  Aucun trajet récent
                </Text>
              </View>
            ) : (
              displayedTrips.map((trip, index) => {
                const passengerStatus = trip.myPassengerInfo?.passengerStatus;
                const passengerStatusStyle =
                  passengerStatus === "Confirmé"
                    ? {
                        color: "bg-emerald-500/15 text-emerald-600",
                        iconColor: "#059669",
                        icon: "check-circle-outline" as const,
                      }
                    : passengerStatus === "Refusé" ||
                        passengerStatus === "Annulé"
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
    </>
  );
};

export default HomeScreen;
