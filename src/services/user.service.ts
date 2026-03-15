import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";
import type { UserApi } from "@/src/types/api";

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getUser = () => {
  return queryOptions({
    queryKey: ["user"],
    queryFn: () =>
      extractData<UserApi>(apiFetch("users") as Promise<{ success: boolean; data?: UserApi }>),
  });
};

export type UpdateProfilePayload = {
  name?: string;
  phoneNumber?: string;
  phoneDialCode?: string;
  country?: string;
  gender?: "male" | "female";
  permitNumber?: string | null;
  permitPhoto?: string | null;
  permitPhotoBack?: string | null;
  identityPhoto?: string | null;
};

export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UserApi> => {
  return extractData<UserApi>(
    apiFetch("users", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }) as Promise<{ success: boolean; data?: UserApi }>
  );
};
