import { z } from "zod"

export const tagSchema = z.object({
  name: z
    .string()
    .min(1, "Nombre requerido")
    .max(40)
    .regex(/^[a-z0-9-_]+$/i, "Solo letras, números, guion y guion bajo")
    .transform((v) => v.toLowerCase()),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido (#rrggbb)"),
})

export type TagInput = z.infer<typeof tagSchema>
