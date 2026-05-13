"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { bitacoraSchema, type BitacoraInput } from "@/lib/validations/bitacora"
import { indexDoc, removeDoc } from "@/lib/search"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export async function createBitacora(input: BitacoraInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")
  const parsed = bitacoraSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const created = await prisma.bitacora.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      userId: user.id,
      processes: { create: parsed.data.processIds.map((processId) => ({ processId })) },
      attachments: {
        create: parsed.data.attachments.map((a) => ({
          filename: a.filename,
          path: a.path,
          mimeType: a.mimeType,
          size: a.size,
        })),
      },
    },
  })

  revalidatePath("/bitacora")

  await indexDoc({
    id: created.id,
    type: "bitacora",
    title: parsed.data.title,
    body: parsed.data.description ?? "",
    href: `/bitacora/${created.id}`,
  })

  return { ok: true, data: { id: created.id } }
}

export async function updateBitacora(id: string, input: BitacoraInput): Promise<ActionResult> {
  await requireRole("EDITOR")
  const parsed = bitacoraSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const data = parsed.data

  await prisma.$transaction(async (tx) => {
    const existing = await tx.bitacora.findUnique({
      where: { id },
      include: { processes: true, attachments: true },
    })
    if (!existing) throw new Error("Bitácora no encontrada")

    await tx.bitacoraVersion.create({
      data: {
        bitacoraId: id,
        version: existing.version,
        data: {
          title: existing.title,
          description: existing.description,
          processes: existing.processes,
          attachments: existing.attachments,
        },
      },
    })

    await tx.bitacora.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        version: { increment: 1 },
        processes: {
          deleteMany: {},
          create: data.processIds.map((processId) => ({ processId })),
        },
      },
    })

    await tx.attachment.deleteMany({ where: { bitacoraId: id } })
    if (data.attachments.length) {
      await tx.attachment.createMany({
        data: data.attachments.map((a) => ({
          bitacoraId: id,
          filename: a.filename,
          path: a.path,
          mimeType: a.mimeType,
          size: a.size,
        })),
      })
    }
  })

  revalidatePath("/bitacora")
  revalidatePath(`/bitacora/${id}`)

  await indexDoc({
    id,
    type: "bitacora",
    title: data.title,
    body: data.description ?? "",
    href: `/bitacora/${id}`,
  })

  return { ok: true }
}

export async function deleteBitacora(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.bitacora.delete({ where: { id } })
  revalidatePath("/bitacora")
  await removeDoc("bitacora", id)
  return { ok: true }
}
