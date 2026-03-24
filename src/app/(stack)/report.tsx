import HeaderApp from "@/src/components/Header/HeaderApp";
import StarRating from "@/src/components/StarRating";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { queryKeys } from "@/src/services/queryKeys";
import { createRating, markTripAsRated } from "@/src/services/rating.service";
import { createReport } from "@/src/services/report.service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";

const REASONS = [
  {
    id: "behavior",
    label: "Comportement inapproprié",
    icon: "alert-circle-outline",
  },
  { id: "unsafe", label: "Conduite dangereuse", icon: "car-emergency" },
  { id: "route", label: "Trajet non respecté", icon: "map-marker-off-outline" },
  { id: "price", label: "Problème de prix", icon: "cash-remove" },
  { id: "no-show", label: "Non présentation", icon: "account-off-outline" },
  { id: "other", label: "Autre", icon: "dots-horizontal-circle-outline" },
];

const ReportScreen = () => {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    routeId: string;
    driverId: string;
    driverName: string;
    from: string;
    to: string;
  }>();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [driverRating, setDriverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const ratingMutation = useMutation({ mutationFn: createRating });

  const reportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: async () => {
      if (params.routeId) {
        await markTripAsRated(String(params.routeId));
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.routePassengers.all,
      });
      Alert.alert(
        "Signalement envoyé",
        "Votre signalement a bien été pris en compte. Nous l'examinerons dans les plus brefs délais.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'envoyer le signalement",
      );
    },
  });

  const isOtherReason = selectedReason === "other";
  const descriptionRequired = isOtherReason;
  const descriptionValid =
    !descriptionRequired || description.trim().length > 0;

  const handleSubmit = () => {
    if (!selectedReason || !params.routeId || !params.driverId) return;
    if (isOtherReason && !description.trim()) {
      Alert.alert(
        "Description requise",
        "Pour « Autre », la description du problème est obligatoire.",
      );
      return;
    }
    if (driverRating > 0 && !ratingSubmitted && params.driverId) {
      setRatingSubmitted(true);
      ratingMutation.mutate({
        routeId: params.routeId,
        toUserId: params.driverId,
        stars: driverRating,
      });
    }
    reportMutation.mutate({
      routeId: params.routeId,
      driverId: params.driverId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });
  };

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Signaler un problème" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 mb-5 bg-gray-50 rounded-2xl border border-gray-200">
          <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Trajet concerné
          </Text>
          <View className="flex-row items-center mb-1">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color="#2563eb"
            />
            <Text className="ml-1.5 text-sm text-foreground">
              {params.from ?? "—"}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={14}
              color="#e11d48"
            />
            <Text className="ml-1.5 text-sm text-foreground">
              {params.to ?? "—"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="account-outline"
              size={14}
              color="#6366f1"
            />
            <Text className="ml-1.5 text-sm font-semibold text-foreground">
              Chauffeur: {params.driverName ?? "—"}
            </Text>
          </View>
        </View>

        {/* Note optionnelle du chauffeur */}
        <View className="p-4 mb-5 bg-amber-50 rounded-2xl border border-amber-200">
          <Text className="mb-1 text-xs font-semibold tracking-wide text-amber-700 uppercase">
            Note du chauffeur
          </Text>
          <Text className="mb-3 text-xs text-muted-foreground">
            Vous pouvez noter le chauffeur avant de signaler.
          </Text>
          <View className="flex-row gap-3 items-center">
            <StarRating
              rating={driverRating}
              size={28}
              editable={!ratingSubmitted}
              onChange={(stars) => setDriverRating(stars)}
            />
            {driverRating > 0 && (
              <Text className="text-sm font-semibold text-amber-700">
                {driverRating}/5
              </Text>
            )}
          </View>
        </View>

        <Text className="mb-3 text-sm font-semibold text-foreground">
          Quel est le problème ?
        </Text>
        <View className="gap-2 mb-5">
          {REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              onPress={() => setSelectedReason(reason.id)}
              className={`flex-row items-center p-4 rounded-xl border ${
                selectedReason === reason.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              <MaterialCommunityIcons
                name={reason.icon as any}
                size={20}
                color={selectedReason === reason.id ? "#6366f1" : "#9ca3af"}
              />
              <Text
                className={`ml-3 text-sm font-medium ${
                  selectedReason === reason.id
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#6366f1"
                  style={{ marginLeft: "auto" }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mb-2 text-sm font-semibold text-foreground">
          Description{" "}
          {descriptionRequired ? (
            <Text className="text-destructive">(obligatoire)</Text>
          ) : (
            <Text className="font-normal text-muted-foreground">
              (optionnel)
            </Text>
          )}
        </Text>
        {descriptionRequired ? (
          <Text className="mb-2 text-xs text-muted-foreground">
            Décrivez précisément la situation pour « Autre ».
          </Text>
        ) : null}
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder={
            descriptionRequired
              ? "Expliquez le problème en détail…"
              : "Décrivez le problème en détail…"
          }
          multiline
          numberOfLines={4}
          className={`min-h-[100px] text-start ${
            descriptionRequired && !description.trim()
              ? "border-amber-400"
              : ""
          }`}
          style={{ textAlignVertical: "top" }}
        />
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 px-5 pt-3 pb-5 bg-white border-t border-gray-200">
        <Button
          className="rounded-xl"
          onPress={handleSubmit}
          disabled={
            !selectedReason ||
            reportMutation.isPending ||
            (descriptionRequired && !descriptionValid)
          }
        >
          <Text className="font-semibold text-primary-foreground">
            {reportMutation.isPending
              ? "Envoi en cours..."
              : "Envoyer le signalement"}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default ReportScreen;
