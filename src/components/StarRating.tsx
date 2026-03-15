import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

type StarRatingProps = {
  rating: number;
  maxStars?: number;
  size?: number;
  color?: string;
  editable?: boolean;
  onChange?: (rating: number) => void;
};

const StarRating = ({
  rating,
  maxStars = 5,
  size = 24,
  color = "#f59e0b",
  editable = false,
  onChange,
}: StarRatingProps) => {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View className="flex-row items-center gap-1">
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!editable}
          onPress={() => onChange?.(star)}
          activeOpacity={editable ? 0.6 : 1}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? color : "#d1d5db"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default StarRating;
