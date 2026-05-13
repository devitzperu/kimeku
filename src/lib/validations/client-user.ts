import { z } from "zod"

export const clientUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(120),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
})

export type ClientUserInput = z.infer<typeof clientUserSchema>
