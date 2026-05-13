"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { areaSchema } from "@/lib/validations/area"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createArea(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = areaSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.area.create({ data: { name: parsed.data.name, description: parsed.data.description || null } })
  revalidatePath("/areas")
  redirect("/areas")
}

export async function updateArea(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = areaSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.area.update({
    where: { id },
    data: { name: parsed.data.name, description: parsed.data.description || null },
  })
  revalidatePath("/areas")
  revalidatePath(`/areas/${id}`)
  redirect(`/areas/${id}`)
}

export async function deleteArea(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.area.delete({ where: { id } })
  revalidatePath("/areas")
  return { ok: true }
}

export type AreaMemberRow = {
  userId: string
  name: string
  email: string
  avatar: string | null
  role: "ADMIN" | "EDITOR" | "VIEWER"
  createdAt: Date
}

export async function listAreaMembers(areaId: string): Promise<AreaMemberRow[]> {
  await requireRole("ADMIN")
  const rows = await prisma.areaMember.findMany({
    where: { areaId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return rows
    .filter((r) => r.user.role !== "CLIENT")
    .map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      avatar: r.user.avatar,
      role: r.user.role as "ADMIN" | "EDITOR" | "VIEWER",
      createdAt: r.createdAt,
    }))
}

export async function listAreaCandidates(
  areaId: string
): Promise<{ id: string; name: string; email: string; avatar: string | null }[]> {
  await requireRole("ADMIN")
  return prisma.user.findMany({
    where: {
      role: { not: "CLIENT" },
      NOT: { areaMemberships: { some: { areaId } } },
    },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
  })
}

export async function addAreaMember(areaId: string, userId: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return { ok: false, error: "Usuario no encontrado" }
  if (user.role === "CLIENT") return { ok: false, error: "No se puede agregar usuario cliente a un área" }

  try {
    await prisma.areaMember.create({ data: { areaId, userId } })
  } catch {
    return { ok: false, error: "Ya pertenece al área" }
  }
  revalidatePath(`/areas/${areaId}`)
  return { ok: true }
}

export async function removeAreaMember(areaId: string, userId: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.areaMember.delete({
    where: { areaId_userId: { areaId, userId } },
  })
  revalidatePath(`/areas/${areaId}`)
  return { ok: true }
}
