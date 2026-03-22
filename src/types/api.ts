/**
 * Types alignés avec l'API backend (Prisma schema)
 */

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type UserApi = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phoneNumber: string;
  phoneDialCode: string;
  country: string;
  gender: string;
  permitNumber?: string | null;
  permitPhoto?: string | null;
  permitPhotoBack?: string | null;
  identityPhoto?: string | null;
  ratingsReceived?: { stars: number }[];
};

export type VehicleTypeApi = "CAR" | "MOTORCYCLE";

export type VehicleApi = {
  id: string;
  userId: string;
  type: VehicleTypeApi;
  maximumPassenger: number;
  name: string;
  year: string | null;
  plateNumber: string | null;
  color: string | null;
  permitNumber: string | null;
  permitPhoto: string | null;
  permitPhotoBack: string | null;
  identityPhoto: string | null;
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
};
