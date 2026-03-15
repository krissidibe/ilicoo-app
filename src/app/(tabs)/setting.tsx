import HeaderApp from "@/src/components/Header/HeaderApp";
import StarRating from "@/src/components/StarRating";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Text } from "@/src/components/ui/text";
import { authClient } from "@/src/lib/auth-client";
import { getUserRatings } from "@/src/services/rating.service";
import { getUser } from "@/src/services/user.service";
import { useAuthStore } from "@/src/store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  onPress?: () => void;
};

const SettingItem = ({
  icon,
  title,
  subtitle,
  rightNode,
  onPress,
}: SettingItemProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center p-4 bg-white rounded-2xl border shadow-sm border-gray-200/80 shadow-black/5"
      onPress={onPress}
    >
      <View className="justify-center items-center rounded-xl size-11 bg-primary/10">
        <Ionicons name={icon} size={20} color="#6366f1" />
      </View>

      <View className="flex-1 px-4">
        <Text className="text-[15px] font-semibold text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightNode ?? (
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      )}
    </TouchableOpacity>
  );
};

const Setting = () => {
  const [pushEnabled, setPushEnabled] = React.useState<boolean>(true);
  const [locationEnabled, setLocationEnabled] = React.useState<boolean>(true);
  const [darkMode, setDarkMode] = React.useState<boolean>(false);
  const { data: user, isLoading } = useQuery(getUser());
  const { data: ratingsData } = useQuery({
    ...getUserRatings(user?.id ?? ""),
    enabled: !!user?.id,
  });

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Paramètres" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="overflow-hidden p-5 mb-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <View className="flex-row items-center">
            {isLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <>
                <Avatar
                  className="rounded-2xl border-2 size-16 border-white/30"
                  alt={user?.name ?? "User"}
                >
                  <AvatarImage source={{ uri: user?.image ?? undefined }} />
                  <AvatarFallback>
                    <Text className="text-xl font-bold">
                      {user?.name?.slice(0, 2).toUpperCase() ?? "U"}
                    </Text>
                  </AvatarFallback>
                </Avatar>
                <View className="flex-1 ml-4">
                  <Text className="text-lg font-bold">
                    {user?.name ?? "Utilisateur"}
                  </Text>
                  <Text className="text-sm mt-0.5">{user?.email ?? ""}</Text>
                  {ratingsData && ratingsData.totalRatings > 0 && (
                    <View className="flex-row items-center mt-1.5 gap-1.5">
                      <StarRating rating={Math.round(ratingsData.averageRating)} size={14} />
                      <Text className="text-xs text-muted-foreground">
                        {ratingsData.averageRating.toFixed(1)} ({ratingsData.totalRatings} avis)
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/(stack)/edit-profile" as any);
                    }}
                    className="self-start px-4 py-2 mt-3 rounded-xl shadow-sm bg-primary"
                  >
                    <Text className="text-sm font-semibold text-white">
                      Modifier le profil
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Compte */}
        <View className="mb-6">
          <View className="flex-row gap-2 items-center mb-3">
            <View className="p-1.5 rounded-lg bg-primary/10">
              <Ionicons name="person" size={14} color="#6366f1" />
            </View>
            <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Compte
            </Text>
          </View>
          <View className="gap-2">
            <Animated.View entering={FadeInDown.delay(50).duration(350)}>
              <SettingItem
                icon="person-circle-outline"
                title="Informations personnelles"
                subtitle="Nom, email, téléphone"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/edit-profile" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <SettingItem
                icon="car-sport-outline"
                title="Mes véhicules"
                subtitle="Ajouter ou modifier vos véhicules"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/manage-vehicle" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(125).duration(350)}>
              <SettingItem
                icon="document-text-outline"
                title="Mon permis"
                subtitle="Gérer les informations de permis"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/edit-permit" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150).duration(350)}>
              <SettingItem
                icon="card-outline"
                title="Commission"
                subtitle=" Commission à payer"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/payment" as any);
                }}
              />
            </Animated.View>
          </View>
        </View>

        {/* Préférences */}
        <View className="mb-6">
          <View className="flex-row gap-2 items-center mb-3">
            <View className="p-1.5 rounded-lg bg-primary/10">
              <Ionicons name="settings-outline" size={14} color="#6366f1" />
            </View>
            <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Préférences
            </Text>
          </View>
          <View className="gap-2">
            <Animated.View entering={FadeInDown.delay(200).duration(350)}>
              <SettingItem
                icon="notifications-outline"
                title="Notifications"
                subtitle="Voir toutes vos notifications"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/notifications" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(220).duration(350)}>
              <SettingItem
                icon="bell-ring-outline"
                title="Notifications push"
                subtitle="Recevoir des alertes de trajet"
                rightNode={
                  <Switch
                    value={pushEnabled}
                    onValueChange={setPushEnabled}
                    trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                    thumbColor="white"
                  />
                }
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(270).duration(350)}>
              <SettingItem
                icon="location-outline"
                title="Partage de position"
                subtitle="Améliorer la précision du trajet"
                rightNode={
                  <Switch
                    value={locationEnabled}
                    onValueChange={setLocationEnabled}
                    trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                    thumbColor="white"
                  />
                }
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(320).duration(350)}>
              <SettingItem
                icon="moon-outline"
                title="Mode sombre"
                subtitle="Basculer le thème de l'application"
                rightNode={
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                    thumbColor="white"
                  />
                }
              />
            </Animated.View>
          </View>
        </View>

        {/* Support */}
        <View className="mb-6">
          <View className="flex-row gap-2 items-center mb-3">
            <View className="p-1.5 rounded-lg bg-primary/10">
              <Ionicons name="help-buoy-outline" size={14} color="#6366f1" />
            </View>
            <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Support
            </Text>
          </View>
          <View className="gap-2">
            <Animated.View entering={FadeInDown.delay(350).duration(350)}>
              <SettingItem
                icon="help-circle-outline"
                title="Centre d'aide"
                subtitle="FAQ et assistance"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/help-center" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(400).duration(350)}>
              <SettingItem
                icon="shield-checkmark-outline"
                title="Confidentialité"
                subtitle="Sécurité et protection des données"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/privacy" as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(450).duration(350)}>
              <SettingItem
                icon="document-text-outline"
                title="Conditions d'utilisation"
                subtitle="Règles et informations légales"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(stack)/terms" as any);
                }}
              />
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(350)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              await authClient.signOut();
              useAuthStore.getState().triggerAuthRefresh();
              router.replace("/" as any);
            }}
            className="flex-row justify-center items-center px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-2 font-semibold text-destructive">
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default Setting;
