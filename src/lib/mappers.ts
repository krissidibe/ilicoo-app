/**
 * Mappers pour convertir les données API en format UI
 */
import type { RoutePassengerApi, RouteApi, VehicleApi } from "@/src/types/api";
import type { RecentTrip, TripStatus } from "@/src/data/recentTrips";
import type { MyPublishedTrip, MyPublishedTripStatus, PassengerRequest, PassengerRequestStatus } from "@/src/data/myPublishedTrips";
import type { OtherDriverRoute } from "@/src/data/otherDriversRoutes";
import { formatPrice, formatPriceDisplay, calculateTripPrice } from "@/src/lib/utils";

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

const computeAverageRating = (ratings?: { stars: number }[]): number => {
  if (!ratings || ratings.length === 0) return 0;
  const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

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

const formatDateShort = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  if (isSameDay(d, now)) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
};

export const mapRoutePassengerToRecentTrip = (rp: RoutePassengerApi, currentUserId?: string): RecentTrip => {
  const route = rp.route;
  const driver = route?.user;
  const status = ROUTE_PASSENGER_STATUS_TO_UI[rp.status] ?? "En attente";
  const hasMyPassengerData = rp.pickupAddress ?? rp.dropAddress ?? rp.departureAt;
  const myFrom = rp.pickupAddress ?? route?.pickupAddress ?? "—";
  const myTo = rp.dropAddress ?? route?.dropAddress ?? "—";
  const myDate = rp.departureAt
    ? formatDateShort(rp.departureAt)
    : formatDate(route?.departureAt ?? rp.createdAt);
  const myTime = rp.departureAt
    ? new Date(rp.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : (route?.departureAt ? new Date(route.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
  const seatsCount = rp.seats ?? 1;
  const myPrice = rp.price != null
    ? formatPriceDisplay(Number(rp.price))
    : route ? formatPrice(route.distanceKm, seatsCount) : "—";
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
    price: myPrice,
    status,
    distanceKm: route?.distanceKm,
    driver:
      driver &&
      (status === "Termine" ||
        status === "En attente" ||
        status === "En cours" ||
        rp.status === "COMPLETED")
        ? {
            id: driver.id,
            name: driver.name,
            phone: `${driver.phoneDialCode}${driver.phoneNumber}`,
            rating: computeAverageRating(driver.ratingsReceived),
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
      seats: rp.seats ?? 1,
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
  const totalPassengers = (r.passengers ?? []).reduce((s, p) => s + p.seats, 0) || 1;
  const passengers: PassengerRequest[] = (r.passengers ?? []).map((p) => {
    const passengerPrice = p.price != null
      ? Number(p.price)
      : (() => { const tp = calculateTripPrice(r.distanceKm, totalPassengers); return (tp / totalPassengers) * p.seats; })();
    const pPickupLat = p.pickupLat ?? r.pickupLat;
    const pPickupLng = p.pickupLng ?? r.pickupLng;
    const pDropLat = p.dropLat ?? r.dropLat;
    const pDropLng = p.dropLng ?? r.dropLng;
    const pPickupAddress = p.pickupAddress ?? r.pickupAddress;
    const pDropAddress = p.dropAddress ?? r.dropAddress;
    const pDepartureAt = p.departureAt ?? r.departureAt;
    return {
      id: p.id,
      userId: p.userId,
      name: p.user?.name ?? "Passager",
      image: p.user?.image ?? undefined,
      phone: p.user ? `${p.user.phoneDialCode}${p.user.phoneNumber}` : undefined,
      rating: computeAverageRating(p.user?.ratingsReceived),
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
        ? formatDateShort(pDepartureAt)
        : (r.departureAt ? formatDateShort(r.departureAt) : "—"),
      time: pDepartureAt
        ? new Date(pDepartureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : (r.departureAt ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"),
      price: formatPriceDisplay(passengerPrice),
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
    date: r.departureAt ? formatDateShort(r.departureAt) : "—",
    time: r.departureAt
      ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—",
    price: formatPrice(r.distanceKm, 1),
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

export const mapRouteToOtherDriverRoute = (r: RouteApi & { user?: { name: string; image?: string | null; ratingsReceived?: { stars: number }[] }; passengers?: { seats: number }[] }, index: number): OtherDriverRoute => {
  const reservedSeats = (r.passengers ?? []).reduce((sum, p) => sum + p.seats, 0);
  return {
  id: r.id,
  driverName: r.user?.name ?? "Chauffeur",
  driverRating: computeAverageRating(r.user?.ratingsReceived),
  from: r.pickupAddress,
  to: r.dropAddress,
  pickupLat: r.pickupLat,
  pickupLng: r.pickupLng,
  dropLat: r.dropLat,
  dropLng: r.dropLng,
  distanceKm: r.distanceKm,
  price: formatPrice(r.distanceKm, 1),
  pricePerSeat: r.price,
  availableSeats: r.availableSeats,
  reservedSeats,
  departureAt: r.departureAt
    ? new Date(r.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—",
  routeCoordinates: [
    { latitude: r.pickupLat, longitude: r.pickupLng },
    { latitude: r.dropLat, longitude: r.dropLng },
  ],
  color: COLORS[index % COLORS.length],
};};

export const mapVehicleToUi = (v: VehicleApi) => ({
  id: v.id,
  name: v.name,
  default: v.default,
  color: v.color ?? "—",
  NM: v.plateNumber ?? "—",
  maximumPassenger: v.maximumPassenger,
  type: v.type,
});
