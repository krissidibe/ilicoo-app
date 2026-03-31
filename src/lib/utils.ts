import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Arrondit au multiple de 10 FCFA supérieur (ex: 976 → 980)
 */
export function roundUpToNearest10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

/**
 * Calcul du prix par km (même formule que le backend pricing.ts)
 */
function getPricePerKm(distanceKm: number, passengers: number): number {
  if (distanceKm <= 0) return 0;
  const i = Math.floor(distanceKm / 10);
  const base = Math.max(100 - 10 * i, 10);
  if (passengers <= 1) return base;
  if (passengers === 2) return base * (1.15 + 0.1 * i);
  if (passengers === 3) return base * (1.25 + 0.15 * i);
  return base * (1.3 + 0.2 * i);
}

/**
 * Calcule le prix total du trajet (arrondi au multiple de 10 supérieur)
 */
export function calculateTripPrice(
  distanceKm: number,
  passengers: number,
): number {
  const pricePerKm = getPricePerKm(distanceKm, passengers);
  const rawTripPrice = pricePerKm * distanceKm;
  return roundUpToNearest10(rawTripPrice);
}

/** Prix moto = (prix voiture × 2) / 3 — aligné sur le backend `motorcyclePriceFromCarTripPrice` */
export function motorcycleTripPriceFromCarTripPrice(carTripPrice: number): number {
  return roundUpToNearest10((carTripPrice * 2) / 3);
}

export function tripPriceForVehicle(
  distanceKm: number,
  passengers: number,
  vehicleType: "CAR" | "MOTORCYCLE",
): number {
  const carTrip = calculateTripPrice(distanceKm, passengers);
  if (vehicleType === "MOTORCYCLE") {
    return motorcycleTripPriceFromCarTripPrice(carTrip);
  }
  return carTrip;
}

export function formatTripPriceForVehicle(
  distanceKm: number,
  passengers: number,
  vehicleType: "CAR" | "MOTORCYCLE",
  showCurrency = true,
): string {
  return formatPriceDisplay(
    tripPriceForVehicle(distanceKm, passengers, vehicleType),
    showCurrency,
  );
}

/**
 * Calcule et formate le prix selon la distance et le nombre de places
 * Utilise la même formule que le backend (pricing.ts)
 */
export function formatPrice(
  distanceKm: number,
  passengers: number,
  showCurrency = true,
): string {
  const price = calculateTripPrice(distanceKm, passengers);
  const formatted = price.toLocaleString("fr-FR");
  return showCurrency ? `${formatted} FCFA` : formatted;
}

/**
 * Formate un prix déjà calculé (ex: depuis l'API)
 */
export function formatPriceDisplay(price: number, showCurrency = true): string {
  const rounded = roundUpToNearest10(price);
  const formatted = rounded.toLocaleString("fr-FR");
  return showCurrency ? `${formatted} FCFA` : formatted;
}
