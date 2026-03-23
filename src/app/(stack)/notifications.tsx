import HeaderApp from "@/src/components/Header/HeaderApp";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { formatPrice, formatPriceDisplay } from "@/src/lib/utils";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationApi,
} from "@/src/services/notification.service";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

const typeConfig: Record<
  string,
  { icon: string; color: string; bgColor: string; label: string }
> = {
  RIDE_REQUEST: {
    icon: "car-outline",
    color: "#6366f1",
    bgColor: "#6366f120",
    label: "Demande",
  },
  RIDE_ACCEPTED: {
    icon: "checkmark-circle-outline",
    color: "#059669",
    bgColor: "#05966920",
    label: "Accepté",
  },
  RIDE_REJECTED: {
    icon: "close-circle-outline",
    color: "#dc2626",
    bgColor: "#dc262620",
    label: "Refusé",
  },
  RIDE_CANCELLED: {
    icon: "alert-circle-outline",
    color: "#f59e0b",
    bgColor: "#f59e0b20",
    label: "Annulé",
  },
  RIDE_STARTED: {
    icon: "play-circle-outline",
    color: "#2563eb",
    bgColor: "#2563eb20",
    label: "Démarré",
  },
  RIDE_COMPLETED: {
    icon: "checkmark-done-outline",
    color: "#10b981",
    bgColor: "#10b98120",
    label: "Terminé",
  },
  RIDE_REMINDER: {
    icon: "time-outline",
    color: "#0ea5e9",
    bgColor: "#0ea5e920",
    label: "Rappel",
  },
  PAYMENT_RECEIVED: {
    icon: "cash-outline",
    color: "#10b981",
    bgColor: "#10b98120",
    label: "Paiement",
  },
  SYSTEM: {
    icon: "notifications-outline",
    color: "#64748b",
    bgColor: "#64748b20",
    label: "Système",
  },
};

const formatTimeAgo = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `il y a ${diffD}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

const formatRouteDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Aujourd'hui à ${time}`;
  return `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${time}`;
};

const NotificationItem = ({
  notif,
  onPress,
  index,
}: {
  notif: NotificationApi;
  onPress: () => void;
  index: number;
}) => {
  const cfg = typeConfig[notif.type] ?? typeConfig.SYSTEM;

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).duration(350)}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        className={`overflow-hidden rounded-2xl mb-3 ${
          notif.read ? "bg-white" : "bg-indigo-50"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row p-4">
          <View
            className="justify-center items-center mr-3 rounded-2xl size-12"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <Ionicons
              name={cfg.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={cfg.color}
            />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-start mb-1">
              <View className="flex-row flex-1 items-center pr-2">
                <Text
                  className="font-bold text-foreground text-[15px]"
                  numberOfLines={1}
                >
                  {notif.title}
                </Text>
                {!notif.read && (
                  <View className="ml-2 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                )}
              </View>
              <Text className="text-[11px] text-muted-foreground mt-0.5">
                {formatTimeAgo(notif.createdAt)}
              </Text>
            </View>

            {notif.body ? (
              <Text
                className="text-sm leading-5 text-muted-foreground"
                numberOfLines={2}
              >
                {notif.body}
              </Text>
            ) : null}

            <View className="flex-row items-center mt-2.5 gap-2">
              <View
                className="px-2 py-1 rounded-lg"
                style={{ backgroundColor: cfg.bgColor }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                <Text className="text-[11px] text-muted-foreground ml-0.5">
                  Détails
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationsScreen = () => {
  const queryClient = useQueryClient();
  const { open, close } = useBottomSheetStore();
  const { data, isLoading, refetch, isRefetching } =
    useQuery(getNotifications());

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleNotificationPress = (notif: NotificationApi) => {
    if (!notif.read) {
      markReadMutation.mutate(notif.id);
    }

    const route = notif.route;
    const cfg = typeConfig[notif.type] ?? typeConfig.SYSTEM;
    const isRideRequestDriver = notif.type === "RIDE_REQUEST";
    const passengerPriceLabel =
      notif.passengerPrice != null && !Number.isNaN(notif.passengerPrice)
        ? formatPriceDisplay(notif.passengerPrice)
        : null;

    open(
      <View className="px-5 pt-2 pb-7">
        <View className="flex-row items-center mb-4">
          <View
            className="justify-center items-center mr-3 rounded-2xl size-14"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <Ionicons
              name={cfg.icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color={cfg.color}
            />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">
              {notif.title}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {formatTimeAgo(notif.createdAt)}
            </Text>
          </View>
        </View>

        {notif.body ? (
          <Text className="mb-4 text-sm leading-6 text-muted-foreground">
            {notif.body}
          </Text>
        ) : null}

        {route ? (
          <View className="p-4 rounded-2xl border border-gray-200 bg-gray-50/80">
            <View className="flex-row items-center mb-3">
              <View className="p-2 mr-2 rounded-full bg-blue-500/10">
                <Ionicons name="navigate-outline" size={16} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Départ
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {route.pickupAddress}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="p-2 mr-2 rounded-full bg-rose-500/10">
                <Ionicons name="flag-outline" size={16} color="#e11d48" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Arrivée
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {route.dropAddress}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center pt-3 border-t border-gray-200">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color="#9ca3af"
                />
                <Text className="ml-1.5 text-xs text-muted-foreground">
                  {formatRouteDate(route.departureAt)}
                </Text>
              </View>
              <View className="flex-row items-center flex-wrap justify-end max-w-[55%]">
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={14}
                  color="#10b981"
                />
                <Text className="ml-1.5 text-sm font-bold text-foreground">
                  {passengerPriceLabel ??
                    (route.distanceKm != null
                      ? formatPrice(route.distanceKm, 1)
                      : formatPriceDisplay(route.price))}
                </Text>
              </View>
            </View>
            {passengerPriceLabel ? (
              <Text className="mt-2 text-[11px] text-muted-foreground text-right">
                {isRideRequestDriver
                  ? "Prix pour cette demande"
                  : "Prix de votre réservation"}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-3 mt-6">
          <Button
            className="flex-1 rounded-xl"
            onPress={() => {
              close();
              const driverTypes = [
                "RIDE_REQUEST",
                "PAYMENT_RECEIVED",
                "COMMISSION_DUE",
              ];
              if (driverTypes.includes(notif.type)) {
                router.push("/(stack)/driver-trips" as any);
              } else {
                router.push("/(stack)/recent-trips" as any);
              }
            }}
          >
            <View className="flex-row gap-2 items-center">
              <Ionicons name="car-outline" size={16} color="white" />
              <Text className="font-semibold text-white">Voir mes trajets</Text>
            </View>
          </Button>
          <Button variant="outline" className="px-4 rounded-xl" onPress={close}>
            <Text>Fermer</Text>
          </Button>
        </View>
      </View>,
      ["55%"],
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <HeaderApp title="Notifications" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-12"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor="#6366f1"
          />
        }
      >
        {unreadCount > 0 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row gap-2 items-center">
                <View className="px-2.5 py-1 rounded-full bg-indigo-500">
                  <Text className="text-xs font-bold text-white">
                    {unreadCount}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">
                  non lue{unreadCount > 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => markAllReadMutation.mutate()}
                className="px-4 py-2 rounded-xl bg-indigo-500/10"
              >
                <Text className="text-xs font-bold text-indigo-600">
                  Tout marquer lu
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="mt-4 text-sm text-muted-foreground">
              Chargement...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="flex-1 justify-center items-center py-20"
          >
            <View
              className="p-8 mb-6 bg-white rounded-3xl"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <MaterialCommunityIcons
                name="bell-sleep-outline"
                size={56}
                color="#c7d2fe"
              />
            </View>
            <Text className="text-xl font-bold text-center text-foreground">
              Tout est calme
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-2 max-w-[240px]">
              Vous serez notifié des demandes de trajet et mises à jour
            </Text>
          </Animated.View>
        ) : (
          <View>
            {notifications.map((notif, index) => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                index={index}
                onPress={() => handleNotificationPress(notif)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default NotificationsScreen;
