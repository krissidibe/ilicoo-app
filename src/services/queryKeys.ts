export const queryKeys = {
  vehicles: {
    all: ["vehicles"],
    details: (id: string) => [...queryKeys.vehicles.all, id],
  },
};
