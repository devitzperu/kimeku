import { z } from "zod"

export const bitacoraSchema = z.object({
  title: z.string().min(1, "Título requerido").max(200),
  description: z.string().max(50000).optional().or(z.literal("")),
  processIds: z.array(z.string()).default([]),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        path: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })
    )
    .default([]),
})

export type BitacoraInput = z.infer<typeof bitacoraSchema>
