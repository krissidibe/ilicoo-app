import { Text } from "@/src/components/ui/text";
import type { CommissionPaymentApi } from "@/src/services/payment.service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";

type CommissionPendingModalProps = {
  visible: boolean;
  onClose: () => void;
  onPay: () => void;
  pendingPayments: CommissionPaymentApi[];
  /** Somme des commissions en attente (API `pendingCommission`) */
  pendingCommissionTotal?: number;
};

/**
 * Alerte conducteur : 1 commission (rappel simple) ou ≥ 2 (message 24h + blocage).
 */
export const CommissionPendingModal = ({
  visible,
  onClose,
  onPay,
  pendingPayments,
  pendingCommissionTotal,
}: CommissionPendingModalProps) => {
  const count = pendingPayments.length;
  const first = pendingPayments[0];
  const twoOrMore = count >= 2;

  if (!visible || count === 0 || !first) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="p-6 w-[90%] max-w-md bg-white rounded-3xl items-center">
          <MaterialCommunityIcons
            name={twoOrMore ? "alert-circle-outline" : "cash-check"}
            size={52}
            color={twoOrMore ? "#dc2626" : "#6366f1"}
            style={{ marginBottom: 12 }}
          />
          <Text className="mb-1 text-lg font-bold text-foreground text-center">
            {twoOrMore ? "Commissions non payées" : "Commission à payer"}
          </Text>

          {twoOrMore ? (
            <>
              <Text className="mb-3 text-sm text-center text-foreground leading-5">
                Vous avez {count} commissions non payées. Si vous ne les payez
                pas au bout de 24h, votre trajet sera bloqué et vos trajets
                futurs seront annulés.
              </Text>
              {pendingCommissionTotal != null && pendingCommissionTotal > 0 ? (
                <Text className="mb-4 text-sm font-semibold text-center text-amber-800">
                  Total dû :{" "}
                  {pendingCommissionTotal.toLocaleString("fr-FR")} FCFA
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text className="mb-1 text-sm text-center text-muted-foreground">
                Trajet terminé: {first.route.pickupAddress} →{" "}
                {first.route.dropAddress}
              </Text>
              <Text className="mb-5 text-sm text-center text-muted-foreground">
                Vous avez une commission de{" "}
                {first.ilicoCommission.toLocaleString("fr-FR")} FCFA en attente
                de paiement.
              </Text>
            </>
          )}

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300"
            >
              <Text className="text-sm font-semibold text-muted-foreground">
                Plus tard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onPay}
              className="px-5 py-2.5 rounded-xl bg-primary"
            >
              <Text className="text-sm font-semibold text-white">Payer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
