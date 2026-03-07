import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";
import type { RoutePassengerApi } from "@/src/types/api";
import { queryKeys } from "./queryKeys";

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getRoutePassengers = () => {
  return queryOptions({
    queryKey: queryKeys.routePassengers.all,
    queryFn: () =>
      extractData<RoutePassengerApi[]>(
        apiFetch("route-passengers") as Promise<{
          success: boolean;
          data?: RoutePassengerApi[];
        }>
      ),
  });
};

export type RequestRouteParams = {
  routeID: string;
  seats?: number;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  pickupAddress?: string;
  dropAddress?: string;
  departureAt?: string;
};

export const requestRoute = async (
  routeID: string,
  seats = 1,
  params?: Omit<RequestRouteParams, "routeID" | "seats">
) => {
  const body: Record<string, unknown> = { routeID, seats };
  if (params?.pickupLat != null) body.pickupLat = params.pickupLat;
  if (params?.pickupLng != null) body.pickupLng = params.pickupLng;
  if (params?.dropLat != null) body.dropLat = params.dropLat;
  if (params?.dropLng != null) body.dropLng = params.dropLng;
  if (params?.pickupAddress) body.pickupAddress = params.pickupAddress;
  if (params?.dropAddress) body.dropAddress = params.dropAddress;
  if (params?.departureAt) body.departureAt = params.departureAt;
  const res = await apiFetch("route-passengers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = res as { success: boolean; data?: RoutePassengerApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const updateRoutePassengerStatus = async (
  id: string,
  status: "ACCEPTED" | "REJECTED"
) => {
  const res = await apiFetch(`route-passengers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const json = res as { success: boolean; data?: RoutePassengerApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const cancelMyTrip = async (id: string) => {
  const res = await apiFetch(`route-passengers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELLED" }),
  });
  const json = res as { success: boolean; data?: RoutePassengerApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};
