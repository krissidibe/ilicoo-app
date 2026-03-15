import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

export type CommissionPaymentApi = {
  id: string;
  amount: number;
  ilicoCommission: number;
  driverRevenue: number;
  status: "PENDING" | "PAID" | "FAILED";
  reference?: string | null;
  paidAt?: string | null;
  createdAt: string;
  route: {
    id: string;
    pickupAddress: string;
    dropAddress: string;
    departureAt: string | null;
    createdAt?: string;
  };
};

export type PaymentsSummaryApi = {
  pendingPayments: CommissionPaymentApi[];
  paidPayments: CommissionPaymentApi[];
  pendingCommission: number;
  canPublish: boolean;
  remainingBeforeBlock: number;
};

const extractData = async <T>(res: Promise<{ success: boolean; data?: T }>) => {
  const json = await res;
  if (!json.success || json.data === undefined) {
    throw new Error((json as { error?: string }).error ?? "Erreur API");
  }
  return json.data;
};

export const getPaymentsSummary = () =>
  queryOptions({
    queryKey: ["payments", "summary"],
    queryFn: () =>
      extractData<PaymentsSummaryApi>(
        apiFetch("payments") as Promise<{ success: boolean; data?: PaymentsSummaryApi }>,
      ),
  });

export const payPendingCommissions = async (paymentIds?: string[]) => {
  const res = await apiFetch("payments", {
    method: "POST",
    body: JSON.stringify({
      paymentIds,
    }),
  });
  const json = res as {
    success: boolean;
    data?: {
      updated: boolean;
      count: number;
      paidCommission: number;
      reference: string;
    };
    error?: string;
  };

  if (!json.success || json.data === undefined) {
    throw new Error(json.error ?? "Erreur API");
  }
  return json.data;
};
