"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { orgNodeSchema, type OrgNodeInput } from "@/lib/validations/org-node"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createOrgNode(input: OrgNodeInput): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = orgNodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.orgNode.create({
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      parentId: parsed.data.parentId ?? null,
      userId: parsed.data.userId ?? null,
    },
  })
  revalidatePath("/organigrama")
  return { ok: true }
}

export async function updateOrgNode(id: string, input: OrgNodeInput): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = orgNodeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.orgNode.update({
    where: { id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      parentId: parsed.data.parentId ?? null,
      userId: parsed.data.userId ?? null,
    },
  })
  revalidatePath("/organigrama")
  return { ok: true }
}

export async function deleteOrgNode(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.orgNode.delete({ where: { id } })
  revalidatePath("/organigrama")
  return { ok: true }
}
