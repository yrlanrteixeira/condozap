import { z } from "zod";

export const structureParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const structureSchema = z.object({
  towers: z.array(
    z.object({
      name: z.string().min(1),
      floors: z.array(z.string().min(1)),
      unitsPerFloor: z.number().int().positive(),
    })
  ),
});

export const updateStructureSchema = z.object({
  structure: structureSchema,
});

export type StructureParams = z.infer<typeof structureParamsSchema>;
export type CondominiumStructure = z.infer<typeof structureSchema>;
export type UpdateStructureBody = z.infer<typeof updateStructureSchema>;

