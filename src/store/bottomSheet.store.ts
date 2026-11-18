import { create } from "zustand";
import React from "react";

export type BottomSheetOpenOptions = {
  /**
   * Contenu défilable dans le sheet (par défaut true) : indispensable sur les
   * petits écrans. Mettre false pour les contenus plein cadre (carte…).
   */
  scrollable?: boolean;
};

interface BottomSheetProps {
  isOpen: boolean;
  content: React.ReactNode | null;
  snapPoints: string[];
  scrollable: boolean;
  expandedPassengerId: string | null;
  setExpandedPassengerId: (id: string | null) => void;
  open: (
    content: React.ReactNode,
    snapPoints: string[],
    options?: BottomSheetOpenOptions,
  ) => void;
  close: () => void;
}

export const useBottomSheetStore = create<BottomSheetProps>((set) => ({
  isOpen: false,
  content: null,
  snapPoints: ["50%"],
  scrollable: true,
  expandedPassengerId: null,
  setExpandedPassengerId: (id) => set({ expandedPassengerId: id }),
  open: (content, snapPoints, options) =>
    set({
      isOpen: true,
      content,
      snapPoints,
      scrollable: options?.scrollable ?? true,
      expandedPassengerId: null,
    }),
  close: () => set({ isOpen: false, content: null, expandedPassengerId: null }),
}));
