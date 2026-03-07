import { fetchRouteGeometry } from "@/src/utils/routeGeometry";
import React, { useEffect, useState } from "react";
import { Polyline } from "react-native-maps";

type RoutePolylineProps = {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  strokeColor?: string;
  strokeWidth?: number;
};

/**
 * Polyline qui suit la route réelle (OSRM) au lieu d'une ligne droite.
 */
export const RoutePolyline = ({
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  strokeColor = "#0ea5e9",
  strokeWidth = 5,
}: RoutePolylineProps) => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRouteGeometry(pickupLat, pickupLng, dropLat, dropLng).then((geometry) => {
      if (!cancelled) setCoords(geometry);
    });
    return () => { cancelled = true; };
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  if (!coords || coords.length < 2) return null;

  return <Polyline coordinates={coords} strokeColor={strokeColor} strokeWidth={strokeWidth} />;
};
