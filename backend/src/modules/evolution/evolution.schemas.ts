import { z } from "zod";

export const sendTextSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
});

export const checkNumbersSchema = z.object({
  numbers: z.array(z.string().min(1)),
});

export type SendTextSchema = z.infer<typeof sendTextSchema>;
export type CheckNumbersSchema = z.infer<typeof checkNumbersSchema>;

