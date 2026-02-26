import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ChevronRightIcon, SearchIcon } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { recentTrips, type RecentTrip, type TripStatus } from "@/src/data/recentTrips";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";

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

const HomeScreen = () => {
  const isLoadingUser = false;
  const currentUser = { name: "John Doe" };
  const { open } = useBottomSheetStore();
  const displayedTrips = recentTrips.slice(0, 3);

  const callDriver = async (phone: string): Promise<void> => {
    const phoneUrl = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);

    if (canOpen) {
      await Linking.openURL(phoneUrl);
    }
  };

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
      {/* Header avec gradient */}
      <Animated.View
        entering={FadeIn.duration(500)}
        className="relative px-5 pb-16 rounded-b-3xl pt-safe bg-primary"
      >
        <View className="flex-row justify-between items-center">
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text className="pt-5 text-base text-primary-foreground/80">
              Bonjour 👋
            </Text>
            {isLoadingUser ? (
              <ActivityIndicator size="small" color="white" className="mt-2" />
            ) : (
              <Text className="text-2xl font-bold text-primary-foreground">
                {currentUser?.name || "Utilisateur"}
              </Text>
            )}
          </Animated.View>

          <Animated.View
            className="z-30"
            entering={ZoomIn.delay(200).duration(400)}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(stack)/notifications" as any);
              }}
              className="relative p-3 rounded-full bg-primary-foreground/20"
            >
              <MaterialCommunityIcons name="bell" size={22} color="white" />
              {/*  {unreadCount && unreadCount > 0 && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-primary" />
              )} */}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Barre de recherche flottante */}
        <Animated.View
          //  style={[searchBarAnimatedStyle, pulseAnimatedStyle]}
          className="absolute right-0 left-0 -bottom-7 px-5"
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(stack)/sarch-route" as any);
            }}
            activeOpacity={1}
            className="z-30 flex-row gap-3 items-center p-4 bg-white rounded-2xl shadow-lg shadow-black/10"
          >
            <View className="p-2 rounded-full bg-primary/10">
              <SearchIcon size={20} color="#6366f1" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                Où allez-vous ?
              </Text>
              <Text className="text-xs text-muted-foreground">
                Trouvez votre prochain trajet
              </Text>
            </View>
            <ChevronRightIcon size={20} color="#666" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Trajets recents</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(stack)/recent-trips" as any);
            }}
          >
            <Text className="text-sm font-medium text-primary">Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {displayedTrips.map((trip, index) => {
            const statusStyle = statusConfig(trip.status);

            return (
              <Animated.View
                key={trip.id}
                entering={FadeInDown.delay(250 + index * 90).duration(450)}
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

export default HomeScreen;
