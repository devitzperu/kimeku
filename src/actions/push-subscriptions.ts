"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { pushSubscriptionSchema, type PushSubscriptionInput } from "@/lib/validations/todo"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export async function subscribePush(input: PushSubscriptionInput): Promise<ActionResult> {
  const user = await requireAuth()
  const parsed = pushSubscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const { endpoint, keys, userAgent } = parsed.data

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
      lastSeen: new Date(),
    },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? null,
    },
  })
  return { ok: true }
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const user = await requireAuth()
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  })
  return { ok: true }
}
