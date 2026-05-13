"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { clientUserSchema, type ClientUserInput } from "@/lib/validations/client-user"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export type ClientUserRow = {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export async function listClientUsers(clientId: string): Promise<ClientUserRow[]> {
  await requireRole("ADMIN")
  return prisma.user.findMany({
    where: { clientId, role: "CLIENT" },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function createClientUser(
  clientId: string,
  input: ClientUserInput
): Promise<ActionResult<{ id: string; email: string; password: string }>> {
  await requireRole("ADMIN")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return { ok: false, error: "Cliente no encontrado" }

  const parsed = clientUserSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { ok: false, error: "Email ya registrado" }

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: "CLIENT",
      clientId,
    },
    select: { id: true, email: true },
  })

  revalidatePath(`/clientes/${clientId}`)
  revalidatePath(`/clientes/${clientId}/usuarios`)
  return { ok: true, data: { id: created.id, email: created.email, password: parsed.data.password } }
}

export async function revokeClientUser(userId: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, clientId: true },
  })
  if (!user) return { ok: false, error: "Usuario no encontrado" }
  if (user.role !== "CLIENT") return { ok: false, error: "No es un usuario cliente" }

  await prisma.user.delete({ where: { id: userId } })
  if (user.clientId) {
    revalidatePath(`/clientes/${user.clientId}`)
    revalidatePath(`/clientes/${user.clientId}/usuarios`)
  }
  return { ok: true }
}

