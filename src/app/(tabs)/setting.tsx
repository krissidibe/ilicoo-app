import HeaderApp from "@/src/components/Header/HeaderApp";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Text } from "@/src/components/ui/text";
import { authClient } from "@/src/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";
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
            <Avatar
              className="rounded-2xl border-2 size-16 border-white/30"
              alt="Aboubacar"
            >
              <AvatarImage
                source={{ uri: "https://i.pravatar.cc/150?img=33" }}
              />
              <AvatarFallback>
                <Text className="text-xl font-bold">AD</Text>
              </AvatarFallback>
            </Avatar>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold">Aboubacar Diallo</Text>
              <Text className="text-sm mt-0.5">aboubacar@gmail.com</Text>
              <TouchableOpacity className="self-start px-4 py-2 mt-3 rounded-xl shadow-sm bg-primary">
                <Text className="text-sm font-semibold text-white">
                  Modifier le profil
                </Text>
              </TouchableOpacity>
            </View>
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
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <SettingItem
                icon="car-sport-outline"
                title="Mes véhicules"
                subtitle="Ajouter ou modifier vos véhicules"
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150).duration(350)}>
              <SettingItem
                icon="card-outline"
                title="Méthode de paiement"
                subtitle="Carte bancaire et mobile money"
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
            <Animated.View entering={FadeInDown.delay(250).duration(350)}>
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
            <Animated.View entering={FadeInDown.delay(300).duration(350)}>
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
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(400).duration(350)}>
              <SettingItem
                icon="shield-checkmark-outline"
                title="Confidentialité"
                subtitle="Sécurité et protection des données"
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(450).duration(350)}>
              <SettingItem
                icon="document-text-outline"
                title="Conditions d'utilisation"
                subtitle="Règles et informations légales"
              />
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(350)}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              authClient.signOut();
              setTimeout(() => {
                router.push("/");
              }, 1000);
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
