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
import {
  cn,
  formatTripPriceForVehicle,
  tripPriceForVehicle,
} from "@/src/lib/utils";
import { searchRoutes } from "@/src/services/route.service";
import { requestRoute } from "@/src/services/routePassenger.service";
import type { RouteApi } from "@/src/types/api";
import {
  calculateRouteWithGoogle,
  fetchRouteGeometry,
} from "@/src/utils/routeGeometry";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerAndroid,
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

type VehicleFilterTab = "all" | "car" | "moto";

/** Critères de tri (plusieurs possibles — appliqués dans l’ordre choisi). */
type SortCriterion = "pickup" | "drop" | "time" | "price";

const DEFAULT_SORT_CRITERIA: SortCriterion[] = ["pickup"];

const SORT_OPTION_ROWS: {
  id: SortCriterion;
  labelFr: string;
  hintFr: string;
}[] = [
  {
    id: "pickup",
    labelFr: "Proximité au départ",
    hintFr: "D’abord les départs les plus proches de votre point de départ",
  },
  {
    id: "drop",
    labelFr: "Proximité à l’arrivée",
    hintFr: "D’abord les arrivées les plus proches de votre point d’arrivée",
  },
  {
    id: "time",
    labelFr: "Heure de départ",
    hintFr: "Du plus tôt au plus tard",
  },
  {
    id: "price",
    labelFr: "Prix",
    hintFr: "Du moins cher au plus cher (selon vos places)",
  },
];

type RoutePoint = {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
  /** Si le départ vient de la liste des quartiers — filtre API optionnel */
  quartierName?: string;
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

/** Référence stable — évite de faire changer `mapRegion` à chaque rendu (boucle animateToRegion). */
const EMPTY_ROUTES: RouteApi[] = [];

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

/** Distance affichée pour départ / arrivée : sous 1 km → mètres (ex. 730 m), sinon km. */
const formatProximityDistanceFromKm = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000).toLocaleString("fr-FR")} m`;
  }
  return `${km.toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} km`;
};

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
  const [vehicleFilterTab, setVehicleFilterTab] =
    React.useState<VehicleFilterTab>("all");
  const [sortCriteria, setSortCriteria] = React.useState<SortCriterion[]>(
    DEFAULT_SORT_CRITERIA,
  );
  const [sortModalVisible, setSortModalVisible] = React.useState(false);

  const searchAtIso = React.useMemo(() => {
    if (!tripDateValue || !tripTimeValue) return null;
    const combined = new Date(tripDateValue);
    combined.setHours(
      tripTimeValue.getHours(),
      tripTimeValue.getMinutes(),
      0,
      0,
    );
    return combined.toISOString();
  }, [tripDateValue, tripTimeValue]);

  /** Paramètres stables — éviter `new Date().toISOString()` dans la queryKey (cassait React Query). */
  const routesSearchParams = useMemo(() => {
    if (!departure || !arrival || !searchAtIso) return null;
    return {
      pickupLat: departure.latitude,
      pickupLng: departure.longitude,
      dropLat: arrival.latitude,
      dropLng: arrival.longitude,
      searchAt: searchAtIso,
      pickupQuartier: departure.quartierName,
    };
  }, [departure, arrival, searchAtIso]);

  const {
    data: routesData,
    error: routesSearchError,
    isError,
    isPending: isRoutesSearchPending,
  } = useQuery({
    ...searchRoutes({
      pickupLat: routesSearchParams?.pickupLat ?? 0,
      pickupLng: routesSearchParams?.pickupLng ?? 0,
      dropLat: routesSearchParams?.dropLat ?? 0,
      dropLng: routesSearchParams?.dropLng ?? 0,
      searchAt: routesSearchParams?.searchAt ?? "1970-01-01T00:00:00.000Z",
      pickupQuartier: routesSearchParams?.pickupQuartier,
    }),
    enabled: showMapResults && routesSearchParams != null,
    refetchInterval: 5000,
    retry: 2,
  });

  const routesList = routesData ?? EMPTY_ROUTES;

  const otherDriversRoutes: OtherDriverRoute[] = useMemo(
    () =>
      routesList
        .filter((r) => r.availableSeats > 0)
        .map((r, i) =>
          mapRouteToOtherDriverRoute(
            r as Parameters<typeof mapRouteToOtherDriverRoute>[0],
            i,
          ),
        ),
    [routesList],
  );

  const filteredDriversRoutes = useMemo(() => {
    if (vehicleFilterTab === "all") return otherDriversRoutes;
    if (vehicleFilterTab === "car") {
      return otherDriversRoutes.filter((d) => d.vehicleType === "CAR");
    }
    return otherDriversRoutes.filter((d) => d.vehicleType === "MOTORCYCLE");
  }, [otherDriversRoutes, vehicleFilterTab]);

  const routesById = useMemo(() => {
    const m = new Map<string, RouteApi>();
    for (const r of routesList) m.set(r.id, r);
    return m;
  }, [routesList]);

  const sortedFilteredDriversRoutes = useMemo(() => {
    if (sortCriteria.length === 0) return filteredDriversRoutes;
    const orderedKeys = (["pickup", "drop", "time", "price"] as const).filter(
      (c): c is SortCriterion => sortCriteria.includes(c),
    );
    const next = [...filteredDriversRoutes];
    next.sort((a, b) => {
      for (const c of orderedKeys) {
        let cmp = 0;
        if (c === "pickup") {
          const da = a.distanceFromSearchPickupKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceFromSearchPickupKm ?? Number.POSITIVE_INFINITY;
          cmp = da - db;
        } else if (c === "drop") {
          const da = a.distanceFromSearchDropKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceFromSearchDropKm ?? Number.POSITIVE_INFINITY;
          cmp = da - db;
        } else if (c === "time") {
          const ta = routesById.get(a.id)?.departureAt;
          const tb = routesById.get(b.id)?.departureAt;
          const va = ta ? new Date(ta).getTime() : Number.POSITIVE_INFINITY;
          const vb = tb ? new Date(tb).getTime() : Number.POSITIVE_INFINITY;
          cmp = va - vb;
        } else {
          const pa = tripPriceForVehicle(a.distanceKm, seats, a.vehicleType);
          const pb = tripPriceForVehicle(b.distanceKm, seats, b.vehicleType);
          cmp = pa - pb;
        }
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
    return next;
  }, [filteredDriversRoutes, routesById, seats, sortCriteria]);

  const toggleSortCriterion = React.useCallback((id: SortCriterion) => {
    setSortCriteria((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  React.useEffect(() => {
    if (
      selectedDriverId &&
      !filteredDriversRoutes.some((d) => d.id === selectedDriverId)
    ) {
      setSelectedDriverId(null);
    }
  }, [filteredDriversRoutes, selectedDriverId]);

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
      const departureHint =
        tripDateValue && tripTimeValue
          ? (() => {
              const c = new Date(tripDateValue);
              c.setHours(
                tripTimeValue.getHours(),
                tripTimeValue.getMinutes(),
                0,
                0,
              );
              return c;
            })()
          : undefined;
      const result = await calculateRouteWithGoogle(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude,
        departureHint,
      );
      console.log(result);
      setRouteCoordinates(result.coords);
      setDistanceKm(result.distanceKm);
      setDurationMin(result.durationMin);
    } catch {
      setRouteCoordinates([]);
      setDistanceKm("0");
      setDurationMin(0);
    }
  };

  const onCoordinatePress = async (coordinate: LatLng) => {
    if (!activeMapField) return;
    const { latitude, longitude } = coordinate;
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

  const onMapPress = async (e: MapPressEvent) => {
    await onCoordinatePress(e.nativeEvent.coordinate);
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
      quartierName: displayName,
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
    setVehicleFilterTab("all");
    setSortCriteria(DEFAULT_SORT_CRITERIA);
  };

  const applyPickerValue = React.useCallback(
    (value: Date, mode: "date" | "time"): boolean => {
      if (mode === "date") {
        setTripDateValue(value);
        return true;
      }

      const combined = new Date(tripDateValue ?? new Date());
      combined.setHours(value.getHours(), value.getMinutes(), 0, 0);
      if (combined < new Date()) {
        Alert.alert(
          "Heure invalide",
          "L'heure sélectionnée est déjà passée. Veuillez choisir une heure future.",
        );
        return false;
      }
      setTripTimeValue(value);
      return true;
    },
    [tripDateValue],
  );

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!pickerMode) return;

    if (event.type === "dismissed") {
      if (Platform.OS === "android") setPickerMode(null);
      return;
    }

    if (!selected) return;
    setPickerTempValue(selected);

    if (Platform.OS === "android" && event.type === "set") {
      const isApplied = applyPickerValue(selected, pickerMode);
      if (isApplied) setPickerMode(null);
    }
  };

  const openPicker = React.useCallback(
    (mode: "date" | "time") => {
      const value =
        mode === "date"
          ? (tripDateValue ?? new Date())
          : (tripTimeValue ?? new Date());
      setPickerTempValue(value);

      if (Platform.OS === "android") {
        DateTimePickerAndroid.open({
          value,
          mode,
          is24Hour: true,
          minimumDate: mode === "date" ? new Date() : undefined,
          onChange: (event, selected) => {
            if (event.type !== "set" || !selected) return;
            setPickerTempValue(selected);
            void applyPickerValue(selected, mode);
          },
        });
        return;
      }

      setPickerMode(mode);
    },
    [applyPickerValue, tripDateValue, tripTimeValue],
  );

  const previewDeparture =
    activeMapField === "depart" && pendingPoint ? pendingPoint : departure;
  const previewArrival =
    activeMapField === "arrivee" && pendingPoint ? pendingPoint : arrival;

  const selectedDriver = selectedDriverId
    ? (sortedFilteredDriversRoutes.find((d) => d.id === selectedDriverId) ??
      null)
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
      /* Inclure les conducteurs filtrés quand aucun n'est sélectionné */
      for (const d of sortedFilteredDriversRoutes) {
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
  }, [departure, arrival, selectedDriver, sortedFilteredDriversRoutes]);

  /** Toujours la dernière région calculée (pour éviter de dépendre de mapRegion dans les effets). */
  const mapRegionRef = React.useRef(mapRegion);
  mapRegionRef.current = mapRegion;

  /**
   * Ne recentrer la carte que quand on ouvre l’écran ou qu’on change de conducteur.
   * Si mapRegion est dans les deps, chaque refetch / recalcul réappelle animateToRegion
   * et empêche de déplacer la carte à la main.
   */
  React.useEffect(() => {
    if (!showMapResults || !mapRef.current) return;
    const id = requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(mapRegionRef.current, 450);
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDriverId, showMapResults]);

  const onMapReady = React.useCallback(() => {
    mapRef.current?.animateToRegion(mapRegionRef.current, 1);
  }, []);

  const screenH = Dimensions.get("window").height;

  React.useEffect(() => {
    if (!selectedDriver) {
      setDriverRouteCoords([]);
      return;
    }
    const raw = routesList.find((r) => r.id === selectedDriver.id);
    const depAt = raw?.departureAt ? new Date(raw.departureAt) : undefined;
    fetchRouteGeometry(
      selectedDriver.pickupLat,
      selectedDriver.pickupLng,
      selectedDriver.dropLat,
      selectedDriver.dropLng,
      depAt,
    )
      .then(setDriverRouteCoords)
      .catch(() => setDriverRouteCoords([]));
  }, [selectedDriver, routesList]);

  const routesSheetSnapPoints = useMemo(
    () => (selectedDriverId ? ["32%", "88%"] : ["42%", "88%"]),
    [selectedDriverId],
  );
  const routesSheetRef = React.useRef<BottomSheet>(null);

  React.useEffect(() => {
    if (routesSheetRef.current && selectedDriverId) {
      routesSheetRef.current.snapToIndex(1);
    }
  }, [selectedDriverId]);

  const handleReserve = async () => {
    if (!selectedDriverId || isReserving) return;
    const driver = filteredDriversRoutes.find((d) => d.id === selectedDriverId);
    const selectedRoute = routesList.find(
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
            <View className="flex-1 items-center px-2">
              <Text className="text-lg font-bold text-center text-white">
                Choisir un trajet
              </Text>
            </View>
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
          pointerEvents="box-none"
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
            scrollEnabled
            zoomEnabled
            rotateEnabled
            pitchEnabled
            toolbarEnabled={Platform.OS === "android"}
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

            {/* Conducteurs filtrés sur la carte */}
            {sortedFilteredDriversRoutes.map((r) => {
              const isSelected = r.id === selectedDriverId;
              return (
                <React.Fragment key={r.id}>
                  <Marker
                    coordinate={{
                      latitude: r.pickupLat,
                      longitude: r.pickupLng,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    title={`Départ — ${r.driverName}`}
                    description={r.from}
                    onPress={() => setSelectedDriverId(r.id)}
                  >
                    <View
                      className="items-center justify-center rounded-full border-2 border-white p-1.5"
                      style={{
                        backgroundColor: `${r.color}35`,
                        opacity: isSelected ? 1 : 0.85,
                        shadowColor: "#000",
                        shadowOpacity: 0.25,
                        shadowRadius: 3,
                        elevation: 3,
                      }}
                    >
                      {r.vehicleType === "MOTORCYCLE" ? (
                        <MaterialCommunityIcons
                          name="motorbike"
                          size={22}
                          color={r.color}
                        />
                      ) : (
                        <Ionicons name="car-sport" size={22} color={r.color} />
                      )}
                    </View>
                  </Marker>
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
            index={1}
            enablePanDownToClose={false}
            enableDynamicSizing={false}
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
              <View className="flex-row p-1 mb-3 rounded-2xl bg-slate-100">
                {(
                  [
                    {
                      id: "all" as VehicleFilterTab,
                      label: "Tous",
                      icon: "grid-outline" as const,
                      mci: false,
                    },
                    {
                      id: "car" as VehicleFilterTab,
                      label: "Voitures",
                      icon: "car-outline" as const,
                      mci: false,
                    },
                    {
                      id: "moto" as VehicleFilterTab,
                      label: "Moto",
                      icon: "motorbike" as const,
                      mci: true,
                    },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.85}
                    className={cn(
                      "flex-1 flex-row gap-1.5 py-2.5 rounded-xl items-center justify-center",
                      vehicleFilterTab === tab.id
                        ? "bg-white shadow-sm shadow-black/10"
                        : "",
                    )}
                    onPress={() => setVehicleFilterTab(tab.id)}
                  >
                    {tab.mci ? (
                      <MaterialCommunityIcons
                        name={tab.icon}
                        size={16}
                        color={
                          vehicleFilterTab === tab.id ? "#6366f1" : "#94a3b8"
                        }
                      />
                    ) : (
                      <Ionicons
                        name={tab.icon}
                        size={16}
                        color={
                          vehicleFilterTab === tab.id ? "#6366f1" : "#94a3b8"
                        }
                      />
                    )}
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        vehicleFilterTab === tab.id
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-2 justify-between items-start mb-4">
                <TouchableOpacity
                  className="flex-1"
                  onPress={() => routesSheetRef.current?.snapToIndex(1)}
                >
                  <Text className="text-base font-bold text-foreground">
                    Choisir un trajet
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Glissez le panneau pour réduire ou agrandir
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortModalVisible(true)}
                  className={cn(
                    "p-2.5 rounded-xl border",
                    sortCriteria.length > 0 &&
                      !(
                        sortCriteria.length === 1 &&
                        sortCriteria[0] === "pickup"
                      )
                      ? "border-primary bg-primary/10"
                      : "border-slate-200 bg-white",
                  )}
                  accessibilityRole="button"
                  accessibilityLabel="Trier les résultats"
                >
                  <Ionicons
                    name="filter-outline"
                    size={22}
                    color={
                      sortCriteria.length > 0 &&
                      !(
                        sortCriteria.length === 1 &&
                        sortCriteria[0] === "pickup"
                      )
                        ? "#6366f1"
                        : "#64748b"
                    }
                  />
                </TouchableOpacity>
              </View>
              {isError ? (
                <View className="px-1 py-6">
                  <Text className="text-sm text-center text-red-600">
                    {routesSearchError instanceof Error
                      ? routesSearchError.message
                      : "Impossible de charger les trajets."}
                  </Text>
                  <Text className="mt-3 text-xs text-center text-muted-foreground">
                    Vérifiez la connexion et l’URL de l’API. Sur appareil
                    physique, remplacez localhost par l’IP de votre machine.
                  </Text>
                </View>
              ) : isRoutesSearchPending ? (
                <Text className="py-8 text-center text-muted-foreground">
                  Chargement des trajets…
                </Text>
              ) : otherDriversRoutes.length === 0 ? (
                <Text className="py-8 text-center text-muted-foreground">
                  Aucun trajet disponible pour le moment
                </Text>
              ) : filteredDriversRoutes.length === 0 ? (
                <Text className="py-8 text-center text-muted-foreground">
                  {vehicleFilterTab === "moto"
                    ? "Aucun trajet en moto pour ces critères"
                    : vehicleFilterTab === "car"
                      ? "Aucun trajet en voiture pour ces critères"
                      : "Aucun trajet pour ce filtre"}
                </Text>
              ) : (
                <View className="flex-col gap-3">
                  {sortedFilteredDriversRoutes.map((driver) => (
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
                          {driver.vehicleType === "MOTORCYCLE" ? (
                            <MaterialCommunityIcons
                              name="motorbike"
                              size={18}
                              color={driver.color}
                            />
                          ) : (
                            <Ionicons
                              name="car-sport"
                              size={18}
                              color={driver.color}
                            />
                          )}
                        </View>

                        <Text
                          className={cn(
                            "ml-2 flex-1 font-semibold text-base",
                            selectedDriverId === driver.id
                              ? "text-primary"
                              : "text-foreground",
                          )}
                          numberOfLines={1}
                        >
                          {driver.driverName}
                        </Text>
                        <TouchableOpacity
                          className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/15"
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!driver.driverId) return;
                            router.push({
                              pathname: "/(stack)/user-reviews",
                              params: {
                                userId: driver.driverId,
                                name: driver.driverName,
                              },
                            } as any);
                          }}
                        >
                          <Text className="text-xs font-semibold text-amber-700">
                            {driver.driverRating}★
                          </Text>
                        </TouchableOpacity>
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
                      {driver.distanceFromSearchPickupKm != null ? (
                        <View className="flex-row gap-2 items-center mb-2">
                          <Ionicons
                            name="navigate-circle-outline"
                            size={14}
                            color="#6366f1"
                          />
                          <Text className="text-xs font-medium text-indigo-700">
                            À{" "}
                            {formatProximityDistanceFromKm(
                              driver.distanceFromSearchPickupKm,
                            )}{" "}
                            de votre départ
                          </Text>
                        </View>
                      ) : null}
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
                      {driver.distanceFromSearchDropKm != null ? (
                        <View className="flex-row gap-2 items-center mb-2">
                          <Ionicons name="flag" size={14} color="#be185d" />
                          <Text className="text-xs font-medium text-rose-800">
                            À{" "}
                            {formatProximityDistanceFromKm(
                              driver.distanceFromSearchDropKm,
                            )}{" "}
                            de votre arrivée
                          </Text>
                        </View>
                      ) : null}
                      <View className="flex-row gap-2 justify-between items-center mt-2 mb-2">
                        <View className="flex-row gap-1 items-center">
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="black"
                            className="opacity-50"
                          />
                          <Text className="text-sm text-muted-foreground">
                            {driver.departureAt}
                          </Text>
                        </View>
                        <View className="flex-row gap-1 items-center">
                          <Ionicons
                            name="cash-outline"
                            size={16}
                            color="#059669"
                          />
                          <Text className="text-sm font-bold text-emerald-600">
                            {formatTripPriceForVehicle(
                              driver.distanceKm,
                              seats,
                              driver.vehicleType,
                            )}
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

        <Modal
          transparent
          animationType="fade"
          visible={sortModalVisible}
          onRequestClose={() => setSortModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/45">
            <TouchableOpacity
              className="flex-1"
              activeOpacity={1}
              onPress={() => setSortModalVisible(false)}
            />
            <View className="px-4 pt-3 pb-safe bg-white rounded-t-3xl border-t border-slate-200 max-h-[78%]">
              <Text className="text-lg font-bold text-foreground">
                Trier les résultats
              </Text>
              <Text className="mt-1 mb-3 text-xs text-muted-foreground">
                Cochez un ou plusieurs critères
              </Text>
              <ScrollView
                className="max-h-80"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {SORT_OPTION_ROWS.map((row) => {
                  const active = sortCriteria.includes(row.id);
                  return (
                    <TouchableOpacity
                      key={row.id}
                      className={cn(
                        "flex-row gap-3 items-start py-3 border-b border-slate-100",
                      )}
                      onPress={() => toggleSortCriterion(row.id)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={active ? "checkbox" : "square-outline"}
                        size={24}
                        color={active ? "#6366f1" : "#94a3b8"}
                      />
                      <View className="flex-1">
                        <Text
                          className={cn(
                            "text-sm font-semibold",
                            active ? "text-primary" : "text-foreground",
                          )}
                        >
                          {row.labelFr}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground">
                          {row.hintFr}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View className="flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onPress={() => {
                    setSortCriteria(DEFAULT_SORT_CRITERIA);
                  }}
                >
                  <Text>Réinitialiser</Text>
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onPress={() => setSortModalVisible(false)}
                >
                  <Text>OK</Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>
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
            onPoiClick={(e: { nativeEvent: { coordinate: LatLng } }) =>
              void onCoordinatePress(e.nativeEvent.coordinate)
            }
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
                        Date et heure de départ
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
                {durationMin > 0 && (
                  <Text className="px-2 mt-1 text-xs text-muted-foreground">
                    Le temps ne prend pas en compte l’état réel de la
                    circulation
                  </Text>
                )}
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
                  onPress={() => openPicker("date")}
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
                  onPress={() => openPicker("time")}
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

      <Modal
        transparent
        visible={Platform.OS === "ios" && pickerMode !== null}
        animationType="fade"
      >
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
                  if (pickerMode) {
                    const isApplied = applyPickerValue(
                      pickerTempValue,
                      pickerMode,
                    );
                    if (isApplied) {
                      setPickerMode(null);
                    }
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
