"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole, requireAuth } from "@/lib/auth-helpers"
import { walkProcessTree } from "@/lib/process-tree"
import {
  createHistorialSchema,
  stepCommentSchema,
  type CreateHistorialInput,
} from "@/lib/validations/historial"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export async function createHistorial(input: CreateHistorialInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")
  const parsed = createHistorialSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const root = await prisma.process.findUnique({ where: { id: parsed.data.processId } })
  if (!root) return { ok: false, error: "Proceso no encontrado" }

  const steps = await walkProcessTree(root.id)

  const created = await prisma.historial.create({
    data: {
      title: parsed.data.title,
      processId: parsed.data.processId,
      userId: user.id,
      notes: parsed.data.notes || null,
      steps: {
        create: steps.map((s, i) => ({
          processId: s.processId,
          order: i,
        })),
      },
    },
  })

  revalidatePath("/historial")
  return { ok: true, data: { id: created.id } }
}

export async function startHistorial(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  await prisma.historial.update({
    where: { id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  })
  revalidatePath(`/historial/${id}`)
  return { ok: true }
}

export async function finishHistorial(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  await prisma.historial.update({
    where: { id },
    data: { status: "COMPLETED", finishedAt: new Date() },
  })
  revalidatePath(`/historial/${id}`)
  return { ok: true }
}

export async function cancelHistorial(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  await prisma.historial.update({
    where: { id },
    data: { status: "CANCELLED", finishedAt: new Date() },
  })
  revalidatePath(`/historial/${id}`)
  return { ok: true }
}

export async function startStep(stepId: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  const step = await prisma.historialStep.update({
    where: { id: stepId },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
    select: { historialId: true },
  })
  await prisma.historial.update({
    where: { id: step.historialId },
    data: { status: "IN_PROGRESS", startedAt: { set: undefined } },
  })
  // Set startedAt only if null
  await prisma.historial.updateMany({
    where: { id: step.historialId, startedAt: null },
    data: { startedAt: new Date() },
  })
  revalidatePath(`/historial/${step.historialId}`)
  return { ok: true }
}

export async function finishStep(stepId: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  const step = await prisma.historialStep.update({
    where: { id: stepId },
    data: { status: "COMPLETED", finishedAt: new Date() },
    select: { historialId: true },
  })
  revalidatePath(`/historial/${step.historialId}`)
  return { ok: true }
}

export async function skipStep(stepId: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  const step = await prisma.historialStep.update({
    where: { id: stepId },
    data: { status: "SKIPPED", finishedAt: new Date() },
    select: { historialId: true },
  })
  revalidatePath(`/historial/${step.historialId}`)
  return { ok: true }
}

export async function addStepComment(stepId: string, content: string): Promise<ActionResult> {
  const user = await requireAuth()
  const parsed = stepCommentSchema.safeParse({ content })
  if (!parsed.success) return { ok: false, error: "Comentario inválido" }

  const step = await prisma.historialStep.findUnique({
    where: { id: stepId },
    select: { historialId: true },
  })
  if (!step) return { ok: false, error: "Step no encontrado" }

  await prisma.historialStepComment.create({
    data: { stepId, userId: user.id, content: parsed.data.content },
  })
  revalidatePath(`/historial/${step.historialId}`)
  return { ok: true }
}

export async function attachToStep(
  stepId: string,
  file: { filename: string; path: string; mimeType: string; size: number }
): Promise<ActionResult> {
  await requireAuth()
  const step = await prisma.historialStep.findUnique({
    where: { id: stepId },
    select: { historialId: true },
  })
  if (!step) return { ok: false, error: "Step no encontrado" }

  await prisma.attachment.create({
    data: { historialStepId: stepId, ...file },
  })
  revalidatePath(`/historial/${step.historialId}`)
  return { ok: true }
}

export async function deleteHistorial(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.historial.delete({ where: { id } })
  revalidatePath("/historial")
  return { ok: true }
}
