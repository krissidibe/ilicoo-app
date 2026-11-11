import StarRating from "@/src/components/StarRating";
import { VerifiedBadge } from "@/src/components/VerifiedBadge";
import { queryKeys } from "@/src/services/queryKeys";
import {
  createRating,
  driverPassengerKey,
  getDriverHandledPassengerKeys,
  markDriverPassengerHandled,
} from "@/src/services/rating.service";
import { getMyRoutes } from "@/src/services/route.service";
import type { RouteApi, RoutePassengerApi } from "@/src/types/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useSegments } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const HANDLED_QUERY_KEY = ["driver-handled-passengers"] as const;

/** Au-delà, un trajet terminé ne déclenche plus la popup (évite de remonter tout l'historique). */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type PendingConfirmation = {
  route: RouteApi;
  passenger: RoutePassengerApi;
};

const findNextPending = (
  routes: RouteApi[] | undefined,
  handledKeyList: string[] | undefined,
  now: number,
): PendingConfirmation | null => {
  if (!handledKeyList) return null;
  const handledKeys = new Set(handledKeyList);
  for (const route of routes ?? []) {
    if (route.status !== "COMPLETED") continue;
    const endedAt = route.endedAt ?? route.updatedAt;
    if (endedAt && now - new Date(endedAt).getTime() > MAX_AGE_MS) continue;
    for (const passenger of route.passengers ?? []) {
      if (passenger.status !== "ACCEPTED" && passenger.status !== "COMPLETED")
        continue;
      if (!passenger.userId) continue;
      if (passenger.ratedByDriver || passenger.reportedByDriver) continue;
      if (handledKeys.has(driverPassengerKey(route.id, passenger.userId)))
        continue;
      return { route, passenger };
    }
  }
  return null;
};

/**
 * Conducteur : à la fin du trajet, confirmation ou signalement OBLIGATOIRE
 * pour chacun des passagers (même logique que la popup côté passager).
 * - Confirmer → notation / commentaire optionnel (« Passer » possible)
 * - Non effectué → écran « Signaler un problème »
 */
export function DriverEndTripConfirmModal() {
  const queryClient = useQueryClient();
  const segments = useSegments();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const { data: routesData } = useQuery({
    ...getMyRoutes(),
    refetchInterval: 5000,
  });

  const { data: handledKeyList, refetch: refetchHandled } = useQuery({
    queryKey: HANDLED_QUERY_KEY,
    queryFn: getDriverHandledPassengerKeys,
    staleTime: 0,
  });

  /** Passager confirmé : on reste sur l'étape notation (optionnelle) jusqu'à Envoyer / Passer. */
  const [ratingTarget, setRatingTarget] = useState<PendingConfirmation | null>(
    null,
  );
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nextPending = findNextPending(routesData, handledKeyList, now);
  const current = ratingTarget ?? nextPending;
  const confirmed = ratingTarget !== null;

  const finish = useCallback(async () => {
    setRatingTarget(null);
    await refetchHandled();
  }, [refetchHandled]);

  const ratingMutation = useMutation({
    mutationFn: createRating,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.mine });
      await finish();
    },
    onError: (e) => {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'enregistrer la note",
      );
    },
  });

  // La popup ne s'affiche que sur les onglets : elle doit s'effacer
  // quand on ouvre l'écran « Signaler un problème ».
  const onTabs = (segments as readonly string[])[0] === "(tabs)";
  const visible = onTabs && current !== null;

  if (!current) return null;

  const { route, passenger } = current;
  const passengerName = passenger.user?.name ?? "le passager";

  const handleConfirm = async () => {
    const snapshot = current;
    setStars(0);
    setComment("");
    setRatingTarget(snapshot);
    await markDriverPassengerHandled(
      snapshot.route.id,
      snapshot.passenger.userId,
    );
  };

  const handleNotDone = () => {
    const snapshot = current;
    router.push({
      pathname: "/(stack)/report-passenger",
      params: {
        routeId: snapshot.route.id,
        passengerId: snapshot.passenger.userId,
        passengerName,
        from: snapshot.route.pickupAddress,
        to: snapshot.route.dropAddress,
        mode: "non-effectue",
      },
    } as never);
  };

  const handleSendRating = () => {
    if (stars < 1) {
      Alert.alert("Note requise", "Veuillez sélectionner au moins une étoile.");
      return;
    }
    ratingMutation.mutate({
      routeId: route.id,
      toUserId: passenger.userId,
      stars,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/50"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <View
            className="items-center self-center p-5 bg-white rounded-3xl"
            style={{
              width: Math.min(windowWidth - 40, 400),
              maxHeight: windowHeight * 0.86,
            }}
          >
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={48}
              color="#10b981"
              style={{ marginBottom: 8 }}
            />
            <Text className="mb-1 text-lg font-bold text-emerald-700">
              Trajet terminé !
            </Text>
            <Text
              className="mb-1 text-sm text-center text-muted-foreground"
              numberOfLines={3}
            >
              {route.pickupAddress} → {route.dropAddress}
            </Text>

            {!confirmed ? (
              <>
                <View className="flex-row flex-wrap gap-1 justify-center items-center px-1 mt-2 mb-4">
                  <Text className="text-sm text-center text-muted-foreground">
                    Confirmez-vous le trajet avec
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {passengerName}
                  </Text>
                  {passenger.user?.isVerified ? (
                    <VerifiedBadge size={16} />
                  ) : null}
                  <Text className="text-sm text-muted-foreground">?</Text>
                </View>
                <View className="flex-row gap-2 w-full">
                  <TouchableOpacity
                    onPress={handleNotDone}
                    className="flex-1 items-center px-3 py-2.5 rounded-xl border border-red-300 bg-red-50"
                  >
                    <Text className="text-sm font-semibold text-center text-red-600">
                      Non effectué
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleConfirm()}
                    className="flex-1 items-center px-3 py-2.5 rounded-xl bg-emerald-600"
                  >
                    <Text className="text-sm font-semibold text-center text-white">
                      Confirmer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View className="flex-row flex-wrap gap-1 justify-center items-center px-1 mb-4">
                  <Text className="text-sm text-center text-muted-foreground">
                    Comment était votre trajet avec
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {passengerName}
                  </Text>
                  {passenger.user?.isVerified ? (
                    <VerifiedBadge size={16} />
                  ) : null}
                  <Text className="text-sm text-muted-foreground">?</Text>
                </View>
                <StarRating
                  rating={stars}
                  size={32}
                  editable={!ratingMutation.isPending}
                  onChange={setStars}
                />
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Ajouter un commentaire (optionnel)"
                  multiline
                  numberOfLines={3}
                  className="mt-4 w-full min-h-[72px] rounded-xl border border-gray-200 px-3 py-2 text-sm text-foreground"
                  style={{ textAlignVertical: "top" }}
                />
                <TouchableOpacity
                  onPress={handleSendRating}
                  disabled={ratingMutation.isPending}
                  className="items-center px-4 py-2.5 mt-4 w-full bg-emerald-600 rounded-xl"
                >
                  {ratingMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      Envoyer la note
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void finish()}
                  disabled={ratingMutation.isPending}
                  className="mt-3"
                >
                  <Text className="text-xs underline text-muted-foreground">
                    Passer
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
