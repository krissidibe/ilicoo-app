/**
 * Utilitaires horaires trajets (départ / arrivée Maps).
 */

export function getRouteArrivalAt(
  departureAt: string | null | undefined,
  durationMin: number,
): Date | null {
  if (!departureAt) {
    return null;
  }
  const departure = new Date(departureAt);
  if (Number.isNaN(departure.getTime())) {
    return null;
  }
  return new Date(departure.getTime() + durationMin * 60 * 1000);
}

export function formatTimeFr(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isDepartureDue(
  departureAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!departureAt) {
    return false;
  }
  const departure = new Date(departureAt);
  if (Number.isNaN(departure.getTime())) {
    return false;
  }
  return now.getTime() >= departure.getTime();
}

export function isArrivalDue(
  departureAt: string | null | undefined,
  durationMin: number,
  now = new Date(),
): boolean {
  const arrival = getRouteArrivalAt(departureAt, durationMin);
  if (!arrival) {
    return false;
  }
  return now.getTime() >= arrival.getTime();
}

const timestampOf = (
  item: { departureAt?: string | null; createdAt?: string | null },
): number => {
  if (item.departureAt) {
    const t = new Date(item.departureAt).getTime();
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return 0;
};

export function compareDepartureAsc(
  a: { departureAt?: string | null; createdAt?: string | null },
  b: { departureAt?: string | null; createdAt?: string | null },
): number {
  return timestampOf(a) - timestampOf(b);
}

export function compareDepartureDesc(
  a: { departureAt?: string | null; createdAt?: string | null },
  b: { departureAt?: string | null; createdAt?: string | null },
): number {
  return timestampOf(b) - timestampOf(a);
}

/** Plus récent au plus ancien (date de publication / création). */
export function compareCreatedAtDesc(
  a: { createdAt?: string | null },
  b: { createdAt?: string | null },
): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return tb - ta;
}

export function vehicleTypeLabel(type?: "CAR" | "MOTORCYCLE" | null): string {
  if (type === "MOTORCYCLE") {
    return "Moto";
  }
  if (type === "CAR") {
    return "Voiture";
  }
  return "Véhicule";
}

/** Nom + immatriculation + couleur, sans répéter le type (« Voiture • Voiture »). */
export function formatVehicleDetails(opts: {
  name?: string | null;
  type?: "CAR" | "MOTORCYCLE" | null;
  color?: string | null;
  plateNumber?: string | null;
}): string {
  const typeLabel = vehicleTypeLabel(opts.type);
  const name = opts.name?.trim();
  const parts: string[] = [name && name.length > 0 ? name : typeLabel];
  const plate = opts.plateNumber?.trim();
  if (plate && plate !== "—") {
    parts.push(plate);
  }
  const color = opts.color?.trim();
  if (color && color !== "—") {
    parts.push(color);
  }
  return parts.join(" • ");
}
