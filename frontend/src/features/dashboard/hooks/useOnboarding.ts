import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface OnboardingSteps {
  structureConfigured: boolean;
  sectorCreated: boolean;
  residentCreated: boolean;
  messageSent: boolean;
  complaintHandled: boolean;
}

export interface OnboardingData {
  completed: boolean;
  steps: OnboardingSteps;
}

export function useOnboarding(condominiumId: string) {
  return useQuery<OnboardingData>({
    queryKey: ["onboarding", condominiumId],
    queryFn: async () => {
      const { data } = await api.get(
        `/condominiums/${condominiumId}/onboarding`
      );
      return data;
    },
    enabled: !!condominiumId,
    staleTime: 300_000,
  });
}
