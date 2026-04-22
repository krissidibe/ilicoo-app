/**
 * Types alignés avec l'API backend (Prisma schema)
 */

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type VehicleTypeApi = "CAR" | "MOTORCYCLE";

export type UserApi = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phoneNumber: string;
  phoneDialCode: string;
  country: string;
  gender: string;
  /** Compte vérifié (admin) */
  isVerified?: boolean;
  permitNumber?: string | null;
  permitPhoto?: string | null;
  permitPhotoBack?: string | null;
  identityPhoto?: string | null;
  ratingsReceived?: { stars: number }[];
  vehicles?: { type: VehicleTypeApi; default: boolean }[];
};

export type VehicleApi = {
  id: string;
  userId: string;
  type: VehicleTypeApi;
  maximumPassenger: number;
  name: string;
  year: string | null;
  plateNumber: string | null;
  color: string | null;
  /** URL publique, optionnelle */
  photo: string | null;
  default: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RideStatusApi =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type RoutePassengerStatusApi =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type RouteApi = {
  id: string;
  userId: string;
  /** Véhicule utilisé pour ce trajet (publication) */
  vehicleId?: string | null;
  /** Copie du type au moment de la publication */
  vehicleType?: VehicleTypeApi | null;
  vehicle?: {
    id: string;
    type: VehicleTypeApi;
    name: string;
    photo?: string | null;
  } | null;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupAddress: string;
  dropAddress: string;
  price: number;
  distanceKm: number;
  durationMin: number;
  availableSeats: number;
  status: RideStatusApi;
  departureAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: UserApi & { vehicles?: VehicleApi[] };
  passengers?: RoutePassengerApi[];
  /** Distance (km) du départ du trajet au point de départ de recherche — renseigné en mode search */
  searchPickupDistanceKm?: number;
  /** Distance (km) de l’arrivée du trajet au point d’arrivée de recherche — renseigné en mode search */
  searchDropDistanceKm?: number;
};

export type RoutePassengerApi = {
  id: string;
  routeID: string;
  userId: string;
  seats: number;
  status: RoutePassengerStatusApi;
  price?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropLat?: number | null;
  dropLng?: number | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  departureAt?: string | null;
  createdAt: string;
  updatedAt: string;
  route?: RouteApi & { user?: UserApi };
  user?: UserApi;
  /** Renseigné côté API « mes trajets » (conducteur) */
  ratedByDriver?: boolean;
  reportedByDriver?: boolean;
};
