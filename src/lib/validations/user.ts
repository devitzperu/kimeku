import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
})

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Ingresa tu contraseña actual"),
  next: z.string().min(8, "Mínimo 8 caracteres").max(100),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
