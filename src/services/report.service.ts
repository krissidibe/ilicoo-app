import { apiFetch } from "./apiFetch";

export type CreateReportParams = {
  routeId: string;
  driverId: string;
  reason: string;
  description?: string;
};

export const createReport = async (params: CreateReportParams) => {
  const res = await apiFetch("reports", {
    method: "POST",
    body: JSON.stringify(params),
  });
  const json = res as { success: boolean; data?: unknown; error?: string };
  if (!json.success || json.data === undefined) {
    throw new Error(json.error ?? "Erreur API");
  }
  return json.data;
};

/** Route IDs already reported by the current user (no rating / no popup). */
export const getReportedRouteIds = async (): Promise<string[]> => {
  try {
    const res = (await apiFetch("reports")) as {
      success?: boolean;
      data?: { routeId: string }[];
    };
    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }
    return res.data.map((r) => String(r.routeId));
  } catch {
    return [];
  }
};
