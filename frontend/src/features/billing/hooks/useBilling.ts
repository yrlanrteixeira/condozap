import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "../api/billing.api";

const QK = {
  subscription: ["billing", "subscription", "me"] as const,
  plans: ["billing", "plans"] as const,
  bills: ["billing", "bills", "me"] as const,
};

export function useMySubscription() {
  return useQuery({
    queryKey: QK.subscription,
    queryFn: billingApi.getMySubscription,
    staleTime: 60_000,
  });
}

export function useActivePlans() {
  return useQuery({
    queryKey: QK.plans,
    queryFn: billingApi.listActivePlans,
    staleTime: 5 * 60_000,
  });
}

export function useMyBills() {
  return useQuery({
    queryKey: QK.bills,
    queryFn: billingApi.listMyBills,
    staleTime: 30_000,
  });
}

export function useCreatePixBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createPixBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.bills });
      qc.invalidateQueries({ queryKey: QK.subscription });
    },
  });
}

export function useCreateCardBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createCardBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.bills });
      qc.invalidateQueries({ queryKey: QK.subscription });
    },
  });
}
