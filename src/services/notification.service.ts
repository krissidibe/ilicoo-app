import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

export type NotificationApi = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  routeId: string | null;
  createdAt: string;
  route?: {
    id: string;
    pickupAddress: string;
    dropAddress: string;
    price: number;
    departureAt: string | null;
  };
};

export type NotificationsResponse = {
  notifications: NotificationApi[];
  unreadCount: number;
};

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getNotifications = () => {
  return queryOptions({
    queryKey: ["notifications"],
    queryFn: () =>
      extractData<NotificationsResponse>(
        apiFetch("notifications") as Promise<{
          success: boolean;
          data?: NotificationsResponse;
        }>
      ),
  });
};

export const markNotificationRead = async (id: string) => {
  const res = await apiFetch("notifications", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
  const json = res as { success: boolean; data?: { updated: boolean } };
  if (!json.success) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const markAllNotificationsRead = async () => {
  const res = await apiFetch("notifications", {
    method: "PATCH",
    body: JSON.stringify({ markAllRead: true }),
  });
  const json = res as { success: boolean; data?: { updated: boolean } };
  if (!json.success) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};
