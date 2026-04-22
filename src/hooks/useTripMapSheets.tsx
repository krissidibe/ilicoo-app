import { RoutePolyline } from "@/src/components/Map/RoutePolyline";
import { AvatarWithVerifiedOutline } from "@/src/components/VerifiedBadge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Text } from "@/src/components/ui/text";
import type {
  MyPublishedTrip,
  PassengerRequest,
} from "@/src/data/myPublishedTrips";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export const getPassengerRoute = (
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

export type TripMapSheetHandlers = {
  onAcceptPassenger: (trip: MyPublishedTrip, passengerId: string) => void;
  onRejectPassenger: (tripId: string, passengerId: string) => void;
};

export function useTripMapSheets(handlers: TripMapSheetHandlers) {
  const { open, close } = useBottomSheetStore();
  const { onAcceptPassenger, onRejectPassenger } = handlers;

  const callPassenger = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) await Linking.openURL(phoneUrl);
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
        {passenger.distanceKm != null && (
          <View className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color="#f97316"
              />
              <Text className="ml-2 text-sm font-semibold text-orange-600">
                Distance: {passenger.distanceKm.toFixed(1)} km
              </Text>
            </View>
          </View>
        )}
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
      (p) =>
        p.status === "PENDING" ||
        p.status === "ACCEPTED" ||
        p.status === "COMPLETED",
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
          {allPassengers.map((p) => (
            <View
              key={p.id}
              className="flex-row items-center mr-3 p-3 rounded-xl border border-gray-200 bg-gray-50 min-w-[140px]"
            >
              <AvatarWithVerifiedOutline isVerified={p.isVerified} badgeSize={10}>
                <Avatar className="size-8" alt={p.name}>
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
                  {p.status === "ACCEPTED"
                    ? "Accepté"
                    : p.status === "COMPLETED"
                      ? "Terminé"
                      : "En attente"}
                </Text>
              </View>
              {p.status === "PENDING" ? (
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    onPress={() => {
                      onRejectPassenger(trip.id, p.id);
                      close();
                    }}
                    className="p-1.5 rounded-full bg-red-500/15"
                  >
                    <Ionicons name="close" size={14} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      onAcceptPassenger(trip, p.id);
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

  return {
    openPassengerMapSheet,
    openTripMapSheet,
    callPassenger,
  };
}
