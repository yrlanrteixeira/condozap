import { useState, useMemo } from 'react';
import type { Complaint } from '@/features/complaints/types';
import { ComplaintForm, ComplaintHistoryList, ResidentComplaintDetailSheet } from '../components';
import { useAuth } from '@/shared/hooks/useAuth';
import { useAnnouncements, AnnouncementsCarousel } from '@/features/announcements';

interface ResidentComplaintsPageProps {
  complaints: Complaint[];
  onSubmit: (data: { category: string; content: string }) => void;
  condominiumId: string;
}

export function ResidentComplaintsPage({ complaints, onSubmit, condominiumId }: ResidentComplaintsPageProps) {
  const { user } = useAuth();
  const residentId = user?.residentId;
  const { data: announcements = [] } = useAnnouncements(condominiumId);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

  // Filter complaints to show only user's own complaints
  const myComplaints = complaints.filter((c) => c.residentId === residentId);

  // Sort: open complaints first, then by newest createdAt
  const sortedComplaints = useMemo(() => {
    const closedStatuses = ["RESOLVED", "CLOSED", "CANCELLED"];
    return [...myComplaints].sort((a, b) => {
      const aIsOpen = !closedStatuses.includes(a.status);
      const bIsOpen = !closedStatuses.includes(b.status);
      if (aIsOpen !== bIsOpen) return aIsOpen ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [myComplaints]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Carousel de novidades da semana */}
      {condominiumId && (
        <div className="mb-6 sm:mb-8">
          <AnnouncementsCarousel announcements={announcements} />
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Central de Denuncias (Anonimo)
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Relate problemas com seguranca total. Sua identidade e preservada.
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <ComplaintForm onSubmit={onSubmit} />
      </div>

      <ComplaintHistoryList
        complaints={sortedComplaints}
        onComplaintClick={(complaint) => setSelectedComplaintId(complaint.id)}
      />

      <ResidentComplaintDetailSheet
        complaintId={selectedComplaintId}
        open={selectedComplaintId !== null}
        onOpenChange={(open) => { if (!open) setSelectedComplaintId(null); }}
      />
    </div>
  );
}
