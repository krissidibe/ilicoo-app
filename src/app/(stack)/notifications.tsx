import HeaderApp from "@/src/components/Header/HeaderApp";
import { Text } from "@/src/components/ui/text";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationApi,
} from "@/src/services/notification.service";
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
import Animated, { FadeInDown } from "react-native-reanimated";

const typeConfig: Record<string, { icon: string; color: string }> = {
  RIDE_REQUEST: { icon: "car-outline", color: "#6366f1" },
  RIDE_ACCEPTED: { icon: "checkmark-circle-outline", color: "#059669" },
  RIDE_REJECTED: { icon: "close-circle-outline", color: "#dc2626" },
  RIDE_CANCELLED: { icon: "alert-circle-outline", color: "#f59e0b" },
  RIDE_STARTED: { icon: "play-circle-outline", color: "#2563eb" },
  RIDE_COMPLETED: { icon: "checkmark-done-outline", color: "#10b981" },
  RIDE_REMINDER: { icon: "time-outline", color: "#0ea5e9" },
  PAYMENT_RECEIVED: { icon: "cash-outline", color: "#10b981" },
  SYSTEM: { icon: "notifications-outline", color: "#64748b" },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Hier";
  if (days < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

const NotificationItem = ({
  notif,
  onPress,
}: {
  notif: NotificationApi;
  onPress: () => void;
}) => {
  const cfg = typeConfig[notif.type] ?? typeConfig.SYSTEM;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`
        flex-row p-4 rounded-2xl border mb-3
        ${notif.read ? "bg-white border-gray-200" : "bg-primary/5 border-primary/20"}
      `}
    >
      <View className="justify-center items-center rounded-full size-12 mr-3" style={{ backgroundColor: `${cfg.color}20` }}>
        <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={24} color={cfg.color} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {notif.title}
        </Text>
        {notif.body ? (
          <Text className="text-sm text-muted-foreground mt-0.5" numberOfLines={2}>
            {notif.body}
          </Text>
        ) : null}
        <Text className="text-xs text-muted-foreground mt-2">{formatDate(notif.createdAt)}</Text>
      </View>
      {!notif.read && (
        <View className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary" />
      )}
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery(getNotifications());

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
    if (notif.routeId) {
      router.push(`/(stack)/recent-trips` as any);
    }
  };

  return (
    <View className="flex-1 bg-background">
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
          <TouchableOpacity
            onPress={() => markAllReadMutation.mutate()}
            className="self-end mb-3 py-2 px-4 rounded-xl bg-primary/10"
          >
            <Text className="text-sm font-semibold text-primary">Tout marquer lu</Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color="#6366f1" className="py-16" />
        ) : notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16 min-h-[300px]">
            <View className="p-6 rounded-full bg-gray-100 mb-4">
              <MaterialCommunityIcons name="bell-outline" size={48} color="#94a3b8" />
            </View>
            <Text className="text-lg font-semibold text-foreground text-center">Aucune notification</Text>
            <Text className="text-sm text-muted-foreground text-center mt-2">
              Vous serez notifié des demandes de trajet et des mises à jour
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)}>
            {notifications.map((notif, index) => (
              <Animated.View key={notif.id} entering={FadeInDown.delay(index * 50).duration(300)}>
                <NotificationItem
                  notif={notif}
                  onPress={() => handleNotificationPress(notif)}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

export default NotificationsScreen;
