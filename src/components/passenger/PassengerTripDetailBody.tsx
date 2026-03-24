import { RouteMapView } from "@/src/components/Map/RouteMapView";
import { Text } from "@/src/components/ui/text";
import type { RecentTrip } from "@/src/data/recentTrips";
import { cn } from "@/src/lib/utils";
import { queryKeys } from "@/src/services/queryKeys";
import { cancelMyTrip } from "@/src/services/routePassenger.service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  trip: RecentTrip;
};

/**
 * Même contenu que le sheet « Détails du trajet » sur l’accueil passager (index.tsx).
 */
export const PassengerTripDetailBody = ({ trip }: Props) => {
  const queryClient = useQueryClient();
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: cancelMyTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routePassengers.all });
      Alert.alert("Réservation annulée", "Votre demande a bien été annulée.");
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'annuler",
      );
    },
  });

  const myInfo = trip.myPassengerInfo;

  const callDriver = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
  };

  const driverLat = trip.pickupLat ?? 0;
  const driverLng = trip.pickupLng ?? 0;
  const driverDropLat = trip.dropLat ?? 0;
  const driverDropLng = trip.dropLng ?? 0;
  const hasDriverCoords =
    driverLat !== 0 &&
    driverLng !== 0 &&
    driverDropLat !== 0 &&
    driverDropLng !== 0;

  const hasMyRoute =
    myInfo?.pickupLat != null &&
    myInfo?.pickupLng != null &&
    myInfo?.dropLat != null &&
    myInfo?.dropLng != null;

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-foreground">
            Détails du trajet
          </Text>
        </View>

        <View className="p-4 mt-2 bg-white rounded-2xl border border-gray-300">
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
                  numberOfLines={2}
                >
                  {trip.from}
                </Text>
              </View>
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
                numberOfLines={2}
              >
                {trip.to}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color="#9ca3af"
            />
            <Text className="ml-1 text-xs text-muted-foreground">
              {trip.date}
            </Text>
          </View>

          {hasDriverCoords && (
            <TouchableOpacity
              onPress={() => setMapModalVisible(true)}
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
                    myInfo.passengerStatus === "Confirmé" &&
                      "text-emerald-700",
                    myInfo.passengerStatus === "En attente" &&
                      "text-amber-700",
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
      </ScrollView>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row justify-between items-center px-5 py-3 border-b border-gray-200 pt-safe">
            <Text className="text-base font-semibold">
              Itinéraire sur la carte
            </Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              className="p-2"
            >
              <MaterialCommunityIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 min-h-[320px]">
            {hasDriverCoords && (
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
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};
