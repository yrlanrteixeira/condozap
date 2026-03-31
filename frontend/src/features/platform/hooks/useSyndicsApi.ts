import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SyndicCondominium {
  id: string;
  condominiumId: string;
  condominium: { id: string; name: string };
}

export interface Syndic {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  condominiums: SyndicCondominium[];
}

export function useSyndics() {
  return useQuery<Syndic[]>({
    queryKey: ["platform", "syndics"],
    queryFn: async () => {
      const response = await api.get("/users/syndics");
      return response.data;
    },
  });
}
