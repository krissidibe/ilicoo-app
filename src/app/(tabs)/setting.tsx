import HeaderApp from "@/src/components/Header/HeaderApp";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Switch, TouchableOpacity, View } from "react-native";

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
      activeOpacity={0.8}
      className="flex-row items-center p-4 rounded-2xl border shadow-sm border-black/10 bg-background"
      onPress={onPress}
    >
      <View className="justify-center items-center rounded-xl size-10 bg-primary/10">
        <Ionicons name={icon} size={18} color="#0ea5e9" />
      </View>

      <View className="flex-1 px-3">
        <Text className="text-base font-semibold">{title}</Text>
        {subtitle ? (
          <Text className="text-xs opacity-55">{subtitle}</Text>
        ) : null}
      </View>

      {rightNode ?? (
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
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
      <HeaderApp title="Parametres" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-5 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 rounded-2xl border border-primary/20 bg-primary/10">
          <View className="flex-row items-center">
            <View className="justify-center items-center bg-white rounded-2xl size-14">
              <Ionicons name="person-outline" size={28} color="#0ea5e9" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-bold">Aboubacar Diallo</Text>
              <Text className="text-xs opacity-60">aboubacar@gmail.com</Text>
            </View>
            <TouchableOpacity className="px-3 py-2 bg-white rounded-full">
              <Text className="text-xs font-semibold text-primary">
                Modifier
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold opacity-60">Compte</Text>
          <SettingItem
            icon="person-circle-outline"
            title="Informations personnelles"
            subtitle="Nom, email, telephone"
          />
          <SettingItem
            icon="car-sport-outline"
            title="Mes vehicules"
            subtitle="Ajouter ou modifier vos vehicules"
          />
          <SettingItem
            icon="card-outline"
            title="Methode de paiement"
            subtitle="Carte bancaire et mobile money"
          />
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold opacity-60">Preferences</Text>
          <SettingItem
            icon="notifications-outline"
            title="Notifications push"
            subtitle="Recevoir des alertes de trajet"
            rightNode={
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: "#d1d5db", true: "#0ea5e9" }}
              />
            }
          />
          <SettingItem
            icon="location-outline"
            title="Partage de position"
            subtitle="Ameliorer la precision du trajet"
            rightNode={
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: "#d1d5db", true: "#0ea5e9" }}
              />
            }
          />
          <SettingItem
            icon="moon-outline"
            title="Mode sombre"
            subtitle="Basculer le theme de l application"
            rightNode={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#d1d5db", true: "#0ea5e9" }}
              />
            }
          />
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold opacity-60">Support</Text>
          <SettingItem
            icon="help-circle-outline"
            title="Centre d aide"
            subtitle="FAQ et assistance"
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Confidentialite"
            subtitle="Securite et protection des donnees"
          />
          <SettingItem
            icon="document-text-outline"
            title="Conditions d utilisation"
            subtitle="Regles et informations legales"
          />
        </View>

        <Button className="mt-2 rounded-xl bg-destructive">
          <Text>Se deconnecter</Text>
        </Button>
      </ScrollView>
    </View>
  );
};

export default Setting;
