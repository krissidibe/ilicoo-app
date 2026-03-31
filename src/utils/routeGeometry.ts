/**
 * Récupère la géométrie réelle de la route via Google Directions API.
 * Retourne les coordonnées du tracé routier, pas une ligne droite.
 */

import Constants from "expo-constants";

export type LatLng = { latitude: number; longitude: number };

const getGoogleApiKey = (): string =>
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ?? "";

export const fetchRouteGeometry = async (
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number,
  departureAt?: Date,
): Promise<LatLng[]> => {
  const apiKey = getGoogleApiKey();
  try {
    const trafficParams =
      departureAt && !Number.isNaN(departureAt.getTime())
        ? `&departure_time=${Math.floor(departureAt.getTime() / 1000)}&traffic_model=best_guess`
        : "";
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickupLat},${pickupLng}&destination=${dropLat},${dropLng}&key=${apiKey}&mode=driving${trafficParams}`;
    const res = await fetch(url);
    const data = await res.json();
    const leg = data?.routes?.[0]?.legs?.[0];
    if (!leg?.steps?.length) {
      return fallbackStraightLine(pickupLat, pickupLng, dropLat, dropLng);
    }
    const coords: LatLng[] = [];
    for (const step of leg.steps) {
      const decoded = decodePolyline(step.polyline.points);
      coords.push(...decoded);
    }
    return coords.length >= 2
      ? coords
      : fallbackStraightLine(pickupLat, pickupLng, dropLat, dropLng);
  } catch {
    return fallbackStraightLine(pickupLat, pickupLng, dropLat, dropLng);
  }
};

const fallbackStraightLine = (
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number,
): LatLng[] => [
  { latitude: pickupLat, longitude: pickupLng },
  { latitude: dropLat, longitude: dropLng },
];

/** Décode un polyline encodé Google en liste de coordonnées. */
export const decodePolyline = (encoded: string): LatLng[] => {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
};

/** Calcule la distance et durée via Google Directions API (durée trafic si `departureAt` fourni). */
export const calculateRouteWithGoogle = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  departureAt?: Date,
): Promise<{
  coords: LatLng[];
  distanceKm: string;
  durationMin: number;
}> => {
  const apiKey = getGoogleApiKey();
  try {
    const trafficParams =
      departureAt && !Number.isNaN(departureAt.getTime())
        ? `&departure_time=${Math.floor(departureAt.getTime() / 1000)}&traffic_model=best_guess`
        : "";
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${apiKey}&mode=driving${trafficParams}`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    const leg = route?.legs?.[0];
    if (!leg) {
      return {
        coords: fallbackStraightLine(fromLat, fromLng, toLat, toLng),
        distanceKm: "0",
        durationMin: 0,
      };
    }
    const coords: LatLng[] = [];
    for (const step of leg.steps ?? []) {
      coords.push(...decodePolyline(step.polyline.points));
    }
    const distanceM = leg.distance?.value ?? 0;
    const durationTraffic = leg.duration_in_traffic?.value as
      | number
      | undefined;
    const durationBase = leg.duration?.value ?? 0;
    const durationS =
      durationTraffic != null && durationTraffic > 0
        ? durationTraffic
        : durationBase;
    return {
      coords:
        coords.length >= 2
          ? coords
          : fallbackStraightLine(fromLat, fromLng, toLat, toLng),
      distanceKm: (distanceM / 1000).toFixed(2),
      durationMin: Math.round(durationS / 60),
    };
  } catch {
    return {
      coords: fallbackStraightLine(fromLat, fromLng, toLat, toLng),
      distanceKm: "0",
      durationMin: 0,
    };
  }
};
