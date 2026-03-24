import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Text } from "@/src/components/ui/text";
import type { OtherDriverRoute } from "@/src/data/otherDriversRoutes";
import { mapRouteToOtherDriverRoute } from "@/src/lib/mappers";
import { cn, formatPrice } from "@/src/lib/utils";
import { getAllRoutes } from "@/src/services/route.service";
import { requestRoute } from "@/src/services/routePassenger.service";
import {
  calculateRouteWithGoogle,
  fetchRouteGeometry,
} from "@/src/utils/routeGeometry";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapPressEvent,
} from "react-native-maps";
import Animated, { FadeInDown } from "react-native-reanimated";

type PointField = "depart" | "arrivee";
type FormStep = 1 | 2 | 3;

type RoutePoint = {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
};

type Quartier = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const defaultRegion = {
  latitude: 12.6392,
  longitude: -8.0029,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const quartiers: Quartier[] = [
  {
    id: "hamdallaye",
    name: "Hamdallaye",
    latitude: 12.6337,
    longitude: -8.0059,
  },
  { id: "aci2000", name: "ACI 2000", latitude: 12.6201, longitude: -8.0264 },
  {
    id: "badalabougou",
    name: "Badalabougou",
    latitude: 12.6333,
    longitude: -7.9833,
  },
  { id: "sogoniko", name: "Sogoniko", latitude: 12.5987, longitude: -8.0099 },
  {
    id: "lafiabougou",
    name: "Lafiabougou",
    latitude: 12.6743,
    longitude: -8.0098,
  },
  {
    id: "kalaban",
    name: "Kalaban Coura",
    latitude: 12.5658,
    longitude: -7.9896,
  },
  { id: "niamakoro", name: "Niamakoro", latitude: 12.5854, longitude: -7.9502 },
];

const formatPointLabel = (lat: number, lng: number) =>
  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Texte exact comme dans la liste de recherche Google (ligne cliquée). */
const getPlaceDisplayNameFromAutocomplete = (
  data: { description?: string },
  details: { formatted_address?: string; name?: string } | null | undefined,
  lat: number,
  lng: number,
): string => {
  const fromRow = data.description?.trim();
  if (fromRow) return fromRow;
  return (
    details?.formatted_address?.trim() ||
    details?.name?.trim() ||
    formatPointLabel(lat, lng)
  );
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatTime = (d: Date) =>
  d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const SearchRouteScreen = () => {
  const mapRef = React.useRef<MapView>(null);
  const [step, setStep] = React.useState<FormStep>(1);
  const [activeMapField, setActiveMapField] = React.useState<PointField | null>(
    null,
  );
  const [pendingPoint, setPendingPoint] = React.useState<RoutePoint | null>(
    null,
  );
  const [quartierSearch, setQuartierSearch] = React.useState("");
  const [departure, setDeparture] = React.useState<RoutePoint | null>(null);
  const [arrival, setArrival] = React.useState<RoutePoint | null>(null);
  const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);
  const [tripDateValue, setTripDateValue] = React.useState<Date | null>(null);
  const [tripTimeValue, setTripTimeValue] = React.useState<Date | null>(null);
  const [pickerMode, setPickerMode] = React.useState<"date" | "time" | null>(
    null,
  );
  const [pickerTempValue, setPickerTempValue] = React.useState(new Date());
  const [currentLocation, setCurrentLocation] = React.useState<LatLng | null>(
    null,
  );
  const [distanceKm, setDistanceKm] = React.useState("0");
  const [durationMin, setDurationMin] = React.useState(0);
  const [seats, setSeats] = React.useState(1);
  const [showMapResults, setShowMapResults] = React.useState(false);
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(
    null,
  );
  const [isReserving, setIsReserving] = React.useState(false);
  const [driverRouteCoords, setDriverRouteCoords] = React.useState<LatLng[]>(
    [],
  );

  const { data: allRoutesData = [] } = useQuery({
    ...getAllRoutes(),
    enabled: showMapResults,
    refetchInterval: 5000,
  });

  const otherDriversRoutes: OtherDriverRoute[] = (allRoutesData ?? [])
    .filter((r) => r.availableSeats > 0)
    .map((r, i) =>
      mapRouteToOtherDriverRoute(
        r as Parameters<typeof mapRouteToOtherDriverRoute>[0],
        i,
      ),
    );

  const filteredQuartiers = React.useMemo(() => {
    const q = quartierSearch.trim().toLowerCase();
    return !q
      ? quartiers
      : quartiers.filter((x) => x.name.toLowerCase().includes(q));
  }, [quartierSearch]);

  const canGoStep2 = Boolean(departure) && Boolean(arrival);
  const canGoStep3 =
    canGoStep2 && Boolean(tripDateValue) && Boolean(tripTimeValue);
  const canSubmit = canGoStep3 && seats >= 1;

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      return data?.display_name ?? "Adresse indisponible";
    } catch {
      return "Adresse indisponible";
    }
  };

  const calculateRoute = async (from: RoutePoint, to: RoutePoint) => {
    try {
      const result = await calculateRouteWithGoogle(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude,
      );
      setRouteCoordinates(result.coords);
      setDistanceKm(result.distanceKm);
      setDurationMin(result.durationMin);
    } catch {
      setRouteCoordinates([]);
      setDistanceKm("0");
      setDurationMin(0);
    }
  };

  const onMapPress = async (e: MapPressEvent) => {
    if (!activeMapField) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const address = await getAddressFromCoordinates(latitude, longitude);
    const pt: RoutePoint = {
      latitude,
      longitude,
      label: formatPointLabel(latitude, longitude),
      address,
    };
    setPendingPoint(pt);
    if (activeMapField === "depart" && arrival)
      await calculateRoute(pt, arrival);
    if (activeMapField === "arrivee" && departure)
      await calculateRoute(departure, pt);
  };

  const applyCurrentLocation = async () => {
    if (!currentLocation || !activeMapField) return;
    const address = await getAddressFromCoordinates(
      currentLocation.latitude,
      currentLocation.longitude,
    );
    const pt: RoutePoint = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      label: formatPointLabel(
        currentLocation.latitude,
        currentLocation.longitude,
      ),
      address,
    };
    setPendingPoint(pt);
    if (activeMapField === "depart" && arrival)
      await calculateRoute(pt, arrival);
    if (activeMapField === "arrivee" && departure)
      await calculateRoute(departure, pt);
  };

  const setPointFromQuartier = async (q: Quartier) => {
    const displayName = q.name.trim();
    const pt: RoutePoint = {
      latitude: q.latitude,
      longitude: q.longitude,
      label: displayName,
      address: displayName,
    };
    setPendingPoint(pt);
    if (activeMapField === "depart" && arrival)
      await calculateRoute(pt, arrival);
    if (activeMapField === "arrivee" && departure)
      await calculateRoute(departure, pt);
    mapRef.current?.animateToRegion({
      latitude: q.latitude,
      longitude: q.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  };

  const confirmSelectedPoint = async () => {
    if (!activeMapField || !pendingPoint) return;
    if (activeMapField === "depart") setDeparture(pendingPoint);
    else setArrival(pendingPoint);
    if (activeMapField === "depart" && arrival)
      await calculateRoute(pendingPoint, arrival);
    if (activeMapField === "arrivee" && departure)
      await calculateRoute(departure, pendingPoint);
    setActiveMapField(null);
    setPendingPoint(null);
    setQuartierSearch("");
  };

  const openMapPicker = (field: PointField) => {
    setActiveMapField(field);
    setPendingPoint(field === "depart" ? departure : arrival);
    setQuartierSearch("");
  };

  const closeMapPicker = async () => {
    setActiveMapField(null);
    setPendingPoint(null);
    setQuartierSearch("");
    if (departure && arrival) await calculateRoute(departure, arrival);
  };

  const resetForm = () => {
    setStep(1);
    setDeparture(null);
    setArrival(null);
    setTripDateValue(null);
    setTripTimeValue(null);
    setSeats(1);
    setRouteCoordinates([]);
    setDistanceKm("0");
    setDurationMin(0);
    setShowMapResults(false);
    setSelectedDriverId(null);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") return;
    if (selected) setPickerTempValue(selected);
  };

  const previewDeparture =
    activeMapField === "depart" && pendingPoint ? pendingPoint : departure;
  const previewArrival =
    activeMapField === "arrivee" && pendingPoint ? pendingPoint : arrival;

  const selectedDriver = selectedDriverId
    ? (otherDriversRoutes.find((d) => d.id === selectedDriverId) ?? null)
    : null;

  const mapRegion = React.useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    if (departure) {
      lats.push(departure.latitude);
      lngs.push(departure.longitude);
    }
    if (arrival) {
      lats.push(arrival.latitude);
      lngs.push(arrival.longitude);
    }
    if (selectedDriver) {
      lats.push(selectedDriver.pickupLat, selectedDriver.dropLat);
      lngs.push(selectedDriver.pickupLng, selectedDriver.dropLng);
    } else {
      /* Inclure tous les conducteurs disponibles quand aucun n'est sélectionné */
      for (const d of otherDriversRoutes) {
        lats.push(d.pickupLat, d.dropLat);
        lngs.push(d.pickupLng, d.dropLng);
      }
    }
    if (lats.length === 0) return defaultRegion;
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(
        0.06,
        (Math.max(...lats) - Math.min(...lats)) * 1.6,
      ),
      longitudeDelta: Math.max(
        0.06,
        (Math.max(...lngs) - Math.min(...lngs)) * 1.6,
      ),
    };
  }, [departure, arrival, selectedDriver, otherDriversRoutes]);

  React.useEffect(() => {
    if (showMapResults && mapRef.current) {
      mapRef.current.animateToRegion(mapRegion, 450);
    }
  }, [selectedDriverId, showMapResults, mapRegion]);

  const onMapReady = React.useCallback(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(mapRegion, 1);
    }
  }, [mapRegion]);

  const screenH = Dimensions.get("window").height;

  React.useEffect(() => {
    if (!selectedDriver) {
      setDriverRouteCoords([]);
      return;
    }
    fetchRouteGeometry(
      selectedDriver.pickupLat,
      selectedDriver.pickupLng,
      selectedDriver.dropLat,
      selectedDriver.dropLng,
    )
      .then(setDriverRouteCoords)
      .catch(() => setDriverRouteCoords([]));
  }, [selectedDriver]);

  const routesSheetSnapPoints = useMemo(
    () => (selectedDriverId ? ["30%", "88%"] : ["50%", "88%"]),
    [selectedDriverId],
  );
  const routesSheetRef = React.useRef<BottomSheet>(null);

  React.useEffect(() => {
    if (routesSheetRef.current && selectedDriverId) {
      routesSheetRef.current.snapToIndex(0);
    }
  }, [selectedDriverId]);

  const handleReserve = async () => {
    if (!selectedDriverId || isReserving) return;
    const driver = otherDriversRoutes.find((d) => d.id === selectedDriverId);
    const selectedRoute = (allRoutesData ?? []).find(
      (route) => route.id === selectedDriverId,
    );
    if (!driver) return;
    setIsReserving(true);
    try {
      // Always align passenger reservation datetime with the selected driver route datetime.
      const departureAt = selectedRoute?.departureAt ?? undefined;
      await requestRoute(driver.id, seats, {
        pickupLat: departure?.latitude,
        pickupLng: departure?.longitude,
        dropLat: arrival?.latitude,
        dropLng: arrival?.longitude,
        pickupAddress: departure?.address,
        dropAddress: arrival?.address,
        departureAt,
      });
      router.replace("/(tabs)" as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Une erreur est survenue";
      Alert.alert("Erreur", msg);
    } finally {
      setIsReserving(false);
    }
  };
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="none"
        pointerEvents="none"
      />
    ),
    [],
  );

  if (showMapResults) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 pb-4 bg-primary pt-safe">
          <View className="flex-row justify-between items-center pt-3 mb-4">
            <TouchableOpacity onPress={() => setShowMapResults(false)}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">
              Choisir un trajet
            </Text>
            {selectedDriverId ? (
              <TouchableOpacity
                onPress={() => void handleReserve()}
                disabled={
                  isReserving || (selectedDriver?.availableSeats ?? 0) < seats
                }
                className={cn(
                  "px-4 py-2 rounded-lg",
                  (selectedDriver?.availableSeats ?? 0) >= seats
                    ? "bg-emerald-500"
                    : "bg-gray-400",
                )}
              >
                <Text className="text-sm font-semibold text-white">
                  {isReserving ? "..." : "Réserver"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="w-6" />
            )}
          </View>
        </View>

        <View
          style={{
            flex: 1,
            minHeight: Math.max(280, screenH * 0.38),
            position: "relative",
          }}
        >
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapRegion}
            onMapReady={onMapReady}
            showsUserLocation
            mapType="standard"
          >
            {/* Itinéraire passager (pointillés sur iOS uniquement — Android Google Maps peut ne pas les afficher) */}
            {/*             {departure && arrival && routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#0ea5e9"
                strokeWidth={4}
                lineDashPattern={
                  Platform.OS === "ios" ? [8, 4] : undefined
                }
              />
            )}
            {departure && (
              <Marker
                coordinate={{
                  latitude: departure.latitude,
                  longitude: departure.longitude,
                }}
                title="Mon départ"
                pinColor="#2563eb"
              />
            )}
            {arrival && (
              <Marker
                coordinate={{
                  latitude: arrival.latitude,
                  longitude: arrival.longitude,
                }}
                title="Mon arrivée"
                pinColor="#e11d48"
              />
            )} */}

            {/* Tous les conducteurs disponibles sur la carte */}
            {otherDriversRoutes.map((r) => {
              const isSelected = r.id === selectedDriverId;
              return (
                <React.Fragment key={r.id}>
                  <Marker
                    coordinate={{
                      latitude: r.pickupLat,
                      longitude: r.pickupLng,
                    }}
                    title={`Départ — ${r.driverName}`}
                    description={r.from}
                    pinColor={isSelected ? r.color : "#94a3b8"}
                    onPress={() => setSelectedDriverId(r.id)}
                  />
                  <Marker
                    coordinate={{ latitude: r.dropLat, longitude: r.dropLng }}
                    title={`Arrivée — ${r.driverName}`}
                    description={r.to}
                    pinColor={isSelected ? r.color : "#94a3b8"}
                    onPress={() => setSelectedDriverId(r.id)}
                  />
                  {/* Tracé Google réel pour le conducteur sélectionné */}
                  {isSelected && driverRouteCoords.length >= 2 && (
                    <Polyline
                      coordinates={driverRouteCoords}
                      strokeColor={r.color}
                      strokeWidth={5}
                    />
                  )}
                  {/* Ligne indicative pour les autres */}
                  {!isSelected && (
                    <Polyline
                      coordinates={[
                        { latitude: r.pickupLat, longitude: r.pickupLng },
                        { latitude: r.dropLat, longitude: r.dropLng },
                      ]}
                      strokeColor="#94a3b8"
                      strokeWidth={2}
                      lineDashPattern={
                        Platform.OS === "ios" ? [4, 4] : undefined
                      }
                    />
                  )}
                </React.Fragment>
              );
            })}
          </MapView>

          <BottomSheet
            ref={routesSheetRef}
            snapPoints={routesSheetSnapPoints}
            index={0}
            enablePanDownToClose={false}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: "#cbd5e1" }}
            backgroundStyle={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <BottomSheetScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 48,
                paddingTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => routesSheetRef.current?.snapToIndex(1)}
                className="mb-4"
              >
                <Text className="text-base font-bold text-foreground">
                  Choisir un trajet
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Appuyez pour agrandir la liste
                </Text>
              </TouchableOpacity>
              {otherDriversRoutes.length === 0 ? (
                <Text className="py-8 text-center text-muted-foreground">
                  Aucun trajet disponible pour le moment
                </Text>
              ) : (
                <View className="flex-col gap-3">
                  {otherDriversRoutes.map((driver) => (
                    <TouchableOpacity
                      key={driver.id}
                      onPress={() => setSelectedDriverId(driver.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2",
                        selectedDriverId === driver.id
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-gray-50",
                      )}
                    >
                      <View className="flex-row items-center mb-2">
                        <View
                          className="p-2 rounded-full"
                          style={{ backgroundColor: `${driver.color}20` }}
                        >
                          <Ionicons
                            name="car-sport"
                            size={18}
                            color={driver.color}
                          />
                        </View>
                        <Text
                          className={cn(
                            "ml-3 font-semibold text-base",
                            selectedDriverId === driver.id
                              ? "text-primary"
                              : "text-foreground",
                          )}
                          numberOfLines={1}
                        >
                          {driver.driverName}
                        </Text>
                        <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15">
                          <Text className="text-xs font-semibold text-amber-700">
                            {driver.driverRating}★
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-2 items-center mb-2">
                        <Ionicons
                          name="navigate-outline"
                          size={14}
                          color="#2563eb"
                        />
                        <Text
                          className="flex-1 text-sm text-muted-foreground"
                          numberOfLines={1}
                        >
                          {driver.from}
                        </Text>
                      </View>
                      <View className="flex-row gap-2 items-center mb-2">
                        <Ionicons
                          name="flag-outline"
                          size={14}
                          color="#e11d48"
                        />
                        <Text
                          className="flex-1 text-sm text-muted-foreground"
                          numberOfLines={1}
                        >
                          {driver.to}
                        </Text>
                      </View>
                      <View className="flex-row gap-2 justify-between items-center mt-2 mb-2">
                        <View className="flex-row gap-1 items-center">
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="black"
                          />
                          <Text className="text-sm text-muted-foreground">
                            Départ : {driver.departureAt}
                          </Text>
                        </View>
                        <View className="flex-row gap-1 items-center">
                          <Ionicons
                            name="cash-outline"
                            size={16}
                            color="#059669"
                          />
                          <Text className="text-sm font-bold text-emerald-600">
                            {formatPrice(driver.distanceKm, seats)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row gap-3 items-center">
                          <View className="flex-row gap-1 items-center">
                            <Ionicons
                              name="people-outline"
                              size={14}
                              color="#64748b"
                            />
                            <Text
                              className={cn(
                                "text-xs",
                                driver.availableSeats < seats
                                  ? "text-red-600 font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {driver.availableSeats} dispo
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row gap-1 items-center">
                          <Ionicons
                            name="person-outline"
                            size={14}
                            color="#6366f1"
                          />
                          <Text className="text-xs font-medium text-indigo-600">
                            {seats} réservé(s)
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </BottomSheetScrollView>
          </BottomSheet>
        </View>
      </View>
    );
  }

  if (activeMapField) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 pb-4 bg-primary pt-safe">
          <View className="flex-row justify-between items-center pt-3 mb-4">
            <TouchableOpacity onPress={() => void closeMapPicker()}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">
              Choisir {activeMapField === "depart" ? "Départ" : "Arrivée"}
            </Text>
            <View className="w-6" />
          </View>
          <View className="z-50">
            <GooglePlacesAutocomplete
              placeholder="Rechercher un lieu..."
              fetchDetails
              onPress={(data, details) => {
                if (details?.geometry?.location) {
                  const { lat, lng } = details.geometry.location;
                  const displayName = getPlaceDisplayNameFromAutocomplete(
                    data,
                    details,
                    lat,
                    lng,
                  );
                  const point: RoutePoint = {
                    latitude: lat,
                    longitude: lng,
                    label: displayName,
                    address: displayName,
                  };
                  setPendingPoint(point);
                  mapRef.current?.animateToRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }
              }}
              nearbyPlacesAPI="GooglePlacesSearch"
              debounce={400}
              minLength={2}
              listViewDisplayed="auto"
              GooglePlacesDetailsQuery={{
                fields: "geometry,formatted_address,name,address_components",
              }}
              query={{
                key: Constants.expoConfig?.extra?.googleMapsApiKey ?? "",
                language: "fr",
                components: "country:ml",
                types: "geocode|establishment",
                radius: 50000,
                location: "12.6392,-8.0029",
              }}
              styles={{
                container: { flex: 0, zIndex: 1 },
                textInput: {
                  height: 44,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  fontSize: 14,
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    },
                    android: { elevation: 3 },
                  }),
                },
                listView: {
                  borderRadius: 12,
                  marginTop: 4,
                  backgroundColor: "white",
                  position: "absolute",
                  top: 48,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    },
                    android: { elevation: 5 },
                  }),
                },
                row: { padding: 12, minHeight: 48 },
                description: { fontSize: 13 },
                separator: { height: 1, backgroundColor: "#f3f4f6" },
              }}
              enablePoweredByContainer={false}
              textInputProps={{
                placeholderTextColor: "#9ca3af",
                autoCorrect: false,
                autoCapitalize: "none",
                returnKeyType: "search",
                onChangeText: (text: string) => setQuartierSearch(text),
              }}
              requestUrl={{
                useOnPlatform: "all",
                url: "https://maps.googleapis.com/maps/api",
              }}
            />
            {quartierSearch.trim().length > 0 &&
            filteredQuartiers.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                className="mt-2 max-h-36"
                nestedScrollEnabled
              >
                <Text className="mb-2 text-xs font-semibold text-white/90">
                  Quartiers (nom exact enregistré)
                </Text>
                {filteredQuartiers.map((q) => (
                  <TouchableOpacity
                    key={q.id}
                    onPress={() => void setPointFromQuartier(q)}
                    className="py-2.5 border-b border-white/20"
                  >
                    <Text className="text-sm text-white">{q.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={defaultRegion}
            onPress={(e) => void onMapPress(e)}
            showsUserLocation
            onUserLocationChange={(e) => {
              const c = e.nativeEvent.coordinate;
              if (c)
                setCurrentLocation({
                  latitude: c.latitude,
                  longitude: c.longitude,
                });
            }}
          >
            {previewDeparture && (
              <Marker
                coordinate={{
                  latitude: previewDeparture.latitude,
                  longitude: previewDeparture.longitude,
                }}
                title="Départ"
                description={previewDeparture.address}
                pinColor="#2563eb"
              />
            )}
            {previewArrival && (
              <Marker
                coordinate={{
                  latitude: previewArrival.latitude,
                  longitude: previewArrival.longitude,
                }}
                title="Arrivée"
                description={previewArrival.address}
                pinColor="#e11d48"
              />
            )}
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#0ea5e9"
                strokeWidth={5}
              />
            )}
          </MapView>
          <TouchableOpacity
            className="absolute top-5 right-5 justify-center items-center bg-white rounded-full shadow-md size-11"
            onPress={() =>
              currentLocation &&
              mapRef.current?.animateToRegion({
                ...currentLocation,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              })
            }
          >
            <Ionicons name="locate-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View className="absolute right-5 bottom-5 left-5 p-4 bg-white rounded-2xl border shadow-lg border-gray">
            <View className="p-3 rounded-xl border border-gray">
              <View className="flex-row gap-2 items-center">
                <Ionicons name="location-outline" size={16} color="#6366f1" />
                <Text className="text-xs text-muted-foreground">
                  Point sélectionné
                </Text>
              </View>
              <Text className="mt-1 text-sm font-semibold">
                {pendingPoint?.address ?? "Aucun"}
              </Text>
            </View>
            <View className="flex-row gap-2 mt-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => void applyCurrentLocation()}
              >
                <Text>Ma position</Text>
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={!pendingPoint}
                onPress={() => void confirmSelectedPoint()}
              >
                <Text>Terminer</Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-5 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">
            Rechercher un trajet
          </Text>
          <View className="w-6" />
        </View>
        <View className="flex-row gap-2">
          {[
            { id: 1, label: "Itinéraire", icon: "map-outline" },
            { id: 2, label: "Date/Heure", icon: "calendar-outline" },
            { id: 3, label: "Places", icon: "people-outline" },
          ].map((item) => {
            const active = step === item.id;
            const allowed =
              item.id === 1 ||
              (item.id === 2 && canGoStep2) ||
              (item.id === 3 && canGoStep3);
            return (
              <TouchableOpacity
                key={item.id}
                className={cn(
                  "flex-1 flex-row items-center justify-center rounded-xl px-2 py-2",
                  active ? "bg-white" : "bg-white/20",
                  !allowed && "opacity-40",
                )}
                disabled={!allowed}
                onPress={() => setStep(item.id as FormStep)}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={active ? "#0f172a" : "white"}
                />
                <Text
                  className={cn(
                    "ml-1 font-semibold text-[11px]",
                    active ? "text-slate-900" : "text-white",
                  )}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-5">
        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Itinéraire</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <TouchableOpacity
                  className="p-3 rounded-xl border border-gray"
                  onPress={() => openMapPicker("depart")}
                >
                  <View className="flex-row gap-2 items-center">
                    <View className="p-2 rounded-full bg-blue-500/10">
                      <Ionicons
                        name="navigate-outline"
                        size={18}
                        color="#2563eb"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground">
                        Départ
                      </Text>
                      <Text
                        className="mt-0.5 text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {departure?.address ?? "Choisir le départ sur la map"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94a3b8"
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-3 rounded-xl border border-gray"
                  onPress={() => openMapPicker("arrivee")}
                >
                  <View className="flex-row gap-2 items-center">
                    <View className="p-2 rounded-full bg-rose-500/10">
                      <Ionicons name="flag-outline" size={18} color="#e11d48" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-muted-foreground">
                        Arrivée
                      </Text>
                      <Text
                        className="mt-0.5 text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {arrival?.address ?? "Choisir l'arrivée sur la map"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94a3b8"
                    />
                  </View>
                </TouchableOpacity>
                <View className="flex-row justify-between items-center p-3 mt-2 rounded-xl bg-primary/10">
                  <View className="flex-row gap-2 items-center">
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={18}
                      color="#6366f1"
                    />
                    <Text className="text-sm font-semibold">
                      Distance: {distanceKm} km
                    </Text>
                  </View>
                  <View className="flex-row gap-2 items-center">
                    <Ionicons name="time-outline" size={18} color="#6366f1" />
                    <Text className="text-sm font-semibold">
                      Durée: {durationMin} min
                    </Text>
                  </View>
                </View>
                <Button
                  className="mt-2 rounded-xl"
                  disabled={!canGoStep2}
                  onPress={() => setStep(2)}
                >
                  <Text>Continuer</Text>
                </Button>
              </CardContent>
            </Card>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Date et heure</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <TouchableOpacity
                  className="flex-row justify-between items-center p-3 rounded-xl border border-gray"
                  onPress={() => {
                    setPickerTempValue(tripDateValue ?? new Date());
                    setPickerMode("date");
                  }}
                >
                  <View className="flex-row gap-2 items-center">
                    <View className="p-2 rounded-full bg-primary/10">
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#6366f1"
                      />
                    </View>
                    <Text className="text-sm font-medium">
                      {tripDateValue
                        ? formatDate(tripDateValue)
                        : "Choisir la date"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row justify-between items-center p-3 rounded-xl border border-gray"
                  onPress={() => {
                    setPickerTempValue(tripTimeValue ?? new Date());
                    setPickerMode("time");
                  }}
                >
                  <View className="flex-row gap-2 items-center">
                    <View className="p-2 rounded-full bg-primary/10">
                      <Ionicons name="time-outline" size={18} color="#6366f1" />
                    </View>
                    <Text className="text-sm font-medium">
                      {tripTimeValue
                        ? formatTime(tripTimeValue)
                        : "Choisir l'heure"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onPress={() => setStep(1)}
                  >
                    <Text>Retour</Text>
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    disabled={!canGoStep3}
                    onPress={() => setStep(3)}
                  >
                    <Text>Continuer</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Nombre de places</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="flex-row gap-2 items-center mb-2">
                  <View className="p-2 rounded-full bg-primary/10">
                    <Ionicons name="people-outline" size={18} color="#6366f1" />
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    Combien de places souhaitez-vous réserver ?
                  </Text>
                </View>
                <View className="flex-row gap-4 justify-center items-center py-4">
                  <TouchableOpacity
                    onPress={() => setSeats((s) => Math.max(1, s - 1))}
                    className="justify-center items-center rounded-full border-2 size-12 border-primary bg-primary/10"
                  >
                    <Ionicons name="remove" size={24} color="#6366f1" />
                  </TouchableOpacity>
                  <View className="min-w-[60px] items-center">
                    <Text className="text-2xl font-bold text-foreground">
                      {seats}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSeats((s) => Math.min(10, s + 1))}
                    className="justify-center items-center rounded-full border-2 size-12 border-primary bg-primary/10"
                  >
                    <Ionicons name="add" size={24} color="#6366f1" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onPress={() => setStep(2)}
                  >
                    <Text>Retour</Text>
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    disabled={!canSubmit}
                    onPress={() => {
                      if (tripDateValue && tripTimeValue) {
                        const combined = new Date(tripDateValue);
                        combined.setHours(
                          tripTimeValue.getHours(),
                          tripTimeValue.getMinutes(),
                          0,
                          0,
                        );
                        if (combined < new Date()) {
                          Alert.alert(
                            "Date invalide",
                            "La date et l'heure sélectionnées sont déjà passées.",
                          );
                          return;
                        }
                      }
                      setShowMapResults(true);
                    }}
                  >
                    <Text>Chercher le trajet</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        )}

        <Button variant="ghost" className="mt-4 rounded-xl" onPress={resetForm}>
          <Text>Réinitialiser</Text>
        </Button>
      </ScrollView>

      <Modal transparent visible={pickerMode !== null} animationType="fade">
        <View className="flex-1 justify-center items-center px-6 bg-black/40">
          <View className="p-4 w-full max-w-md bg-white rounded-2xl">
            <Text className="mb-2 text-base font-semibold text-center">
              {pickerMode === "date" ? "Choisir la date" : "Choisir l'heure"}
            </Text>
            <DateTimePicker
              mode={pickerMode ?? "date"}
              value={pickerTempValue}
              onChange={onPickerChange}
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={pickerMode === "date" ? new Date() : undefined}
            />
            <View className="flex-row gap-2 mt-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => setPickerMode(null)}
              >
                <Text>Annuler</Text>
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onPress={() => {
                  if (pickerMode === "date") {
                    setTripDateValue(pickerTempValue);
                    setPickerMode(null);
                  } else if (pickerMode === "time") {
                    const combined = new Date(tripDateValue ?? new Date());
                    combined.setHours(
                      pickerTempValue.getHours(),
                      pickerTempValue.getMinutes(),
                      0,
                      0,
                    );
                    if (combined < new Date()) {
                      Alert.alert(
                        "Heure invalide",
                        "L'heure sélectionnée est déjà passée. Veuillez choisir une heure future.",
                      );
                      return;
                    }
                    setTripTimeValue(pickerTempValue);
                    setPickerMode(null);
                  }
                }}
              >
                <Text>Valider</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchRouteScreen;
