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
    <View className="flex-1 bg-background pt-safe">
      {/*   <HeaderApp title="Paramètres" /> */}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="overflow-hidden mb-6 bg-white rounded-xl border shadow-xl border-primary/15 shadow-primary/10"
        >
          {isLoading ? (
            <View className="justify-center items-center py-14">
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          ) : (
            <>
              <View className="relative px-5 pt-6 pb-5 bg-primary">
                <View className="absolute -right-8 -top-10 bg-white rounded-full opacity-10 size-40" />
                <View className="absolute -left-4 -bottom-6 bg-white rounded-full opacity-10 size-24" />
                <View className="flex-row items-center">
                  <View className="shadow-black/25">
                    <Avatar
                      className="rounded-3xl size-18"
                      alt={user?.name ?? "User"}
                    >
                      <AvatarImage source={{ uri: user?.image ?? undefined }} />
                      <AvatarFallback>
                        <Text className="text-2xl font-bold text-primary">
                          {user?.name?.slice(0, 2).toUpperCase() ?? "U"}
                        </Text>
                      </AvatarFallback>
                    </Avatar>
                  </View>
                  <View className="flex-1 pl-4 min-w-0">
                    <Text
                      className="text-xl font-bold text-white"
                      numberOfLines={2}
                    >
                      {user?.name ?? "Utilisateur"}
                    </Text>
                    {ratingsData && ratingsData.totalRatings > 0 ? (
                      <View className="flex-row flex-wrap gap-2 items-center mt-2">
                        <View className="flex-row items-center px-2.5 py-1 rounded-full bg-white/20">
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: "/(stack)/user-reviews",
                                params: {
                                  userId: user?.id ?? "",
                                  name: user?.name ?? "Utilisateur",
                                },
                              } as any)
                            }
                          >
                            <StarRating
                              rating={Math.round(ratingsData.averageRating)}
                              size={14}
                              color="#fbbf24"
                            />
                          </TouchableOpacity>
                          {/*   <Text className="ml-1.5 text-sm font-bold text-white">
                            {ratingsData.averageRating.toFixed(1)}
                          </Text> */}
                        </View>

                        <Text className="text-xs text-white/85">
                          {ratingsData.totalRatings} avis
                        </Text>
                      </View>
                    ) : (
                      <Text className="mt-1 text-xs text-white/80">
                        Pas encore d&apos;avis
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View className="px-5 py-4 bg-white">
                <View className="flex-row gap-2 items-start mb-4">
                  <View className="justify-center items-center mt-0.5 rounded-lg size-8 bg-primary/10">
                    <Ionicons name="mail-outline" size={16} color="#6366f1" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                      E-mail
                    </Text>
                    <Text
                      className="mt-0.5 text-sm text-foreground"
                      numberOfLines={2}
                    >
                      {user?.email ?? "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
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
                icon="star-outline"
                title="Avis"
                subtitle="Voir tous les avis reçus"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/(stack)/user-reviews",
                    params: {
                      userId: user?.id ?? "",
                      name: user?.name ?? "Utilisateur",
                    },
                  } as any);
                }}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(110).duration(350)}>
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
