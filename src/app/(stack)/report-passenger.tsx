import HeaderApp from "@/src/components/Header/HeaderApp";
import StarRating from "@/src/components/StarRating";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Text } from "@/src/components/ui/text";
import { queryKeys } from "@/src/services/queryKeys";
import { createRating } from "@/src/services/rating.service";
import { createPassengerReport } from "@/src/services/report.service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View } from "react-native";

const REASONS = [
  { id: "no-show", label: "Il ne s'est pas présenté", icon: "account-off-outline" },
  { id: "unreachable", label: "Injoignable", icon: "phone-off-outline" },
  { id: "other", label: "Autre", icon: "dots-horizontal-circle-outline" },
];

const ReportPassengerScreen = () => {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    routeId: string;
    passengerId: string;
    passengerName: string;
    from: string;
    to: string;
    mode: "rate" | "report";
  }>();

  const isRateMode = params.mode === "rate";

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [passengerRating, setPassengerRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const ratingMutation = useMutation({
    mutationFn: createRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      Alert.alert("Note enregistrée", "Votre note a bien été enregistrée !", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'enregistrer la note",
      );
    },
  });

  const reportMutation = useMutation({
    mutationFn: createPassengerReport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      Alert.alert(
        "Signalement envoyé",
        "Votre signalement a bien été pris en compte.",
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

  const handleSubmitRating = () => {
    if (!params.routeId || !params.passengerId || passengerRating === 0) return;
    setRatingSubmitted(true);
    ratingMutation.mutate({
      routeId: params.routeId,
      toUserId: params.passengerId,
      stars: passengerRating,
      comment: ratingComment.trim() || undefined,
    });
  };

  const isOtherReason = selectedReason === "other";
  const descriptionRequired = isOtherReason;
  const descriptionValid =
    !descriptionRequired || description.trim().length > 0;

  const handleSubmitReport = () => {
    if (!selectedReason || !params.routeId || !params.passengerId) return;
    if (isOtherReason && !description.trim()) {
      Alert.alert(
        "Description requise",
        "Pour « Autre », la description du problème est obligatoire.",
      );
      return;
    }
    reportMutation.mutate({
      routeId: params.routeId,
      passengerId: params.passengerId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });
  };

  return (
    <View className="flex-1 bg-background">
      <HeaderApp
        title={isRateMode ? "Noter le passager" : "Signaler le passager"}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Infos trajet */}
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
              Passager: {params.passengerName ?? "—"}
            </Text>
          </View>
        </View>

        {isRateMode ? (
          /* Mode: noter le passager */
          <View>
            <Text className="mb-4 text-sm font-semibold text-foreground">
              Comment évaluez-vous ce passager ?
            </Text>
            <View className="items-center py-6 mb-6 bg-amber-50 rounded-2xl border border-amber-200">
              <StarRating
                rating={passengerRating}
                size={38}
                editable={!ratingSubmitted}
                onChange={(stars) => setPassengerRating(stars)}
              />
              {passengerRating > 0 && (
                <Text className="mt-2 text-sm font-semibold text-amber-700">
                  {passengerRating}/5
                </Text>
              )}
            </View>
            <Text className="mb-2 text-sm font-semibold text-foreground">
              Commentaire{" "}
              <Text className="font-normal text-muted-foreground">
                (optionnel)
              </Text>
            </Text>
            <Input
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Ajouter un commentaire…"
              multiline
              numberOfLines={3}
              className="min-h-[80px] text-start"
              style={{ textAlignVertical: "top" }}
            />
          </View>
        ) : (
          /* Mode: signaler le passager */
          <View>
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
          </View>
        )}
      </ScrollView>

      <View className="absolute right-0 bottom-0 left-0 px-5 pt-3 pb-5 bg-white border-t border-gray-200">
        {isRateMode ? (
          <Button
            className="rounded-xl"
            onPress={handleSubmitRating}
            disabled={
              passengerRating === 0 ||
              ratingSubmitted ||
              ratingMutation.isPending
            }
          >
            <Text className="font-semibold text-primary-foreground">
              {ratingMutation.isPending
                ? "Envoi en cours..."
                : "Enregistrer la note"}
            </Text>
          </Button>
        ) : (
          <Button
            className="rounded-xl"
            onPress={handleSubmitReport}
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
        )}
      </View>
    </View>
  );
};

export default ReportPassengerScreen;
