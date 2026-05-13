import { z } from "zod"

export const areaSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(10000).optional().or(z.literal("")),
})

export type AreaInput = z.infer<typeof areaSchema>
