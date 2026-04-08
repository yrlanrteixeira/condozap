import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformBillingApi, type CreatePlanInput, type UpdatePlanInput } from "../api/platform-billing.api";

const QK = {
  plans: ["platform-billing", "plans"] as const,
  metrics: ["platform-billing", "metrics"] as const,
  subscriptions: ["platform-billing", "subscriptions"] as const,
  subscription: (id: string) => ["platform-billing", "subscription", id] as const,
  bills: (id: string) => ["platform-billing", "bills", id] as const,
};

export function useAllPlans() {
  return useQuery({
    queryKey: QK.plans,
    queryFn: platformBillingApi.listAllPlans,
    staleTime: 60_000,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => platformBillingApi.createPlan(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.plans }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) =>
      platformBillingApi.updatePlan(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.plans }),
  });
}

export function useDeactivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformBillingApi.deactivatePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.plans }),
  });
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: QK.metrics,
    queryFn: platformBillingApi.getMetrics,
    staleTime: 30_000,
  });
}

export function useAllSubscriptions() {
  return useQuery({
    queryKey: QK.subscriptions,
    queryFn: platformBillingApi.listSubscriptions,
    staleTime: 30_000,
  });
}

export function useSubscriptionBySyndic(syndicId: string | undefined) {
  return useQuery({
    queryKey: syndicId ? QK.subscription(syndicId) : ["platform-billing", "subscription", "none"],
    queryFn: () => platformBillingApi.getSubscriptionBySyndic(syndicId!),
    enabled: !!syndicId,
    staleTime: 30_000,
  });
}

export function useBillsForSyndic(syndicId: string | undefined) {
  return useQuery({
    queryKey: syndicId ? QK.bills(syndicId) : ["platform-billing", "bills", "none"],
    queryFn: () => platformBillingApi.listBillsForSyndic(syndicId!),
    enabled: !!syndicId,
    staleTime: 30_000,
  });
}

export function useExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ syndicId, days }: { syndicId: string; days: number }) =>
      platformBillingApi.extendTrial(syndicId, days),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.subscription(vars.syndicId) });
      qc.invalidateQueries({ queryKey: QK.subscriptions });
      qc.invalidateQueries({ queryKey: QK.metrics });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (syndicId: string) => platformBillingApi.cancelSubscription(syndicId),
    onSuccess: (_, syndicId) => {
      qc.invalidateQueries({ queryKey: QK.subscription(syndicId) });
      qc.invalidateQueries({ queryKey: QK.subscriptions });
      qc.invalidateQueries({ queryKey: QK.metrics });
    },
  });
}

export function useReactivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ syndicId, periodEndDays }: { syndicId: string; periodEndDays?: number }) =>
      platformBillingApi.reactivateSubscription(syndicId, periodEndDays ?? 30),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.subscription(vars.syndicId) });
      qc.invalidateQueries({ queryKey: QK.subscriptions });
      qc.invalidateQueries({ queryKey: QK.metrics });
    },
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      syndicId,
      planId,
      periodEndDays,
    }: {
      syndicId: string;
      planId: string;
      periodEndDays?: number;
    }) => platformBillingApi.assignPlanManually(syndicId, planId, periodEndDays ?? 30),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.subscription(vars.syndicId) });
      qc.invalidateQueries({ queryKey: QK.subscriptions });
      qc.invalidateQueries({ queryKey: QK.metrics });
    },
  });
}
