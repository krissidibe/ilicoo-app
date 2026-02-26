import HeaderApp from "@/src/components/Header/HeaderApp";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { cn } from "@/src/lib/utils";
import { useBottomSheetStore } from "@/src/store/bottomSheet.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

type Vehicule = {
  id: number;
  name: string;
  default: boolean;
  color: string;
  NM: string;
  maximumPassenger: number;
};

const Setting = () => {
  const totalEarnings = "34 500 FCFA";
  const weeklyEarnings = "+12% cette semaine";

  const { open, close } = useBottomSheetStore();

  const [vehicules, setVehicules] = React.useState<Vehicule[]>([
    {
      id: 1,
      name: "Toyota Corolla",
      default: true,

      color: "noir",
      maximumPassenger: 4,
      NM: "212121",
    },
    {
      id: 2,
      name: "Toyota Camry",
      default: false,
      color: "noir",
      maximumPassenger: 4,
      NM: "212121",
    },
  ]);

  const toggleDefaultVehicule = (vehiculeId: number): void => {
    setVehicules((prevVehicules) => {
      const selectedVehicule = prevVehicules.find(
        (vehicule) => vehicule.id === vehiculeId,
      );

      if (!selectedVehicule) {
        return prevVehicules;
      }

      const nextDefaultState = !selectedVehicule.default;

      return prevVehicules.map((vehicule) => {
        if (vehicule.id === vehiculeId) {
          return { ...vehicule, default: nextDefaultState };
        }

        if (nextDefaultState) {
          return { ...vehicule, default: false };
        }

        return vehicule;
      });
    });
  };

  const openVehiculeModal = (vehicule: Vehicule): void => {
    open(
      <View className="px-5 pt-2 pb-7">
        <View className="flex-row items-center mb-4">
          <View className="justify-center items-center mr-3 bg-gray-200 rounded-xl size-12">
            <Ionicons name="car-sport-outline" size={24} color="black" />
          </View>
          <View>
            <Text className="text-lg font-semibold">{vehicule.name}</Text>
            <Text className="text-xs opacity-50">
              {vehicule.default ? "Vehicule par defaut" : "Vehicule secondaire"}
            </Text>
          </View>
        </View>

        <View className="gap-2 p-4 mb-6 rounded-2xl border border-gray">
          <Text className="text-sm">
            <Text className="font-semibold">Couleur: </Text>
            {vehicule.color}
          </Text>
          <Text className="text-sm">
            <Text className="font-semibold">Numero matricule: </Text>
            {vehicule.NM}
          </Text>
          <Text className="text-sm">
            <Text className="font-semibold">Nombre de places: </Text>
            {vehicule.maximumPassenger}
          </Text>
        </View>

        <Button
          onPress={() => {
            toggleDefaultVehicule(vehicule.id);
            close();
          }}
          className={cn("rounded-xl", vehicule.default && "bg-destructive")}
        >
          <Text>
            {vehicule.default
              ? "Retirer comme vehicule par defaut"
              : "Definir comme vehicule par defaut"}
          </Text>
        </Button>
      </View>,
      ["40%"],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Publier un trajet" />

      {/* Gains gagnes */}
      <View className="px-5 mt-5">
        <View className="p-4 rounded-2xl border border-primary/20 bg-primary/10">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm opacity-70">Gains gagnes</Text>
            <View className="flex-row items-center px-2 py-1 rounded-full bg-emerald-500/15">
              <Ionicons name="trending-up-outline" size={14} color="#10b981" />
              <Text className="ml-1 text-xs text-emerald-600">
                {weeklyEarnings}
              </Text>
            </View>
          </View>

          <Text className="mt-2 text-3xl font-bold">{totalEarnings}</Text>
          <Text className="mt-1 text-xs opacity-60">
            Estimation basee sur vos derniers trajets
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-semibold">
            Choisir un type de vehicule
          </Text>
          <TouchableOpacity onPress={() => router.push("/(stack)/manage-vehicle" as any)}>
            <Text className="font-medium text-primary">Gerer</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4 mt-5">
          {vehicules.map((vehicule) => (
            <TouchableOpacity
              onPress={() => openVehiculeModal(vehicule)}
              className={cn(
                "flex-row items-center rounded-2xl border border-gray p-4 opacity-60",
                vehicule.default && "border-primary bg-primary/5 opacity-100",
              )}
              key={vehicule.id}
            >
              <View className="justify-center items-center bg-gray-200 rounded-xl size-12">
                <Ionicons name="car-sport-outline" size={24} color="black" />
              </View>
              <View className="flex-1 pl-3">
                <Text className="text-base font-semibold">{vehicule.name}</Text>
                <Text className="text-xs opacity-50">
                  {vehicule.default
                    ? "Vehicule par defaut"
                    : "Vehicule secondaire"}
                </Text>
              </View>

              {vehicule.default ? (
                <View className="px-2 py-1 rounded-full bg-primary/15">
                  <Text className="text-xs font-medium text-primary">
                    Selectionne
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default Setting;
