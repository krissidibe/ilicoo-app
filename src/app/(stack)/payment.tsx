import HeaderApp from "@/src/components/Header/HeaderApp";
import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import {
  getPaymentsSummary,
  payPendingCommissions,
} from "@/src/services/payment.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

const PaymentScreen = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isRefetching, refetch } =
    useQuery(getPaymentsSummary());
  const payMutation = useMutation({
    mutationFn: () => payPendingCommissions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["routes", "mine"] });
    },
  });

  const pendingPayments = data?.pendingPayments ?? [];
  const paidPayments = data?.paidPayments ?? [];
  const pendingCommission = data?.pendingCommission ?? 0;

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View className="flex-1 bg-background">
      <HeaderApp title="Paiement commission" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor="#6366f1"
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#6366f1" className="py-20" />
        ) : (
          <>
            <View className="p-4 rounded-2xl border border-primary/25 bg-primary/10">
              <Text className="text-xs text-primary/80">
                Commission à payer
              </Text>
              <Text className="mt-1 text-xl font-bold text-primary">
                {pendingCommission.toLocaleString("fr-FR")} FCFA
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Après paiement, vous pouvez publier de nouveaux trajets.
              </Text>
            </View>

            <Button
              className="mt-4 rounded-xl"
              disabled={pendingPayments.length === 0 || payMutation.isPending}
              onPress={() => payMutation.mutate()}
            >
              <Text>
                {payMutation.isPending
                  ? "Paiement en cours..."
                  : "Payer toutes les commissions"}
              </Text>
            </Button>

            <Text className="mt-6 mb-3 text-base font-bold text-foreground">
              Commissions en attente ({pendingPayments.length})
            </Text>
            {pendingPayments.length === 0 ? (
              <Text className="text-sm text-muted-foreground">
                Aucune commission en attente.
              </Text>
            ) : (
              pendingPayments.map((payment) => (
                <View
                  key={payment.id}
                  className="p-4 mb-3 rounded-2xl border border-amber-500/25 bg-amber-500/10"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {payment.route.pickupAddress} → {payment.route.dropAddress}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Date trajet: {formatDateTime(payment.route.departureAt)}
                  </Text>
                  <Text className="mt-2 text-sm font-semibold text-amber-700">
                    Commission:{" "}
                    {payment.ilicoCommission.toLocaleString("fr-FR")} FCFA
                  </Text>
                </View>
              ))
            )}

            <View className="mt-4 h-px bg-gray-200" />

            <Text className="mt-6 mb-3 text-base font-bold text-foreground">
              Historique paiements
            </Text>
            {paidPayments.length === 0 ? (
              <Text className="text-sm text-muted-foreground">
                Aucun paiement effectué.
              </Text>
            ) : (
              paidPayments.map((payment) => (
                <TouchableOpacity
                  key={payment.id}
                  activeOpacity={0.9}
                  className="p-4 mb-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {payment.route.pickupAddress} → {payment.route.dropAddress}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Payé le:{" "}
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </Text>
                  <Text className="mt-2 text-sm font-semibold text-emerald-700">
                    Commission payée:{" "}
                    {payment.ilicoCommission.toLocaleString("fr-FR")} FCFA
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default PaymentScreen;
