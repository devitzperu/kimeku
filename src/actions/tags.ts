"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { tagSchema } from "@/lib/validations/tag"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createTag(formData: FormData): Promise<ActionResult> {
  await requireRole("EDITOR")
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || "#c2664a",
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  try {
    await prisma.tag.create({ data: parsed.data })
  } catch {
    return { ok: false, error: "Etiqueta ya existe" }
  }
  revalidatePath("/configuracion/tags")
  return { ok: true }
}

export async function updateTag(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("EDITOR")
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  await prisma.tag.update({ where: { id }, data: parsed.data })
  revalidatePath("/configuracion/tags")
  return { ok: true }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")

  const [processCount, todoCount] = await Promise.all([
    prisma.processTag.count({ where: { tagId: id } }),
    prisma.todoTag.count({ where: { tagId: id } }),
  ])
  const total = processCount + todoCount
  if (total > 0) {
    const parts: string[] = []
    if (processCount > 0) parts.push(`${processCount} proceso${processCount === 1 ? "" : "s"}`)
    if (todoCount > 0) parts.push(`${todoCount} actividad${todoCount === 1 ? "" : "es"}`)
    return { ok: false, error: `Etiqueta en uso por ${parts.join(" y ")}. Quítala de esos elementos primero.` }
  }

  try {
    await prisma.tag.delete({ where: { id } })
  } catch {
    return { ok: false, error: "No se puede eliminar: etiqueta en uso." }
  }
  revalidatePath("/configuracion/tags")
  return { ok: true }
}
