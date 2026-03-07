import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";
import type { RouteApi } from "@/src/types/api";

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getMyRoutes = () => {
  return queryOptions({
    queryKey: ["routes", "mine"],
    queryFn: () =>
      extractData<RouteApi[]>(
        apiFetch("routes") as Promise<{ success: boolean; data?: RouteApi[] }>
      ),
  });
};

export type SearchRoutesParams = {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
};

export const searchRoutes = (params: SearchRoutesParams) => {
  const q = new URLSearchParams({
    mode: "search",
    pickupLat: String(params.pickupLat),
    pickupLng: String(params.pickupLng),
    dropLat: String(params.dropLat),
    dropLng: String(params.dropLng),
  });
  return queryOptions({
    queryKey: ["routes", "search", params],
    queryFn: () =>
      extractData<(RouteApi & { user?: { id: string; name: string; image: string | null; phoneNumber: string; phoneDialCode: string } })[]>(
        apiFetch(`routes?${q}`) as Promise<{ success: boolean; data?: (RouteApi & { user?: { id: string; name: string; image: string | null; phoneNumber: string; phoneDialCode: string } })[] }>
      ),
  });
};

export const getAllRoutes = () => {
  return queryOptions({
    queryKey: ["routes", "all"],
    queryFn: () =>
      extractData<(RouteApi & { user?: { id: string; name: string; image: string | null; phoneNumber: string; phoneDialCode: string } })[]>(
        apiFetch("routes?mode=all") as Promise<{ success: boolean; data?: (RouteApi & { user?: { id: string; name: string; image: string | null; phoneNumber: string; phoneDialCode: string } })[] }>
      ),
  });
};

export type CreateRouteParams = {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupAddress: string;
  dropAddress: string;
  price: number;
  distanceKm: number;
  durationMin: number;
  availableSeats?: number;
  departureAt?: string;
};

export const createRoute = async (params: CreateRouteParams) => {
  const res = await apiFetch("routes", {
    method: "POST",
    body: JSON.stringify({
      pickupLat: params.pickupLat,
      pickupLng: params.pickupLng,
      dropLat: params.dropLat,
      dropLng: params.dropLng,
      pickupAddress: params.pickupAddress,
      dropAddress: params.dropAddress,
      price: params.price,
      distanceKm: params.distanceKm,
      durationMin: params.durationMin,
      availableSeats: params.availableSeats ?? 1,
      departureAt: params.departureAt ?? null,
    }),
  });
  const json = res as { success: boolean; data?: RouteApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const updateRouteStatus = async (
  routeId: string,
  status: "ACCEPTED" | "COMPLETED" | "CANCELLED"
) => {
  const res = await apiFetch(`routes/${routeId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const json = res as { success: boolean; data?: RouteApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getDriverStats = () => {
  return queryOptions({
    queryKey: ["routes", "stats"],
    queryFn: () =>
      extractData<{ totalGains: number; completedCount: number }>(
        apiFetch("routes/stats") as Promise<{
          success: boolean;
          data?: { totalGains: number; completedCount: number };
        }>
      ),
  });
};
