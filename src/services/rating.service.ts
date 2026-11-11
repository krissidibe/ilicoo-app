import { apiFetch } from "./apiFetch";
import { queryOptions } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";

type RatingApi = {
  id: string;
  fromUserId: string;
  toUserId: string;
  routeId: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
  fromUser?: {
    id: string;
    name: string;
    image: string | null;
    isVerified?: boolean;
  };
};

type RatingResponse = {
  ratings: RatingApi[];
  /** Profil de l’utilisateur dont on consulte les avis */
  profileUser?: {
    id: string;
    name: string;
    image: string | null;
    isVerified: boolean;
  } | null;
  averageRating: number;
  totalRatings: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getUserRatings = (userId: string) => {
  return queryOptions({
    queryKey: ["ratings", userId],
    queryFn: () =>
      extractData<RatingResponse>(
        apiFetch(`ratings?userId=${userId}`) as Promise<{
          success: boolean;
          data?: RatingResponse;
        }>,
      ),
    enabled: !!userId,
  });
};

export const getUserRatingsPage = async (
  userId: string,
  page = 1,
  limit = 10,
) => {
  return extractData<RatingResponse>(
    apiFetch(`ratings?userId=${userId}&page=${page}&limit=${limit}`) as Promise<{
      success: boolean;
      data?: RatingResponse;
    }>,
  );
};

export type CreateRatingParams = {
  routeId: string;
  toUserId: string;
  stars: number;
  comment?: string;
};

export const createRating = async (params: CreateRatingParams) => {
  const res = await apiFetch("ratings", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = res as { success: boolean; data?: RatingApi };
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  await markTripAsRated(params.routeId);
  return json.data;
};

const RATED_TRIPS_KEY = "ilicoo_rated_trips";

export const getRatedTripIds = async (): Promise<string[]> => {
  try {
    const stored = await SecureStore.getItemAsync(RATED_TRIPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const markTripAsRated = async (routeId: string): Promise<void> => {
  const ids = await getRatedTripIds();
  if (!ids.includes(routeId)) {
    ids.push(routeId);
    await SecureStore.setItemAsync(RATED_TRIPS_KEY, JSON.stringify(ids));
  }
};

/** Conducteur : passagers déjà confirmés / traités à la fin d'un trajet (clé `routeId:passengerUserId`). */
const DRIVER_HANDLED_PASSENGERS_KEY = "ilicoo_driver_handled_passengers";

export const driverPassengerKey = (routeId: string, passengerUserId: string) =>
  `${routeId}:${passengerUserId}`;

export const getDriverHandledPassengerKeys = async (): Promise<string[]> => {
  try {
    const stored = await SecureStore.getItemAsync(DRIVER_HANDLED_PASSENGERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const markDriverPassengerHandled = async (
  routeId: string,
  passengerUserId: string,
): Promise<void> => {
  const keys = await getDriverHandledPassengerKeys();
  const key = driverPassengerKey(routeId, passengerUserId);
  if (!keys.includes(key)) {
    keys.push(key);
    // Garde la liste bornée (SecureStore limite la taille des valeurs).
    const trimmed = keys.slice(-200);
    await SecureStore.setItemAsync(
      DRIVER_HANDLED_PASSENGERS_KEY,
      JSON.stringify(trimmed),
    );
  }
};
