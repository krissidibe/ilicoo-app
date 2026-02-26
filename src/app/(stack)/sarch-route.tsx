import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  type LatLng,
  type MapPressEvent,
} from "react-native-maps";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { cn } from "@/src/lib/utils";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";

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
  { id: "hamdallaye", name: "Hamdallaye", latitude: 12.6337, longitude: -8.0059 },
  { id: "aci2000", name: "ACI 2000", latitude: 12.6201, longitude: -8.0264 },
  { id: "badalabougou", name: "Badalabougou", latitude: 12.6333, longitude: -7.9833 },
  { id: "sogoniko", name: "Sogoniko", latitude: 12.5987, longitude: -8.0099 },
  { id: "lafiabougou", name: "Lafiabougou", latitude: 12.6743, longitude: -8.0098 },
  { id: "kalaban", name: "Kalaban Coura", latitude: 12.5658, longitude: -7.9896 },
  { id: "niamakoro", name: "Niamakoro", latitude: 12.5854, longitude: -7.9502 },
];

const formatPointLabel = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const estimatePrice = (distance: number): number => {
  const price = 500 + distance * 325;
  return Math.max(1500, Math.round(price));
};

const SearchRoute = () => {
  const { open, close } = useBottomSheetStore();
  const mapRef = React.useRef<MapView>(null);

  const [step, setStep] = React.useState<FormStep>(1);
  const [activeMapField, setActiveMapField] = React.useState<PointField | null>(null);
  const [pendingPoint, setPendingPoint] = React.useState<RoutePoint | null>(null);
  const [quartierSearch, setQuartierSearch] = React.useState<string>("");

  const [departure, setDeparture] = React.useState<RoutePoint | null>(null);
  const [arrival, setArrival] = React.useState<RoutePoint | null>(null);
  const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);

  const [tripDateValue, setTripDateValue] = React.useState<Date | null>(null);
  const [tripTimeValue, setTripTimeValue] = React.useState<Date | null>(null);
  const [pickerMode, setPickerMode] = React.useState<"date" | "time" | null>(null);
  const [pickerTempValue, setPickerTempValue] = React.useState<Date>(new Date());

  const [currentLocation, setCurrentLocation] = React.useState<LatLng | null>(null);
  const [seats, setSeats] = React.useState<string>("");

  const [distanceKm, setDistanceKm] = React.useState<string>("0");
  const [durationMin, setDurationMin] = React.useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = React.useState<boolean>(false);

  const filteredQuartiers = React.useMemo(() => {
    const searchValue = quartierSearch.trim().toLowerCase();
    if (!searchValue) return quartiers;
    return quartiers.filter((q) => q.name.toLowerCase().includes(searchValue));
  }, [quartierSearch]);

  const canGoStep2 = Boolean(departure) && Boolean(arrival);
  const canGoStep3 = canGoStep2 && Boolean(tripDateValue) && Boolean(tripTimeValue);
  const seatsValid = Number(seats) >= 1 && Number(seats) <= 6;
  const canSubmit = canGoStep3 && seatsValid;

  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      );
      const data = await response.json();
      return data?.display_name ?? "Adresse indisponible";
    } catch {
      return "Adresse indisponible";
    }
  };

  const calculateRoute = async (fromPoint: RoutePoint, toPoint: RoutePoint): Promise<void> => {
    try {
      setIsLoadingRoute(true);
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${fromPoint.longitude},${fromPoint.latitude};${toPoint.longitude},${toPoint.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(routeUrl);
      const data = await response.json();
      const route = data?.routes?.[0];

      if (!route) {
        setRouteCoordinates([]);
        setDistanceKm("0");
        setDurationMin(0);
        return;
      }

      const coords: LatLng[] = route.geometry.coordinates.map((p: number[]) => ({
        latitude: p[1],
        longitude: p[0],
      }));
      setRouteCoordinates(coords);
      setDistanceKm((route.distance / 1000).toFixed(2));
      setDurationMin(Math.round(route.duration / 60));
    } catch {
      setRouteCoordinates([]);
      setDistanceKm("0");
      setDurationMin(0);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const onMapPress = async (event: MapPressEvent): Promise<void> => {
    if (!activeMapField) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const address = await getAddressFromCoordinates(latitude, longitude);
    const nextPoint: RoutePoint = {
      latitude,
      longitude,
      label: formatPointLabel(latitude, longitude),
      address,
    };

    setPendingPoint(nextPoint);

    if (activeMapField === "depart" && arrival) await calculateRoute(nextPoint, arrival);
    if (activeMapField === "arrivee" && departure) await calculateRoute(departure, nextPoint);
  };

  const applyCurrentLocation = async (): Promise<void> => {
    if (!currentLocation || !activeMapField) return;

    const address = await getAddressFromCoordinates(
      currentLocation.latitude,
      currentLocation.longitude,
    );
    const nextPoint: RoutePoint = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      label: formatPointLabel(currentLocation.latitude, currentLocation.longitude),
      address,
    };

    setPendingPoint(nextPoint);

    if (activeMapField === "depart" && arrival) await calculateRoute(nextPoint, arrival);
    if (activeMapField === "arrivee" && departure) await calculateRoute(departure, nextPoint);
  };

  const setPointFromQuartier = async (quartier: Quartier): Promise<void> => {
    const address = await getAddressFromCoordinates(quartier.latitude, quartier.longitude);
    const nextPoint: RoutePoint = {
      latitude: quartier.latitude,
      longitude: quartier.longitude,
      label: formatPointLabel(quartier.latitude, quartier.longitude),
      address,
    };

    setPendingPoint(nextPoint);
    if (activeMapField === "depart" && arrival) await calculateRoute(nextPoint, arrival);
    if (activeMapField === "arrivee" && departure) await calculateRoute(departure, nextPoint);

    mapRef.current?.animateToRegion({
      latitude: quartier.latitude,
      longitude: quartier.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  };

  const confirmSelectedPoint = async (): Promise<void> => {
    if (!activeMapField || !pendingPoint) return;

    let dep = departure;
    let arr = arrival;

    if (activeMapField === "depart") {
      dep = pendingPoint;
      setDeparture(pendingPoint);
    } else {
      arr = pendingPoint;
      setArrival(pendingPoint);
    }

    if (dep && arr) await calculateRoute(dep, arr);
    setActiveMapField(null);
    setPendingPoint(null);
    setQuartierSearch("");
  };

  const openMapPicker = (field: PointField): void => {
    setActiveMapField(field);
    setPendingPoint(field === "depart" ? departure : arrival);
    setQuartierSearch("");
  };

  const closeMapPicker = async (): Promise<void> => {
    setActiveMapField(null);
    setPendingPoint(null);
    setQuartierSearch("");
    if (departure && arrival) await calculateRoute(departure, arrival);
  };

  const openAppleMaps = async (): Promise<void> => {
    if (!departure || !arrival) return;
    const mapsUrl = `http://maps.apple.com/?saddr=${departure.latitude},${departure.longitude}&daddr=${arrival.latitude},${arrival.longitude}&dirflg=d`;
    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (canOpen) await Linking.openURL(mapsUrl);
  };

  const resetForm = (): void => {
    setStep(1);
    setDeparture(null);
    setArrival(null);
    setTripDateValue(null);
    setTripTimeValue(null);
    setSeats("");
    setRouteCoordinates([]);
    setDistanceKm("0");
    setDurationMin(0);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date): void => {
    if (event.type === "dismissed") return;
    if (selected) setPickerTempValue(selected);
  };

  const openDatePicker = (): void => {
    setPickerTempValue(tripDateValue ?? new Date());
    setPickerMode("date");
  };

  const openTimePicker = (): void => {
    setPickerTempValue(tripTimeValue ?? new Date());
    setPickerMode("time");
  };

  const confirmPickerSelection = (): void => {
    if (pickerMode === "date") setTripDateValue(pickerTempValue);
    if (pickerMode === "time") setTripTimeValue(pickerTempValue);
    setPickerMode(null);
  };

  const openRecapModal = (): void => {
    if (!departure || !arrival || !tripDateValue || !tripTimeValue || !canSubmit) return;

    const estimatedPrice = estimatePrice(Number(distanceKm));

    open(
      <View className="px-5 pb-7 pt-2">
        <Text className="text-xl font-bold text-foreground">Recapitulatif du trajet</Text>
        <View className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Text className="text-xs text-muted-foreground">Depart</Text>
          <Text className="text-sm font-semibold">{departure.address}</Text>
          <Text className="mt-2 text-xs text-muted-foreground">Arrivee</Text>
          <Text className="text-sm font-semibold">{arrival.address}</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm">Date / Heure</Text>
            <Text className="text-sm font-semibold">
              {formatDate(tripDateValue)} - {formatTime(tripTimeValue)}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm">Distance</Text>
            <Text className="text-sm font-semibold">{distanceKm} km</Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm">Prix estime</Text>
            <Text className="text-sm font-bold text-primary">
              {estimatedPrice.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onPress={close}>
            <Text>Modifier</Text>
          </Button>
          <Button className="flex-1 rounded-xl" onPress={openAppleMaps}>
            <Text>Ouvrir Plans</Text>
          </Button>
        </View>
      </View>,
      ["72%"],
    );
  };

  const previewDeparture =
    activeMapField === "depart" && pendingPoint ? pendingPoint : departure;
  const previewArrival =
    activeMapField === "arrivee" && pendingPoint ? pendingPoint : arrival;

  if (activeMapField) {
    return (
      <View className="flex-1 bg-background">
        <View className="bg-primary px-5 pb-4 pt-safe">
          <View className="mb-4 flex-row items-center justify-between pt-3">
            <TouchableOpacity
              onPress={() => {
                void closeMapPicker();
              }}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">
              Choisir {activeMapField === "depart" ? "Depart" : "Arrivee"}
            </Text>
            <TouchableOpacity className="opacity-0" disabled>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Input
            value={quartierSearch}
            onChangeText={setQuartierSearch}
            placeholder="Rechercher par quartier"
            className="bg-white"
          />
        </View>

        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={defaultRegion}
            onPress={(event) => {
              void onMapPress(event);
            }}
            showsUserLocation
            onUserLocationChange={(event) => {
              const nextLoc = event.nativeEvent.coordinate;
              if (!nextLoc) return;
              setCurrentLocation({
                latitude: nextLoc.latitude,
                longitude: nextLoc.longitude,
              });
            }}
          >
            {previewDeparture ? (
              <Marker
                coordinate={{
                  latitude: previewDeparture.latitude,
                  longitude: previewDeparture.longitude,
                }}
                title="Depart"
                description={previewDeparture.address}
                pinColor="#2563eb"
              />
            ) : null}
            {previewArrival ? (
              <Marker
                coordinate={{
                  latitude: previewArrival.latitude,
                  longitude: previewArrival.longitude,
                }}
                title="Arrivee"
                description={previewArrival.address}
                pinColor="#e11d48"
              />
            ) : null}
            {routeCoordinates.length > 1 ? (
              <Polyline coordinates={routeCoordinates} strokeColor="#0ea5e9" strokeWidth={5} />
            ) : null}
          </MapView>

          <TouchableOpacity
            className="absolute right-5 top-5 size-11 items-center justify-center rounded-full bg-white shadow-md shadow-black/10"
            onPress={() => {
              if (!currentLocation) return;
              mapRef.current?.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              });
            }}
          >
            <Ionicons name="locate-outline" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View className="absolute bottom-5 left-5 right-5 rounded-2xl border border-gray bg-white p-4 shadow-lg shadow-black/10">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {filteredQuartiers.map((quartier) => (
                  <TouchableOpacity
                    key={quartier.id}
                    className="rounded-full bg-primary/10 px-3 py-1.5"
                    onPress={() => {
                      void setPointFromQuartier(quartier);
                    }}
                  >
                    <Text className="text-xs font-semibold text-primary">{quartier.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View className="mt-3 rounded-xl border border-gray p-3">
              <Text className="text-xs text-muted-foreground">Point selectionne</Text>
              <Text className="mt-1 text-sm font-semibold">
                {pendingPoint?.address ?? "Aucun point selectionne"}
              </Text>
            </View>
            <View className="mt-3 flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => {
                  void applyCurrentLocation();
                }}
              >
                <Text>Ma position</Text>
              </Button>
              <Button
                className="flex-1 rounded-xl"
                disabled={!pendingPoint}
                onPress={() => {
                  void confirmSelectedPoint();
                }}
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
      <View className="bg-primary px-5 pb-5 pt-safe">
        <View className="mb-4 flex-row items-center justify-between pt-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Nouveau trajet</Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2">
          {[
            { id: 1, label: "Itineraire", icon: "map-outline" },
            { id: 2, label: "Date/Heure", icon: "calendar-outline" },
            { id: 3, label: "Places", icon: "people-outline" },
          ].map((item) => {
            const active = step === item.id;
            const allowed =
              item.id === 1 || (item.id === 2 && canGoStep2) || (item.id === 3 && canGoStep3);
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
                    "ml-1 text-[11px] font-semibold",
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
        {step === 1 ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Itineraire</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <TouchableOpacity
                  className="rounded-xl border border-gray p-3"
                  onPress={() => openMapPicker("depart")}
                >
                  <Text className="text-xs text-muted-foreground">Depart</Text>
                  <Text className="mt-1 text-sm font-semibold">
                    {departure?.address ?? "Choisir le depart sur la map"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl border border-gray p-3"
                  onPress={() => openMapPicker("arrivee")}
                >
                  <Text className="text-xs text-muted-foreground">Arrivee</Text>
                  <Text className="mt-1 text-sm font-semibold">
                    {arrival?.address ?? "Choisir l arrivee sur la map"}
                  </Text>
                </TouchableOpacity>

                <View className="mt-2 flex-row items-center justify-between rounded-xl bg-primary/10 p-3">
                  <Text className="text-sm font-semibold">Distance: {distanceKm} km</Text>
                  <Text className="text-sm font-semibold">Duree: {durationMin} min</Text>
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
        ) : null}

        {step === 2 ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Date et heure</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <Button
                  variant="outline"
                  className="justify-between rounded-xl"
                  onPress={openDatePicker}
                >
                  <Text>{tripDateValue ? formatDate(tripDateValue) : "Choisir la date"}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#64748b" />
                </Button>

                <Button
                  variant="outline"
                  className="justify-between rounded-xl"
                  onPress={openTimePicker}
                >
                  <Text>{tripTimeValue ? formatTime(tripTimeValue) : "Choisir l heure"}</Text>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                </Button>

                <View className="mt-2 flex-row gap-2">
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
        ) : null}

        {step === 3 ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card>
              <CardHeader>
                <CardTitle>Choix du nombre de places</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <Input
                  value={seats}
                  onChangeText={setSeats}
                  keyboardType="number-pad"
                  placeholder="Nombre de places (1-6)"
                />
                <View className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <Text className="text-xs text-emerald-700">Prix estime</Text>
                  <Text className="text-lg font-bold text-emerald-700">
                    {estimatePrice(Number(distanceKm)).toLocaleString("fr-FR")} FCFA
                  </Text>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onPress={() => setStep(2)}
                  >
                    <Text>Retour</Text>
                  </Button>
                  <Button className="flex-1 rounded-xl" disabled={!canSubmit} onPress={openRecapModal}>
                    <Text>Voir recap</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          </Animated.View>
        ) : null}

        <Button variant="ghost" className="mt-4 rounded-xl" onPress={resetForm}>
          <Text>Reinitialiser le formulaire</Text>
        </Button>
      </ScrollView>

      <Modal transparent visible={pickerMode !== null} animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-4">
            <Text className="mb-2 text-center text-base font-semibold">
              {pickerMode === "date" ? "Choisir la date" : "Choisir l heure"}
            </Text>
            <DateTimePicker
              mode={pickerMode ?? "date"}
              value={pickerTempValue}
              onChange={onPickerChange}
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
            />
            <View className="mt-3 flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => setPickerMode(null)}
              >
                <Text>Annuler</Text>
              </Button>
              <Button className="flex-1 rounded-xl" onPress={confirmPickerSelection}>
                <Text>Valider</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchRoute;
