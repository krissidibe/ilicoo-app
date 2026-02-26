export type TripStatus = "Termine" | "Annule" | "En attente";

export type DriverInfo = {
  name: string;
  phone: string;
  rating: number;
};

export type RecentTrip = {
  id: number;
  from: string;
  to: string;
  date: string;
  price: string;
  status: TripStatus;
  driver?: DriverInfo;
};

export const recentTrips: RecentTrip[] = [
  {
    id: 1,
    from: "Bamako Centre",
    to: "Aeroport Modibo Keita",
    date: "Aujourd hui, 14:30",
    price: "45 000 FCFA",
    status: "Termine",
    driver: {
      name: "Moussa Traore",
      phone: "+22370001111",
      rating: 4.8,
    },
  },
  {
    id: 2,
    from: "Hamdallaye ACI 2000",
    to: "Sogoniko",
    date: "Hier, 18:10",
    price: "30 000 FCFA",
    status: "Annule",
    driver: {
      name: "Abdoul Karim",
      phone: "+22370002222",
      rating: 4.4,
    },
  },
  {
    id: 3,
    from: "Badalabougou",
    to: "Kalaban Coura",
    date: "Lun, 09:15",
    price: "38 500 FCFA",
    status: "En attente",
  },
  {
    id: 4,
    from: "Lafiabougou",
    to: "Missabougou",
    date: "Dim, 11:50",
    price: "25 000 FCFA",
    status: "Termine",
    driver: {
      name: "Fatoumata Keita",
      phone: "+22370003333",
      rating: 4.9,
    },
  },
  {
    id: 5,
    from: "Sotuba",
    to: "Niamakoro",
    date: "Sam, 20:05",
    price: "28 000 FCFA",
    status: "En attente",
  },
  {
    id: 6,
    from: "Djelibougou",
    to: "Magnambougou",
    date: "Ven, 07:35",
    price: "21 000 FCFA",
    status: "Annule",
    driver: {
      name: "Ibrahima Coulibaly",
      phone: "+22370004444",
      rating: 4.3,
    },
  },
];
