import React from "react";
import { Text, View } from "react-native";

const HeaderApp = ({ title }: { title: string }) => {
  return (
    <View className="px-5 h-30 bg-primary pt-safe">
      <View className="pt-3">
        <Text className="text-2xl font-bold text-white">{title}</Text>
      </View>
    </View>
  );
};

export default HeaderApp;
