import { RoutePolyline } from "@/src/components/Map/RoutePolyline";
import { AvatarWithVerifiedOutline } from "@/src/components/VerifiedBadge";
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
import { queryKeys } from "@/src/services/queryKeys";
import { getMyRoutes, updateRouteStatus } from "@/src/services/route.service";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { type LatLng, Marker } from "react-native-maps";

const PASSENGER_COLORS = [
  "#059669",
  "#7c3aed",
  "#ea580c",
  "#0d9488",
  "#e11d48",
];

/** Padding carte : header + bandeau passagers + boutons (zoom sur la zone utile). */
const MAP_EDGE_PADDING = {
  top: 100,
  right: 36,
  bottom: 280,
  left: 36,
};

const ActiveTripScreen = () => {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedPassenger, setSelectedPassenger] =
    useState<PassengerRequest | null>(null);

  const { data: routesData, isLoading: isLoadingRoutes } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });

  const trip: MyPublishedTrip | undefined = React.useMemo(() => {
    const route = (routesData ?? []).find((r) => r.id === routeId);
    return route ? mapRouteToMyPublishedTrip(route) : undefined;
  }, [routesData, routeId]);

  /** Points du trajet pour cadrer la carte (départ, arrivée, passagers). */
  const coordinatesForFit = useMemo((): LatLng[] => {
    if (!trip || trip.status !== "En cours") return [];
    const pts: LatLng[] = [];
    if (trip.pickupLat != null && trip.pickupLng != null) {
      pts.push({ latitude: trip.pickupLat, longitude: trip.pickupLng });
    }
    if (trip.dropLat != null && trip.dropLng != null) {
      pts.push({ latitude: trip.dropLat, longitude: trip.dropLng });
    }
    const accepted = trip.passengers.filter((p) => p.status === "ACCEPTED");
    accepted.forEach((p) => {
      if (p.pickupLat != null && p.pickupLng != null) {
        pts.push({ latitude: p.pickupLat, longitude: p.pickupLng });
      }
      if (p.dropLat != null && p.dropLng != null) {
        pts.push({ latitude: p.dropLat, longitude: p.dropLng });
      }
    });
    return pts;
  }, [trip]);

  const fitMapToTrip = useCallback(() => {
    const coords = coordinatesForFit;
    if (coords.length === 0 || !mapRef.current) return;

    if (coords.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coords[0].latitude,
          longitude: coords[0].longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        },
        400,
      );
      return;
    }

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: MAP_EDGE_PADDING,
      animated: true,
    });
  }, [coordinatesForFit]);

  useEffect(() => {
    if (coordinatesForFit.length === 0) return;
    const id = setTimeout(() => fitMapToTrip(), 150);
    return () => clearTimeout(id);
  }, [coordinatesForFit, fitMapToTrip]);

  /** Un seul recentrage quand la position GPS est disponible (inclut le chauffeur dans le cadre). */
  const driverIncludedInFitRef = useRef(false);
  useEffect(() => {
    if (!driverLocation || driverIncludedInFitRef.current || !mapRef.current)
      return;
    if (coordinatesForFit.length === 0) return;
    driverIncludedInFitRef.current = true;
    const combined = [...coordinatesForFit, driverLocation];
    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(combined, {
        edgePadding: MAP_EDGE_PADDING,
        animated: true,
      });
    });
  }, [driverLocation, coordinatesForFit]);

  const goToDriverTab = useCallback(() => {
    router.replace("/(tabs)/new-route" as any);
  }, []);

  const completeTripMutation = useMutation({
    mutationFn: () => updateRouteStatus(routeId!, "COMPLETED"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      queryClient.invalidateQueries({ queryKey: ["routes", "stats"] });
      goToDriverTab();
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible de terminer",
      );
    },
  });

  const cancelTripMutation = useMutation({
    mutationFn: () => updateRouteStatus(routeId!, "CANCELLED"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      queryClient.invalidateQueries({ queryKey: ["routes", "stats"] });
      goToDriverTab();
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'annuler",
      );
    },
  });

  useEffect(() => {
    if (!trip) return;
    if (trip.status !== "En cours") {
      goToDriverTab();
    }
  }, [trip, goToDriverTab]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Trajet en cours",
        "Pour quitter, terminez le trajet ou annulez-le.",
        [{ text: "OK" }],
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 5000,
        },
        (loc) => {
          setDriverLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        },
      );
    })();
    return () => {
      subscription?.remove();
    };
  }, []);

  const callPassenger = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
  };

  const handleComplete = () => {
    Alert.alert(
      "Terminer le trajet",
      "Êtes-vous sûr de vouloir terminer ce trajet ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, terminer",
          onPress: () => completeTripMutation.mutate(),
        },
      ],
    );
  };

  const handleCancelTrip = () => {
    Alert.alert(
      "Annuler le trajet",
      "Êtes-vous sûr de vouloir annuler ce trajet ? Les passagers seront notifiés.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: () => cancelTripMutation.mutate(),
        },
      ],
    );
  };

  if (!routeId) {
    return null;
  }

  if (isLoadingRoutes && routesData === undefined) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <Text className="mb-4 text-center text-muted-foreground">
          Trajet introuvable ou déjà terminé.
        </Text>
        <Button onPress={goToDriverTab} className="rounded-xl">
          <Text className="font-semibold text-primary-foreground">Retour</Text>
        </Button>
      </View>
    );
  }

  if (trip.status !== "En cours") {
    return null;
  }

  const acceptedPassengers = trip.passengers.filter(
    (p) => p.status === "ACCEPTED",
  );

  const initialRegionFallback =
    coordinatesForFit.length > 0
      ? {
          latitude: coordinatesForFit[0].latitude,
          longitude: coordinatesForFit[0].longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }
      : {
          latitude: 12.6392,
          longitude: -8.0029,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1, width: "100%" }}
          initialRegion={initialRegionFallback}
          showsUserLocation
          showsMyLocationButton
          scrollEnabled
          zoomEnabled
          onMapReady={() => {
            requestAnimationFrame(() => fitMapToTrip());
          }}
        >
          {trip.pickupLat != null && trip.pickupLng != null && (
            <Marker
              coordinate={{
                latitude: trip.pickupLat,
                longitude: trip.pickupLng,
              }}
              title="Départ"
              pinColor="#2563eb"
            />
          )}
          {trip.dropLat != null && trip.dropLng != null && (
            <Marker
              coordinate={{ latitude: trip.dropLat!, longitude: trip.dropLng! }}
              title="Arrivée"
              pinColor="#e11d48"
            />
          )}
          {trip.pickupLat != null && trip.dropLat != null && (
            <RoutePolyline
              pickupLat={trip.pickupLat!}
              pickupLng={trip.pickupLng!}
              dropLat={trip.dropLat!}
              dropLng={trip.dropLng!}
              strokeColor="#0ea5e9"
              strokeWidth={5}
            />
          )}
          {false &&
            acceptedPassengers.map((p, i) => {
              const color = PASSENGER_COLORS[i % PASSENGER_COLORS.length];
              return (
                <React.Fragment key={p.id}>
                  {p.pickupLat != null && p.pickupLng != null && (
                    <Marker
                      coordinate={{
                        latitude: p.pickupLat!,
                        longitude: p.pickupLng!,
                      }}
                      title={`${p.name} (prise en charge)`}
                      pinColor={color}
                      onPress={() => setSelectedPassenger(p)}
                    />
                  )}
                  {p.dropLat != null && p.dropLng != null && (
                    <Marker
                      coordinate={{
                        latitude: p.dropLat!,
                        longitude: p.dropLng!,
                      }}
                      title={`${p.name} (dépose)`}
                      pinColor={color}
                      opacity={0.6}
                    />
                  )}
                </React.Fragment>
              );
            })}
        </MapView>

        <View className="absolute top-0 right-0 left-0 pt-safe">
          <View className="flex-row justify-center items-center px-5 py-3">
            <View className="px-4 py-2 bg-blue-600 rounded-full shadow-md">
              <Text className="text-xs font-bold text-white">
                Trajet en cours
              </Text>
            </View>
          </View>
        </View>
      </View>

      {selectedPassenger && (
        <View className="absolute right-4 left-4 bottom-48 p-4 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <View className="flex-row items-center">
            <AvatarWithVerifiedOutline
              isVerified={selectedPassenger.isVerified}
              badgeSize={14}
            >
              <Avatar className="size-12" alt={selectedPassenger.name}>
                <AvatarImage source={{ uri: selectedPassenger.image }} />
                <AvatarFallback>
                  <Text className="text-sm">{selectedPassenger.name[0]}</Text>
                </AvatarFallback>
              </Avatar>
            </AvatarWithVerifiedOutline>
            <View className="flex-1 ml-3">
              <Text className="text-sm font-bold">
                {selectedPassenger.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {selectedPassenger.seats} place(s) • {selectedPassenger.rating}★
              </Text>
              {selectedPassenger.pickupAddress && (
                <Text
                  className="text-[11px] text-muted-foreground mt-0.5"
                  numberOfLines={1}
                >
                  Prise en charge: {selectedPassenger.pickupAddress}
                </Text>
              )}
            </View>
            <View className="flex-row gap-2">
              {selectedPassenger.phone && (
                <TouchableOpacity
                  onPress={() => callPassenger(selectedPassenger.phone!)}
                  className="p-2.5 rounded-full bg-emerald-500/15"
                >
                  <Ionicons name="call" size={18} color="#059669" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSelectedPassenger(null)}
                className="p-2.5 rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View className="bg-white border-t border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3"
          contentContainerStyle={{ gap: 10 }}
        >
          {acceptedPassengers.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              onPress={() =>
                setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)
              }
              className={`flex-row items-center p-3 rounded-xl border min-w-[160px] ${
                selectedPassenger?.id === p.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <AvatarWithVerifiedOutline isVerified={p.isVerified} badgeSize={11}>
                <Avatar className="size-9" alt={p.name}>
                  <AvatarImage source={{ uri: p.image }} />
                  <AvatarFallback>
                    <Text className="text-[10px]">{p.name[0]}</Text>
                  </AvatarFallback>
                </Avatar>
              </AvatarWithVerifiedOutline>
              <View className="flex-1 ml-2">
                <Text className="text-xs font-semibold" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {p.seats} place(s)
                </Text>
              </View>
              {p.phone && (
                <TouchableOpacity
                  onPress={() => callPassenger(p.phone!)}
                  className="p-1.5 rounded-full bg-emerald-500/15"
                >
                  <Ionicons name="call" size={14} color="#059669" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="gap-2 px-5 pb-5">
          <Button
            className="mb-10 w-full rounded-xl bg-primary"
            onPress={handleComplete}
            disabled={
              completeTripMutation.isPending || cancelTripMutation.isPending
            }
          >
            <View className="flex-row gap-2 items-center">
              <MaterialCommunityIcons
                name="flag-checkered"
                size={18}
                color="white"
              />
              <Text className="font-bold text-white">
                {completeTripMutation.isPending
                  ? "Terminaison..."
                  : "Terminer le trajet"}
              </Text>
            </View>
          </Button>
          {false && (
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive"
              onPress={handleCancelTrip}
              disabled={
                completeTripMutation.isPending || cancelTripMutation.isPending
              }
            >
              <View className="flex-row gap-2 items-center">
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={18}
                  color="#dc2626"
                />
                <Text className="font-bold text-destructive">
                  {cancelTripMutation.isPending
                    ? "Annulation..."
                    : "Annuler le trajet"}
                </Text>
              </View>
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

export default ActiveTripScreen;
