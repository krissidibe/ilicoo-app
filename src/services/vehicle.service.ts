import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

// ─── Queries ─────────────────────────────────────────────────────────
export const getVehicules = () => {
  return queryOptions({
    queryKey: ["vehicules"],
    queryFn: () => apiFetch("vehicules"),
  });
};
