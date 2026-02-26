import { create } from "zustand";
import React from "react";
interface BottomSheetProps {
  isOpen: boolean;
  content: React.ReactNode | null;
  snapPoints: string[];
  open: (content: React.ReactNode, snapPoints: string[]) => void;
  close: () => void;
}

export const useBottomSheetStore = create<BottomSheetProps>((set) => ({
  isOpen: false,
  content: null,
  snapPoints: ["50%"],
  open: (content, snapPoints) => set({ isOpen: true, content, snapPoints }),
  close: () => set({ isOpen: false, content: null }),
}));
