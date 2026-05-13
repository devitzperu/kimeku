"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { flowDefinitionSchema, type FlowDefinitionInput } from "@/lib/validations/flow"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export async function createFlow(input: FlowDefinitionInput): Promise<ActionResult<{ id: string }>> {
  await requireRole("EDITOR")
  const parsed = flowDefinitionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  if (!parsed.data.processId) return { ok: false, error: "processId requerido" }

  const created = await prisma.flowDefinition.create({
    data: {
      processId: parsed.data.processId,
      name: parsed.data.name,
      nodes: parsed.data.nodes as never,
      edges: parsed.data.edges as never,
      triggers: parsed.data.triggers as never,
    },
  })

  revalidatePath("/flows")
  return { ok: true, data: { id: created.id } }
}

export async function updateFlow(id: string, input: FlowDefinitionInput): Promise<ActionResult> {
  await requireRole("EDITOR")
  const parsed = flowDefinitionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.flowDefinition.update({
    where: { id },
    data: {
      name: parsed.data.name,
      nodes: parsed.data.nodes as never,
      edges: parsed.data.edges as never,
      triggers: parsed.data.triggers as never,
      version: { increment: 1 },
    },
  })

  revalidatePath("/flows")
  revalidatePath(`/flows/${id}`)
  return { ok: true }
}

export async function deleteFlow(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.flowDefinition.delete({ where: { id } })
  revalidatePath("/flows")
  return { ok: true }
}

export async function toggleFlow(id: string, active: boolean): Promise<ActionResult> {
  await requireRole("EDITOR")
  await prisma.flowDefinition.update({ where: { id }, data: { active } })
  revalidatePath("/flows")
  return { ok: true }
}
