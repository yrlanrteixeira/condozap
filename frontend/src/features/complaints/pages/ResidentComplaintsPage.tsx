import type { Complaint } from '@/features/complaints/types';
import { ComplaintForm, ComplaintHistoryList } from '../components';
import { useAuth } from '@/shared/hooks/useAuth';

interface ResidentComplaintsPageProps {
  complaints: Complaint[];
  onSubmit: (data: { category: string; content: string }) => void;
}

export function ResidentComplaintsPage({ complaints, onSubmit }: ResidentComplaintsPageProps) {
  const { user } = useAuth();
  const residentId = (user as any)?.residentId;

  // Filter complaints to show only user's own complaints
  const myComplaints = complaints.filter((c) => c.residentId === residentId);

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Central de Denúncias (Anônimo)
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Relate problemas com segurança total. Sua identidade é preservada.
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <ComplaintForm onSubmit={onSubmit} />
      </div>

      <ComplaintHistoryList complaints={myComplaints} />
    </div>
  );
}
