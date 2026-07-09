import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HeaderAppProps = {
  title: string;
  showBack?: boolean;
};

const HeaderApp = ({ title, showBack = false }: HeaderAppProps) => {
  if (showBack) {
    return (
      <View className="px-5 pb-5 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">{title}</Text>
          <View className="w-6" />
        </View>
      </View>
    );
  }

  return (
    <View className="px-5 h-30 bg-primary pt-safe">
      <View className="pt-3">
        <Text className="text-2xl font-bold text-white">{title}</Text>
      </View>
    </View>
  );
};

export default HeaderApp;
