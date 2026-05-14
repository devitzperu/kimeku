"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { changePasswordSchema, createUserSchema, updateUserSchema } from "@/lib/validations/user"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) return { ok: false, error: "Email ya registrado" }

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, password: hashed, role: parsed.data.role },
  })
  revalidatePath("/configuracion/usuarios")
  return { ok: true }
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const data: {
    name: string
    email: string
    role: "ADMIN" | "EDITOR" | "VIEWER"
    password?: string
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
  }
  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10)
  }
  await prisma.user.update({ where: { id }, data })
  revalidatePath("/configuracion/usuarios")
  return { ok: true }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const me = await requireRole("ADMIN")
  if (me.id === id) return { ok: false, error: "No puedes eliminar tu propia cuenta" }
  await prisma.user.delete({ where: { id } })
  revalidatePath("/configuracion/usuarios")
  return { ok: true }
}

export async function changePassword(input: { current: string; next: string }): Promise<ActionResult> {
  const me = await requireAuth()
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { password: true } })
  if (!user?.password) return { ok: false, error: "No hay contraseña configurada" }
  const ok = await bcrypt.compare(parsed.data.current, user.password)
  if (!ok) return { ok: false, error: "Contraseña actual incorrecta" }
  if (parsed.data.current === parsed.data.next) {
    return { ok: false, error: "La nueva contraseña debe ser distinta" }
  }
  const hashed = await bcrypt.hash(parsed.data.next, 10)
  await prisma.user.update({ where: { id: me.id }, data: { password: hashed } })
  return { ok: true }
}
