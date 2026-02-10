/**
 * Announcements (Novidades) - types
 */

export interface Announcement {
  id: string;
  condominiumId: string;
  title: string;
  content: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  createdBy: string | null;
}
