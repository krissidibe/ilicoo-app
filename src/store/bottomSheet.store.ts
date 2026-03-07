import { create } from "zustand";
import React from "react";
interface BottomSheetProps {
  isOpen: boolean;
  content: React.ReactNode | null;
  snapPoints: string[];
  expandedPassengerId: string | null;
  setExpandedPassengerId: (id: string | null) => void;
  open: (content: React.ReactNode, snapPoints: string[]) => void;
  close: () => void;
}

export const useBottomSheetStore = create<BottomSheetProps>((set) => ({
  isOpen: false,
  content: null,
  snapPoints: ["50%"],
  expandedPassengerId: null,
  setExpandedPassengerId: (id) => set({ expandedPassengerId: id }),
  open: (content, snapPoints) => set({ isOpen: true, content, snapPoints, expandedPassengerId: null }),
  close: () => set({ isOpen: false, content: null, expandedPassengerId: null }),
}));
