import { z } from "zod";

export const announcementSchema = z.object({
  id: z.string(),
  condominiumId: z.string(),
  title: z.string(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
});

export type AnnouncementResponse = z.infer<typeof announcementSchema>;
