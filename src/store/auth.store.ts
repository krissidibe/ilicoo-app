import { create } from "zustand";

interface AuthStore {
  refreshTrigger: number;
  triggerAuthRefresh: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  refreshTrigger: 0,
  triggerAuthRefresh: () => set({ refreshTrigger: Date.now() }),
}));
