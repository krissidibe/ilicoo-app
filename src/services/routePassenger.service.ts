import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

// ─── Queries ─────────────────────────────────────────────────────────
export const getRoutePassengers = () => {
  return queryOptions({
    queryKey: ["route-passengers"],
    queryFn: () => apiFetch("route-passengers"),
  });
};
