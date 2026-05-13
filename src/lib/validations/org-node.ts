import { z } from "zod"

export const orgNodeSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().max(150).optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
})

export type OrgNodeInput = z.infer<typeof orgNodeSchema>
