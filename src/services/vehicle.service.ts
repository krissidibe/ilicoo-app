import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";
import type { VehicleApi } from "@/src/types/api";
import { queryKeys } from "./queryKeys";

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getVehicules = () => {
  return queryOptions({
    queryKey: queryKeys.vehicules.all,
    queryFn: () =>
      extractData<VehicleApi[]>(
        apiFetch("vehicules") as Promise<{ success: boolean; data?: VehicleApi[] }>
      ),
  });
};

export type CreateVehicleParams = {
  type: "voiture" | "moto";
  vehicleName: string;
  year?: string;
  plateNumber?: string;
  color?: string;
  /** URL après upload (optionnel) */
  photo?: string;
  permitNumber?: string;
  permitPhoto?: string;
  permitPhotoBack?: string;
  identityPhoto?: string;
  maximumPassenger: number;
  default?: boolean;
};

export const createVehicle = async (params: CreateVehicleParams) => {
  const res = await apiFetch("vehicules", {
    method: "POST",
    body: JSON.stringify({
      type: params.type === "moto" ? "MOTORCYCLE" : "CAR",
      vehicleName: params.vehicleName,
      year: params.year ?? null,
      plateNumber: params.plateNumber ?? null,
      color: params.color ?? null,
      photo: params.photo ?? null,
      permitNumber: params.permitNumber ?? null,
      permitPhoto: params.permitPhoto ?? null,
      permitPhotoBack: params.permitPhotoBack ?? null,
      identityPhoto: params.identityPhoto ?? null,
      maximumPassenger: params.maximumPassenger,
      default: params.default ?? false,
    }),
  });
  const json = res as { success: boolean; data?: VehicleApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const setDefaultVehicle = async (vehicleId: string) => {
  const res = await apiFetch(`vehicules/${vehicleId}`, {
    method: "PATCH",
    body: JSON.stringify({ default: true }),
  });
  const json = res as { success: boolean; data?: VehicleApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};
