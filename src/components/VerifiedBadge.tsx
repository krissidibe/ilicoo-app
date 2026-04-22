import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, type ViewProps } from "react-native";

type Props = {
  size?: number;
  className?: string;
} & ViewProps;

/**
 * Badge “compte vérifié” (icône type check bleu) — afficher seulement si `isVerified`.
 */
export const VerifiedBadge = ({ size = 16, className, ...rest }: Props) => {
  return (
    <View
      className={cn("justify-center", className)}
      accessibilityLabel="Compte vérifié"
      accessibilityRole="image"
      {...rest}
    >
      <Ionicons name="checkmark-circle" size={size} color="#2563eb" />
    </View>
  );
};

type WithAvatarProps = {
  children: React.ReactNode;
  isVerified?: boolean;
  badgeSize?: number;
};

/**
 * Enveloppe un avatar (carré ou rond) et place le badge vérifié en bas à droite.
 */
export const AvatarWithVerifiedOutline = ({
  children,
  isVerified,
  badgeSize = 14,
}: WithAvatarProps) => {
  if (!isVerified) {
    return <>{children}</>;
  }
  return (
    <View className="relative">
      {children}
      <View
        className="absolute -right-0.5 -bottom-0.5 rounded-full bg-white"
        style={{ padding: 1, borderWidth: 1, borderColor: "white" }}
      >
        <Ionicons name="checkmark-circle" size={badgeSize} color="#2563eb" />
      </View>
    </View>
  );
};
