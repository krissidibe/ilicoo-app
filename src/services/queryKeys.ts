export const queryKeys = {
  notifications: ["notifications"],
  vehicles: {
    all: ["vehicles"],
    details: (id: string) => [...queryKeys.vehicles.all, id],
  },
  vehicules: {
    all: ["vehicules"],
    details: (id: string) => [...queryKeys.vehicules.all, id],
  },
  routePassengers: {
    all: ["route-passengers"],
    details: (id: string) => [...queryKeys.routePassengers.all, id],
  },
  routes: {
    mine: ["routes", "mine"],
    search: (params: unknown) => ["routes", "search", params],
  },
  user: {
    all: ["user"],
  },
};
