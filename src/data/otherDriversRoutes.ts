/**
 * Fake data for other drivers' routes (search results)
 * Inspired by API: Route, User
 */

export type OtherDriverRoute = {
  id: string;
  driverName: string;
  driverRating: number;
  from: string;
  to: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  price: string;
  availableSeats: number;
  departureAt: string;
  routeCoordinates: { latitude: number; longitude: number }[];
  color: string; // for map polyline/marker
};

export const otherDriversRoutes: OtherDriverRoute[] = [
  {
    id: "d1",
    driverName: "Moussa Traore",
    driverRating: 4.8,
    from: "Hamdallaye",
    to: "Aéroport Modibo Keita",
    pickupLat: 12.6337,
    pickupLng: -8.0059,
    dropLat: 12.5334,
    dropLng: -7.9499,
    price: "42 000 FCFA",
    availableSeats: 2,
    departureAt: "14:30",
    color: "#e11d48",
    routeCoordinates: [
      { latitude: 12.6337, longitude: -8.0059 },
      { latitude: 12.62, longitude: -8.02 },
      { latitude: 12.58, longitude: -8.0 },
      { latitude: 12.5334, longitude: -7.9499 },
    ],
  },
  {
    id: "d2",
    driverName: "Fatoumata Keita",
    driverRating: 4.9,
    from: "ACI 2000",
    to: "Aéroport",
    pickupLat: 12.6201,
    pickupLng: -8.0264,
    dropLat: 12.5334,
    dropLng: -7.9499,
    price: "48 000 FCFA",
    availableSeats: 3,
    departureAt: "15:00",
    color: "#059669",
    routeCoordinates: [
      { latitude: 12.6201, longitude: -8.0264 },
      { latitude: 12.61, longitude: -8.01 },
      { latitude: 12.56, longitude: -7.98 },
      { latitude: 12.5334, longitude: -7.9499 },
    ],
  },
  {
    id: "d3",
    driverName: "Abdoul Karim",
    driverRating: 4.4,
    from: "Badalabougou",
    to: "Aéroport Modibo Keita",
    pickupLat: 12.6333,
    pickupLng: -7.9833,
    dropLat: 12.5334,
    dropLng: -7.9499,
    price: "40 000 FCFA",
    availableSeats: 1,
    departureAt: "14:45",
    color: "#7c3aed",
    routeCoordinates: [
      { latitude: 12.6333, longitude: -7.9833 },
      { latitude: 12.6, longitude: -7.97 },
      { latitude: 12.55, longitude: -7.96 },
      { latitude: 12.5334, longitude: -7.9499 },
    ],
  },
  {
    id: "d4",
    driverName: "Ibrahima Coulibaly",
    driverRating: 4.6,
    from: "Sogoniko",
    to: "Aéroport Modibo Keita",
    pickupLat: 12.5987,
    pickupLng: -8.0099,
    dropLat: 12.5334,
    dropLng: -7.9499,
    price: "35 000 FCFA",
    availableSeats: 2,
    departureAt: "16:00",
    color: "#0d9488",
    routeCoordinates: [
      { latitude: 12.5987, longitude: -8.0099 },
      { latitude: 12.58, longitude: -8.0 },
      { latitude: 12.55, longitude: -7.97 },
      { latitude: 12.5334, longitude: -7.9499 },
    ],
  },
  {
    id: "d5",
    driverName: "Aminata Diallo",
    driverRating: 4.7,
    from: "Lafiabougou",
    to: "Kalaban Coura",
    pickupLat: 12.6743,
    pickupLng: -8.0098,
    dropLat: 12.5658,
    dropLng: -7.9896,
    price: "32 000 FCFA",
    availableSeats: 3,
    departureAt: "17:30",
    color: "#ea580c",
    routeCoordinates: [
      { latitude: 12.6743, longitude: -8.0098 },
      { latitude: 12.65, longitude: -8.0 },
      { latitude: 12.62, longitude: -7.99 },
      { latitude: 12.5658, longitude: -7.9896 },
    ],
  },
  {
    id: "d6",
    driverName: "Ousmane Koné",
    driverRating: 4.5,
    from: "Niamakoro",
    to: "ACI 2000",
    pickupLat: 12.5854,
    pickupLng: -7.9502,
    dropLat: 12.6201,
    dropLng: -8.0264,
    price: "28 000 FCFA",
    availableSeats: 1,
    departureAt: "08:00",
    color: "#4f46e5",
    routeCoordinates: [
      { latitude: 12.5854, longitude: -7.9502 },
      { latitude: 12.6, longitude: -7.97 },
      { latitude: 12.615, longitude: -8.0 },
      { latitude: 12.6201, longitude: -8.0264 },
    ],
  },
  {
    id: "d7",
    driverName: "Mariam Sanogo",
    driverRating: 4.9,
    from: "Hamdallaye",
    to: "Sogoniko",
    pickupLat: 12.6337,
    pickupLng: -8.0059,
    dropLat: 12.5987,
    dropLng: -8.0099,
    price: "22 000 FCFA",
    availableSeats: 4,
    departureAt: "19:00",
    color: "#be185d",
    routeCoordinates: [
      { latitude: 12.6337, longitude: -8.0059 },
      { latitude: 12.62, longitude: -8.008 },
      { latitude: 12.5987, longitude: -8.0099 },
    ],
  },
];
