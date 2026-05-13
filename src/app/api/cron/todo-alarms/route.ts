import { NextRequest } from "next/server"
import webpush from "web-push"
import { prisma } from "@/lib/prisma"
import { nextOccurrenceAfter } from "@/lib/todo-recurrence"

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@kimeku.local"

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return Response.json({ error: "VAPID not configured" }, { status: 500 })
  }

  const now = new Date()
  const due = await prisma.todo.findMany({
    where: {
      alarmAt: { lte: now },
      alarmSentAt: null,
      status: "PENDING",
    },
    include: {
      owner: { include: { pushSubscriptions: true } },
    },
    take: 200,
  })

  let sent = 0
  let pruned = 0

  for (const todo of due) {
    const payload = JSON.stringify({
      title: todo.title,
      body: todo.description?.slice(0, 200) ?? "Recordatorio",
      todoId: todo.id,
    })

    for (const sub of todo.owner.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
          pruned++
        }
      }
    }

    if (todo.rrule) {
      const next = nextOccurrenceAfter(
        { rrule: todo.rrule, rruleUntil: todo.rruleUntil, dueAt: todo.dueAt },
        now
      )
      await prisma.todo.update({
        where: { id: todo.id },
        data: { alarmAt: next, alarmSentAt: next ? null : now },
      })
    } else {
      await prisma.todo.update({
        where: { id: todo.id },
        data: { alarmSentAt: now },
      })
    }
  }

  return Response.json({ scanned: due.length, sent, pruned })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
