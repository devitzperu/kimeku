import { z } from "zod"

export const createHistorialSchema = z.object({
  title: z.string().min(1).max(200),
  processId: z.string().min(1),
  notes: z.string().max(10000).optional().or(z.literal("")),
})

export const stepCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

export type CreateHistorialInput = z.infer<typeof createHistorialSchema>
