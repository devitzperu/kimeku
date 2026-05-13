import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(10000).optional().or(z.literal("")),
})

export type ClientInput = z.infer<typeof clientSchema>
