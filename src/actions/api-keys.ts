"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { generateApiKey, hashApiKey, SCOPES, type Scope } from "@/lib/api-key"

export type CreateKeyResult =
  | { ok: true; plaintext: string; prefix: string; id: string }
  | { ok: false; error: string }

export async function createApiKey(input: {
  name: string
  scopes: string[]
  expiresInDays?: number | null
}): Promise<CreateKeyResult> {
  const user = await requireRole("ADMIN")
  if (!input.name?.trim()) return { ok: false, error: "Nombre requerido" }

  const validScopes = input.scopes.filter((s): s is Scope => (SCOPES as readonly string[]).includes(s))
  if (!validScopes.length) return { ok: false, error: "Selecciona al menos un permiso" }

  const { plaintext, prefix } = generateApiKey()
  const hashed = await hashApiKey(plaintext)
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000)
    : null

  const created = await prisma.apiKey.create({
    data: {
      name: input.name.trim().slice(0, 100),
      prefix,
      hashedKey: hashed,
      userId: user.id,
      scopes: validScopes,
      expiresAt,
    },
  })

  revalidatePath("/configuracion/api-keys")
  return { ok: true, plaintext, prefix, id: created.id }
}

export async function revokeApiKey(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireRole("ADMIN")
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key) return { ok: false, error: "No encontrada" }
  if (key.userId !== user.id && user.role !== "ADMIN") return { ok: false, error: "Sin permiso" }

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } })
  revalidatePath("/configuracion/api-keys")
  return { ok: true }
}

export async function deleteApiKey(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireRole("ADMIN")
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key) return { ok: false, error: "No encontrada" }
  if (key.userId !== user.id && user.role !== "ADMIN") return { ok: false, error: "Sin permiso" }
  await prisma.apiKey.delete({ where: { id } })
  revalidatePath("/configuracion/api-keys")
  return { ok: true }
}
