import apiClient from "@/lib/api-client";
import type { BillDto, PlanDto, SubscriptionDto } from "./billing.types";

export const billingApi = {
  async getMySubscription(): Promise<SubscriptionDto | null> {
    const { data } = await apiClient.get<SubscriptionDto | null>(
      "/api/billing/subscriptions/me",
    );
    return data;
  },

  async listActivePlans(): Promise<PlanDto[]> {
    const { data } = await apiClient.get<PlanDto[]>("/api/billing/plans");
    return data;
  },

  async listMyBills(): Promise<BillDto[]> {
    const { data } = await apiClient.get<BillDto[]>("/api/billing/bills/me");
    return data;
  },

  async createPixBill(): Promise<BillDto> {
    const { data } = await apiClient.post<BillDto>("/api/billing/bills/pix");
    return data;
  },

  async createCardBill(): Promise<BillDto> {
    const { data } = await apiClient.post<BillDto>("/api/billing/bills/card");
    return data;
  },
};
