import { fetchRouteGeometry } from "@/src/utils/routeGeometry";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type RouteMapViewProps = {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupTitle?: string;
  dropTitle?: string;
  strokeColor?: string;
  strokeWidth?: number;
  style?: object;
  /** Optionnel: deuxième itinéraire (ex: trajet passager) */
  secondaryRoute?: {
    pickupLat: number;
    pickupLng: number;
    dropLat: number;
    dropLng: number;
    pickupTitle?: string;
    dropTitle?: string;
    strokeColor?: string;
  };
};

export const RouteMapView = ({
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  pickupTitle = "Départ",
  dropTitle = "Arrivée",
  strokeColor = "#0ea5e9",
  strokeWidth = 5,
  style,
  secondaryRoute,
}: RouteMapViewProps) => {
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [secondaryCoords, setSecondaryCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);

  const region = useMemo(() => {
    const lats = [pickupLat, dropLat];
    const lngs = [pickupLng, dropLng];
    if (secondaryRoute) {
      lats.push(secondaryRoute.pickupLat, secondaryRoute.dropLat);
      lngs.push(secondaryRoute.pickupLng, secondaryRoute.dropLng);
    }
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(0.05, (Math.max(...lats) - Math.min(...lats)) * 1.5),
      longitudeDelta: Math.max(0.05, (Math.max(...lngs) - Math.min(...lngs)) * 1.5),
    };
  }, [pickupLat, pickupLng, dropLat, dropLng, secondaryRoute]);

  useEffect(() => {
    let cancelled = false;
    fetchRouteGeometry(pickupLat, pickupLng, dropLat, dropLng).then((c) => {
      if (!cancelled) setRouteCoords(c);
    });
    return () => { cancelled = true; };
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  useEffect(() => {
    if (!secondaryRoute) {
      setSecondaryCoords(null);
      return;
    }
    let cancelled = false;
    fetchRouteGeometry(
      secondaryRoute.pickupLat,
      secondaryRoute.pickupLng,
      secondaryRoute.dropLat,
      secondaryRoute.dropLng
    ).then((c) => {
      if (!cancelled) setSecondaryCoords(c);
    });
    return () => { cancelled = true; };
  }, [secondaryRoute]);

  return (
    <View style={[{ flex: 1, minHeight: 350 }, style]}>
      <MapView style={{ flex: 1, width: "100%" }} initialRegion={region} scrollEnabled zoomEnabled>
        <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }} title={pickupTitle} pinColor="#2563eb" />
        <Marker coordinate={{ latitude: dropLat, longitude: dropLng }} title={dropTitle} pinColor="#e11d48" />
        {routeCoords && routeCoords.length >= 2 && (
          <Polyline coordinates={routeCoords} strokeColor={strokeColor} strokeWidth={strokeWidth} />
        )}
        {secondaryRoute && secondaryCoords && secondaryCoords.length >= 2 && (
          <>
            <Marker
              coordinate={{ latitude: secondaryRoute.pickupLat, longitude: secondaryRoute.pickupLng }}
              title={secondaryRoute.pickupTitle ?? "Mon départ"}
              pinColor="#7c3aed"
            />
            <Marker
              coordinate={{ latitude: secondaryRoute.dropLat, longitude: secondaryRoute.dropLng }}
              title={secondaryRoute.dropTitle ?? "Mon arrivée"}
              pinColor="#be185d"
            />
            <Polyline
              coordinates={secondaryCoords}
              strokeColor={secondaryRoute.strokeColor ?? "#7c3aed"}
              strokeWidth={strokeWidth}
            />
          </>
        )}
      </MapView>
    </View>
  );
};
