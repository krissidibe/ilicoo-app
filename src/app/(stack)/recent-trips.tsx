import { Text } from "@/src/components/ui/text";
import {
  recentTrips,
  type RecentTrip,
  type TripStatus,
} from "@/src/data/recentTrips";
import { cn } from "@/src/lib/utils";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type TripTab = "Termine" | "Annule" | "En attente";

const tabs: TripTab[] = ["Termine", "Annule", "En attente"];

const statusConfig = (
  status: TripStatus,
): {
  statusColor: string;
  statusIconColor: string;
  icon: "check-circle-outline" | "close-circle-outline" | "timer-outline";
} => {
  if (status === "Termine") {
    return {
      statusColor: "bg-emerald-500/15 text-emerald-600",
      statusIconColor: "#059669",
      icon: "check-circle-outline",
    };
  }

  if (status === "Annule") {
    return {
      statusColor: "bg-red-500/15 text-red-600",
      statusIconColor: "#dc2626",
      icon: "close-circle-outline",
    };
  }

  return {
    statusColor: "bg-amber-500/15 text-amber-600",
    statusIconColor: "#d97706",
    icon: "timer-outline",
  };
};

const RecentTripsScreen = () => {
  const [activeTab, setActiveTab] = React.useState<TripTab>("Termine");
  const { open } = useBottomSheetStore();

  const callDriver = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);

    if (canOpen) {
      await Linking.openURL(phoneUrl);
    }
  };

  const filteredTrips = React.useMemo(() => {
    return recentTrips.filter((trip) => trip.status === activeTab);
  }, [activeTab]);

  const openTripDetails = (trip: RecentTrip): void => {
    const statusStyle = statusConfig(trip.status);

    open(
      <View className="px-5 pt-2 pb-7">
        <Text className="text-lg font-bold text-foreground">Details du trajet</Text>

        <View className="mt-4 rounded-2xl border border-gray bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center pr-3">
              <View className="mr-2 rounded-full bg-blue-500/10 p-2">
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={18}
                  color="#2563eb"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Depart
                </Text>
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {trip.from}
                </Text>
              </View>
            </View>
            <View
              className={`flex-row items-center rounded-full px-2 py-1 ${statusStyle.statusColor}`}
            >
              <MaterialCommunityIcons
                name={statusStyle.icon}
                size={14}
                color={statusStyle.statusIconColor}
              />
              <Text className="ml-1 text-xs font-semibold">{trip.status}</Text>
            </View>
          </View>

          <View className="mb-3 flex-row items-center">
            <View className="mr-2 rounded-full bg-rose-500/10 p-2">
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={18}
                color="#e11d48"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Arrivee
              </Text>
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                {trip.to}
              </Text>
            </View>
          </View>

          {trip.driver ? (
            <View className="mb-3 flex-row items-center justify-between rounded-xl border border-gray px-3 py-2">
              <View className="flex-row items-center">
                <View className="mr-2 rounded-full bg-primary/10 p-2">
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={16}
                    color="#6366f1"
                  />
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Chauffeur</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {trip.driver.name} - {trip.driver.rating}★
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center rounded-full bg-primary px-3 py-1.5"
                onPress={() => {
                  callDriver(trip.driver!.phone);
                }}
              >
                <MaterialCommunityIcons name="phone" size={13} color="white" />
                <Text className="ml-1 text-xs font-semibold text-white">Appeler</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#9ca3af"
              />
              <Text className="ml-1 text-xs text-muted-foreground">{trip.date}</Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="cash-multiple"
                size={16}
                color="#10b981"
              />
              <Text className="ml-1 text-sm font-bold text-foreground">
                {trip.price}
              </Text>
            </View>
          </View>
        </View>
      </View>,
      ["42%"],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-5 pt-safe pb-4">
        <View className="mb-4 flex-row items-center justify-between pt-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Tous les trajets</Text>
          <TouchableOpacity className="opacity-0" disabled>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center rounded-2xl bg-white/15 p-1">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              className={cn(
                "flex-1 rounded-xl py-2.5",
                activeTab === tab && "bg-white",
              )}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={cn(
                  "text-center text-xs font-semibold text-white",
                  activeTab === tab && "text-slate-900",
                )}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          {filteredTrips.map((trip, index) => {
            const statusStyle = statusConfig(trip.status);

            return (
              <Animated.View
                key={trip.id}
                entering={FadeInDown.delay(100 + index * 80).duration(350)}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  className="rounded-2xl border border-gray bg-white p-4 shadow-sm shadow-black/5"
                  onPress={() => openTripDetails(trip)}
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center pr-3">
                      <View className="mr-2 rounded-full bg-blue-500/10 p-2">
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={18}
                          color="#2563eb"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Depart
                        </Text>
                        <Text
                          className="text-sm font-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {trip.from}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`flex-row items-center rounded-full px-2 py-1 ${statusStyle.statusColor}`}
                    >
                      <MaterialCommunityIcons
                        name={statusStyle.icon}
                        size={14}
                        color={statusStyle.statusIconColor}
                      />
                      <Text className="ml-1 text-xs font-semibold">{trip.status}</Text>
                    </View>
                  </View>

                  <View className="mb-3 flex-row items-center">
                    <View className="mr-2 rounded-full bg-rose-500/10 p-2">
                      <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={18}
                        color="#e11d48"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Arrivee
                      </Text>
                      <Text
                        className="text-sm font-semibold text-foreground"
                        numberOfLines={1}
                      >
                        {trip.to}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color="#9ca3af"
                      />
                      <Text className="ml-1 text-xs text-muted-foreground">
                        {trip.date}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name="cash-multiple"
                        size={16}
                        color="#10b981"
                      />
                      <Text className="ml-1 text-sm font-bold text-foreground">
                        {trip.price}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default RecentTripsScreen;
