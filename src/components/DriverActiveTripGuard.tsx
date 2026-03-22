import { getMyRoutes } from "@/src/services/route.service";
import type { RouteApi } from "@/src/types/api";
import { useQuery } from "@tanstack/react-query";
import { router, usePathname, useSegments } from "expo-router";
import React, { useEffect, useMemo } from "react";

/**
 * Tant qu'un trajet chauffeur est en cours (ACCEPTED), seul l'écran active-trip est accessible.
 * Toute autre navigation est remplacée par la carte du trajet en cours.
 */
export const DriverActiveTripGuard = ({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) => {
  const pathname = usePathname();
  const segments = useSegments();

  const { data: routesData } = useQuery({
    ...getMyRoutes(),
    enabled: isAuthenticated,
    refetchInterval: 4000,
    staleTime: 0,
  });

  const activeDriverRoute = useMemo(() => {
    return (routesData ?? []).find((r: RouteApi) => r.status === "ACCEPTED");
  }, [routesData]);

  useEffect(() => {
    if (!isAuthenticated || !activeDriverRoute) {
      return;
    }

    const onActiveTripScreen =
      segments.includes("active-trip") ||
      (pathname ?? "").includes("active-trip");

    if (onActiveTripScreen) {
      return;
    }

    router.replace({
      pathname: "/(stack)/active-trip",
      params: { routeId: activeDriverRoute.id },
    } as any);
  }, [isAuthenticated, activeDriverRoute, pathname, segments]);

  return null;
};
