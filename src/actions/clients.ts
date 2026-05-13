"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { clientSchema } from "@/lib/validations/client"
import { indexDoc, removeDoc } from "@/lib/search"

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createClient(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const created = await prisma.client.create({
    data: { name: parsed.data.name, description: parsed.data.description || null },
  })
  revalidatePath("/clientes")
  await indexDoc({
    id: created.id,
    type: "client",
    title: created.name,
    body: created.description ?? "",
    href: `/clientes/${created.id}`,
  })
  redirect("/clientes")
}

export async function updateClient(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  await prisma.client.update({
    where: { id },
    data: { name: parsed.data.name, description: parsed.data.description || null },
  })
  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  await indexDoc({
    id,
    type: "client",
    title: parsed.data.name,
    body: parsed.data.description ?? "",
    href: `/clientes/${id}`,
  })
  redirect(`/clientes/${id}`)
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.client.delete({ where: { id } })
  revalidatePath("/clientes")
  await removeDoc("client", id)
  return { ok: true }
}
