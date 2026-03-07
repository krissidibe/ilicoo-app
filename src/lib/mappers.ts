/**
 * Mappers pour convertir les données API en format UI
 */
import type { RoutePassengerApi, RouteApi, VehicleApi } from "@/src/types/api";
import type { RecentTrip, TripStatus } from "@/src/data/recentTrips";
import type { MyPublishedTrip, MyPublishedTripStatus, PassengerRequest, PassengerRequestStatus } from "@/src/data/myPublishedTrips";
import type { OtherDriverRoute } from "@/src/data/otherDriversRoutes";

const ROUTE_PASSENGER_STATUS_TO_UI: Record<string, TripStatus> = {
  COMPLETED: "Termine",
  CANCELLED: "Annule",
  REJECTED: "Annule",
  PENDING: "En attente",
  ACCEPTED: "En cours",
};

const RIDE_STATUS_TO_UI: Record<string, MyPublishedTripStatus> = {
  COMPLETED: "Termine",
  CANCELLED: "Annule",
  REJECTED: "Annule",
  REQUESTED: "En attente",
  ACCEPTED: "En cours",
};

const PASSENGER_STATUS_UI: Record<string, PassengerRequestStatus> = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "REJECTED",
  COMPLETED: "ACCEPTED",
};

const COLORS = ["#e11d48", "#059669", "#7c3aed", "#0d9488", "#ea580c", "#4f46e5", "#be185d"];

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return `Aujourd'hui, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return `Hier, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (days < 7) return d.toLocaleDateString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const mapRoutePassengerToRecentTrip = (rp: RoutePassengerApi, currentUserId?: string): RecentTrip => {
  const route = rp.route;
  const driver = route?.user;
  const status = ROUTE_PASSENGER_STATUS_TO_UI[rp.status] ?? "En attente";
  const hasMyPassengerData = rp.pickupAddress ?? rp.dropAddress ?? rp.departureAt;
  const myFrom = rp.pickupAddress ?? route?.pickupAddress ?? "—";
  const myTo = rp.dropAddress ?? route?.dropAddress ?? "—";
  const myDate = rp.departureAt
    ? new Date(rp.departureAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
    : formatDate(route?.departureAt ?? rp.createdAt);
  const myTime = rp.departureAt
    ? new Date(rp.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : (route?.departureAt ? new Date(route.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
  const myPrice = route
    ? `${(route.price * (rp.seats ?? 1)).toLocaleString("fr-FR")} FCFA`
    : "—";
  const PASSENGER_STATUS_UI: Record<string, import("@/src/data/recentTrips").PassengerStatusUi> = {
    PENDING: "En attente",
    ACCEPTED: "Confirmé",
    REJECTED: "Refusé",
    CANCELLED: "Annulé",
    COMPLETED: "Terminé",
  };
  const passengerStatus = PASSENGER_STATUS_UI[rp.status] ?? "En attente";
  const otherPassengerNames =
    route?.passengers
      ?.filter((p) => p.userId !== (currentUserId ?? rp.userId))
      ?.map((p) => p.user?.name ?? "Passager")
      ?? [];
  return {
    id: rp.routeID,
    routePassengerId: rp.id,
    from: route?.pickupAddress ?? "—",
    to: route?.dropAddress ?? "—",
    date: formatDate(route?.departureAt ?? rp.createdAt),
    price: route ? `${route.price.toLocaleString("fr-FR")} FCFA` : "—",
    status,
    driver:
      driver && (status === "Termine" || status === "En attente" || status === "En cours")
        ? {
            name: driver.name,
            phone: `${driver.phoneDialCode}${driver.phoneNumber}`,
            rating: 4.5,
          }
        : undefined,
    pickupLat: route?.pickupLat,
    pickupLng: route?.pickupLng,
    dropLat: route?.dropLat,
    dropLng: route?.dropLng,
    myPassengerInfo: {
      from: myFrom,
      to: myTo,
      date: myDate,
      time: myTime,
      price: myPrice,
      passengerStatus,
      pickupLat: rp.pickupLat ?? route?.pickupLat,
      pickupLng: rp.pickupLng ?? route?.pickupLng,
      dropLat: rp.dropLat ?? route?.dropLat,
      dropLng: rp.dropLng ?? route?.dropLng,
    },
    otherPassengerNames,
    canCancel: rp.status === "PENDING" || rp.status === "ACCEPTED",
  };
};

export const mapRouteToMyPublishedTrip = (r: RouteApi): MyPublishedTrip => {
  const status = RIDE_STATUS_TO_UI[r.status] ?? "En attente";
  const vehicleName = r.user?.vehicles?.[0]?.name ?? "Véhicule";
  const totalSeats = r.availableSeats + (r.passengers?.reduce((s, p) => s + p.seats, 0) ?? 0);
  const totalSeatsForPrice = r.availableSeats + (r.passengers?.reduce((s, p) => s + p.seats, 0) ?? 0) || 1;
  const passengers: PassengerRequest[] = (r.passengers ?? []).map((p) => {
    const passengerPrice = totalSeatsForPrice > 0
      ? Math.round((r.price * p.seats) / totalSeatsForPrice)
      : 0;
    const pPickupLat = p.pickupLat ?? r.pickupLat;
    const pPickupLng = p.pickupLng ?? r.pickupLng;
    const pDropLat = p.dropLat ?? r.dropLat;
    const pDropLng = p.dropLng ?? r.dropLng;
    const pPickupAddress = p.pickupAddress ?? r.pickupAddress;
    const pDropAddress = p.dropAddress ?? r.dropAddress;
    const pDepartureAt = p.departureAt ?? r.departureAt;
    return {
      id: p.id,
      name: p.user?.name ?? "Passager",
      image: p.user?.image ?? undefined,
      phone: p.user ? `${p.user.phoneDialCode}${p.user.phoneNumber}` : undefined,
      rating: 4.5,
      status: PASSENGER_STATUS_UI[p.status] ?? "PENDING",
      seats: p.seats,
      requestedAt: formatDate(p.createdAt),
      pickupLat: pPickupLat,
      pickupLng: pPickupLng,
      dropLat: pDropLat,
      dropLng: pDropLng,
      pickupAddress: pPickupAddress,
      dropAddress: pDropAddress,
      date: pDepartureAt
        ? new Date(pDepartureAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
        : (r.departureAt ? new Date(r.departureAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }) : "—"),
      time: pDepartureAt
        ? new Date(pDepartureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : (r.departureAt ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"),
      price: `${passengerPrice.toLocaleString("fr-FR")} FCFA`,
      routeCoordinates: [
        { latitude: pPickupLat, longitude: pPickupLng },
        { latitude: pDropLat, longitude: pDropLng },
      ],
    };
  });
  return {
    id: r.id,
    from: r.pickupAddress,
    to: r.dropAddress,
    date: r.departureAt
      ? new Date(r.departureAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
      : "—",
    time: r.departureAt
      ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—",
    price: `${r.price.toLocaleString("fr-FR")} FCFA`,
    status,
    availableSeats: r.availableSeats,
    totalSeats,
    vehicleName,
    passengers,
    pickupLat: r.pickupLat,
    pickupLng: r.pickupLng,
    dropLat: r.dropLat,
    dropLng: r.dropLng,
    routeCoordinates: [
      { latitude: r.pickupLat, longitude: r.pickupLng },
      { latitude: r.dropLat, longitude: r.dropLng },
    ],
  };
};

export const mapRouteToOtherDriverRoute = (r: RouteApi & { user?: { name: string; image?: string | null } }, index: number): OtherDriverRoute => ({
  id: r.id,
  driverName: r.user?.name ?? "Chauffeur",
  driverRating: 4.5,
  from: r.pickupAddress,
  to: r.dropAddress,
  pickupLat: r.pickupLat,
  pickupLng: r.pickupLng,
  dropLat: r.dropLat,
  dropLng: r.dropLng,
  price: `${r.price.toLocaleString("fr-FR")} FCFA`,
  availableSeats: r.availableSeats,
  departureAt: r.departureAt
    ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—",
  routeCoordinates: [
    { latitude: r.pickupLat, longitude: r.pickupLng },
    { latitude: r.dropLat, longitude: r.dropLng },
  ],
  color: COLORS[index % COLORS.length],
});

export const mapVehicleToUi = (v: VehicleApi) => ({
  id: v.id,
  name: v.name,
  default: v.default,
  color: v.color ?? "—",
  NM: v.plateNumber ?? "—",
  maximumPassenger: v.maximumPassenger,
  type: v.type,
});
