import { Text } from "@/src/components/ui/text";
import { mapVehicleToUi } from "@/src/lib/mappers";
import { cn } from "@/src/lib/utils";
import { getVehicules } from "@/src/services/vehicle.service";
import type { VehicleApi } from "@/src/types/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

type VehicleTab = "all" | "car" | "moto";

const tabs: { id: VehicleTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "car", label: "Voitures" },
  { id: "moto", label: "Motos" },
];

const MyVehiclesScreen = () => {
  const [activeTab, setActiveTab] = useState<VehicleTab>("all");
  const { data: vehicles = [], isLoading } = useQuery(getVehicules());

  const filteredVehicles = useMemo(() => {
    if (activeTab === "all") {
      return vehicles;
    }
    if (activeTab === "moto") {
      return vehicles.filter((v) => v.type === "MOTORCYCLE");
    }
    return vehicles.filter((v) => v.type === "CAR");
  }, [activeTab, vehicles]);

  const openAddVehicle = (): void => {
    router.push("/(stack)/manage-vehicle" as any);
  };

  const openEditVehicle = (vehicleId: string): void => {
    router.push({
      pathname: "/(stack)/manage-vehicle",
      params: { vehicleId },
    } as any);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-5 bg-primary pt-safe">
        <View className="flex-row justify-between items-center pt-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">Mes véhicules</Text>
          <TouchableOpacity onPress={openAddVehicle} className="p-1">
            <Ionicons name="add-circle" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center p-1 rounded-2xl bg-white/15">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 items-center rounded-xl py-2.5",
                  active && "bg-white",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    active ? "text-slate-900" : "text-white",
                  )}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-4 pb-10 gap-3"
          showsVerticalScrollIndicator={false}
        >
          {filteredVehicles.length === 0 ? (
            <View className="items-center px-4 py-16">
              <Ionicons name="car-sport-outline" size={48} color="#94a3b8" />
              <Text className="mt-4 text-base font-semibold text-foreground">
                Aucun véhicule
              </Text>
              <Text className="mt-2 text-sm text-center text-muted-foreground">
                Ajoutez votre premier véhicule avec le bouton + en haut à
                droite.
              </Text>
            </View>
          ) : (
            filteredVehicles.map((vehicle: VehicleApi) => {
              const ui = mapVehicleToUi(vehicle);
              const isMoto = vehicle.type === "MOTORCYCLE";
              return (
                <View
                  key={vehicle.id}
                  className="flex-row items-center p-4 bg-white rounded-2xl border border-gray-200"
                >
                  {vehicle.photo ? (
                    <Image
                      source={{ uri: vehicle.photo }}
                      className="rounded-xl size-14 bg-gray-100"
                    />
                  ) : (
                    <View className="justify-center items-center rounded-xl size-14 bg-primary/10">
                      <Ionicons
                        name={isMoto ? "bicycle-outline" : "car-sport-outline"}
                        size={24}
                        color="#6366f1"
                      />
                    </View>
                  )}
                  <View className="flex-1 mx-3">
                    <Text className="text-base font-semibold text-foreground">
                      {ui.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {isMoto ? "Moto" : "Voiture"} • {ui.maximumPassenger}{" "}
                      place(s)
                      {!isMoto && ui.NM !== "—" ? ` • ${ui.NM}` : ""}
                    </Text>
                    {vehicle.default ? (
                      <Text className="mt-1 text-[11px] font-semibold text-primary">
                        Véhicule par défaut
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditVehicle(vehicle.id)}
                    className="p-2 rounded-full bg-primary/10"
                  >
                    <Ionicons name="pencil" size={18} color="#6366f1" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default MyVehiclesScreen;
