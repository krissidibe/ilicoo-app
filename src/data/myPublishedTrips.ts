/**
 * Fake data for driver's published trips (Mes trajets)
 * Inspired by API: Route, RoutePassenger, User
 */

export type PassengerRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type PassengerRequest = {
  id: string;
  name: string;
  image?: string;
  phone?: string;
  rating: number;
  status: PassengerRequestStatus;
  seats: number;
  requestedAt: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  routeCoordinates?: { latitude: number; longitude: number }[];
};

export type MyPublishedTripStatus = "En attente" | "En cours" | "Termine" | "Annule";

export type MyPublishedTrip = {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: string;
  status: MyPublishedTripStatus;
  availableSeats: number;
  totalSeats: number;
  vehicleName: string;
  passengers: PassengerRequest[];
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  routeCoordinates?: { latitude: number; longitude: number }[];
};

export const myPublishedTrips: MyPublishedTrip[] = [
  {
    id: "1",
    from: "Hamdallaye ACI 2000",
    to: "Aeroport Modibo Keita",
    date: "Aujourd'hui",
    time: "14:30",
    price: "45 000 FCFA",
    status: "En attente",
    availableSeats: 2,
    totalSeats: 4,
    vehicleName: "Toyota Corolla",
    pickupLat: 12.6337,
    pickupLng: -8.0059,
    dropLat: 12.5334,
    dropLng: -7.9499,
    routeCoordinates: [
      { latitude: 12.6337, longitude: -8.0059 },
      { latitude: 12.62, longitude: -8.02 },
      { latitude: 12.58, longitude: -8.0 },
      { latitude: 12.5334, longitude: -7.9499 },
    ],
    passengers: [
      {
        id: "p1",
        name: "Moussa Traore",
        image: "https://i.pravatar.cc/150?img=12",
        phone: "+22370001111",
        rating: 4.8,
        status: "PENDING",
        seats: 1,
        requestedAt: "Il y a 2h",
        pickupLat: 12.62,
        pickupLng: -8.01,
        dropLat: 12.5334,
        dropLng: -7.9499,
        routeCoordinates: [
          { latitude: 12.62, longitude: -8.01 },
          { latitude: 12.58, longitude: -8.0 },
          { latitude: 12.5334, longitude: -7.9499 },
        ],
      },
      {
        id: "p2",
        name: "Fatoumata Keita",
        image: "https://i.pravatar.cc/150?img=47",
        phone: "+22370002222",
        rating: 4.9,
        status: "PENDING",
        seats: 2,
        requestedAt: "Il y a 1h",
        pickupLat: 12.6337,
        pickupLng: -8.0059,
        dropLat: 12.5334,
        dropLng: -7.9499,
        routeCoordinates: [
          { latitude: 12.6337, longitude: -8.0059 },
          { latitude: 12.62, longitude: -8.02 },
          { latitude: 12.58, longitude: -8.0 },
          { latitude: 12.5334, longitude: -7.9499 },
        ],
      },
      {
        id: "p3",
        name: "Abdoul Karim",
        image: "https://i.pravatar.cc/150?img=33",
        phone: "+22370003333",
        rating: 4.4,
        status: "ACCEPTED",
        seats: 1,
        requestedAt: "Hier",
        pickupLat: 12.6,
        pickupLng: -7.97,
        dropLat: 12.5334,
        dropLng: -7.9499,
        routeCoordinates: [
          { latitude: 12.6, longitude: -7.97 },
          { latitude: 12.55, longitude: -7.96 },
          { latitude: 12.5334, longitude: -7.9499 },
        ],
      },
    ],
  },
  {
    id: "2",
    from: "Badalabougou",
    to: "Kalaban Coura",
    date: "Demain",
    time: "09:15",
    price: "38 500 FCFA",
    status: "En attente",
    availableSeats: 3,
    totalSeats: 4,
    vehicleName: "Toyota Camry",
    pickupLat: 12.6333,
    pickupLng: -7.9833,
    dropLat: 12.5658,
    dropLng: -7.9896,
    routeCoordinates: [
      { latitude: 12.6333, longitude: -7.9833 },
      { latitude: 12.62, longitude: -7.99 },
      { latitude: 12.5658, longitude: -7.9896 },
    ],
    passengers: [
      {
        id: "p4",
        name: "Ibrahima Coulibaly",
        image: "https://i.pravatar.cc/150?img=68",
        phone: "+22370004444",
        rating: 4.3,
        status: "PENDING",
        seats: 1,
        requestedAt: "Il y a 30 min",
        pickupLat: 12.62,
        pickupLng: -7.985,
        dropLat: 12.5658,
        dropLng: -7.9896,
        routeCoordinates: [
          { latitude: 12.62, longitude: -7.985 },
          { latitude: 12.6, longitude: -7.99 },
          { latitude: 12.5658, longitude: -7.9896 },
        ],
      },
    ],
  },
  {
    id: "3",
    from: "Lafiabougou",
    to: "Sogoniko",
    date: "Lun 03 Mar",
    time: "18:00",
    price: "28 000 FCFA",
    status: "En attente",
    availableSeats: 4,
    totalSeats: 4,
    vehicleName: "Toyota Corolla",
    pickupLat: 12.6743,
    pickupLng: -8.0098,
    dropLat: 12.5987,
    dropLng: -8.0099,
    routeCoordinates: [
      { latitude: 12.6743, longitude: -8.0098 },
      { latitude: 12.65, longitude: -8.008 },
      { latitude: 12.5987, longitude: -8.0099 },
    ],
    passengers: [],
  },
];
