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

export type CreateUserInput = z.infer<typeof createUserSchema>
