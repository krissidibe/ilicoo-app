/**
 * Récupère la géométrie réelle de la route (suivant les routes) via OSRM.
 * Retourne les coordonnées du tracé routier, pas une ligne droite.
 */

export type LatLng = { latitude: number; longitude: number };

export const fetchRouteGeometry = async (
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number
): Promise<LatLng[]> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      return [
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: dropLat, longitude: dropLng },
      ];
    }
    return route.geometry.coordinates.map((p: number[]) => ({
      latitude: p[1],
      longitude: p[0],
    }));
  } catch {
    return [
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropLat, longitude: dropLng },
    ];
  }
};
