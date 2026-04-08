import apiClient from "@/lib/api-client";
import type {
  BillDto,
  PlanDto,
  PlatformMetricsDto,
  SubscriptionDto,
} from "@/features/billing/api/billing.types";

export interface CreatePlanInput {
  slug: string;
  displayName: string;
  minCondominiums: number;
  maxCondominiums: number;
  pricePerCondoCents: number;
  setupFeeCents?: number;
  sortOrder?: number;
}

export type UpdatePlanInput = Partial<CreatePlanInput> & {
  isActive?: boolean;
};

export const platformBillingApi = {
  async listAllPlans(): Promise<PlanDto[]> {
    const { data } = await apiClient.get<PlanDto[]>("/billing/plans/all");
    return data;
  },

  async createPlan(input: CreatePlanInput): Promise<PlanDto> {
    const { data } = await apiClient.post<PlanDto>("/billing/plans", input);
    return data;
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<PlanDto> {
    const { data } = await apiClient.patch<PlanDto>(`/billing/plans/${id}`, input);
    return data;
  },

  async deactivatePlan(id: string): Promise<{ plan: PlanDto; warning: string | null }> {
    const { data } = await apiClient.delete<{ plan: PlanDto; warning: string | null }>(
      `/billing/plans/${id}`,
    );
    return data;
  },

  async getMetrics(): Promise<PlatformMetricsDto> {
    const { data } = await apiClient.get<PlatformMetricsDto>(
      "/billing/subscriptions/platform/metrics",
    );
    return data;
  },

  async listSubscriptions(): Promise<{
    total: number;
    items: Array<SubscriptionDto & { syndic: { id: string; name: string; email: string } }>;
  }> {
    const { data } = await apiClient.get("/billing/subscriptions");
    return data as {
      total: number;
      items: Array<SubscriptionDto & { syndic: { id: string; name: string; email: string } }>;
    };
  },

  async getSubscriptionBySyndic(syndicId: string): Promise<SubscriptionDto> {
    const { data } = await apiClient.get<SubscriptionDto>(
      `/billing/subscriptions/${syndicId}`,
    );
    return data;
  },

  async listBillsForSyndic(syndicId: string): Promise<BillDto[]> {
    const { data } = await apiClient.get<BillDto[]>(
      `/billing/bills/syndic/${syndicId}`,
    );
    return data;
  },

  async extendTrial(syndicId: string, days: number): Promise<SubscriptionDto> {
    const { data } = await apiClient.post<SubscriptionDto>(
      `/billing/subscriptions/${syndicId}/extend-trial`,
      { days },
    );
    return data;
  },

  async cancelSubscription(syndicId: string): Promise<SubscriptionDto> {
    const { data } = await apiClient.post<SubscriptionDto>(
      `/billing/subscriptions/${syndicId}/cancel`,
    );
    return data;
  },

  async reactivateSubscription(
    syndicId: string,
    periodEndDays = 30,
  ): Promise<SubscriptionDto> {
    const { data } = await apiClient.post<SubscriptionDto>(
      `/billing/subscriptions/${syndicId}/reactivate`,
      { periodEndDays },
    );
    return data;
  },

  async assignPlanManually(
    syndicId: string,
    planId: string,
    periodEndDays = 30,
  ): Promise<SubscriptionDto> {
    const { data } = await apiClient.post<SubscriptionDto>(
      `/billing/subscriptions/${syndicId}/assign-plan`,
      { planId, periodEndDays },
    );
    return data;
  },

  async createManualBill(
    syndicId: string,
    amountCents: number,
    description: string,
  ): Promise<BillDto> {
    const { data } = await apiClient.post<BillDto>(
      `/billing/bills/manual/${syndicId}`,
      { amountCents, description },
    );
    return data;
  },
};
