import { apiFetch } from "./apiFetch";
import { queryOptions } from "@tanstack/react-query";

type RatingApi = {
  id: string;
  fromUserId: string;
  toUserId: string;
  routeId: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
  fromUser?: { id: string; name: string; image: string | null };
};

type RatingResponse = {
  ratings: RatingApi[];
  averageRating: number;
  totalRatings: number;
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
  return json.data;
};
