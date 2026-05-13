"use server"

import { prisma } from "@/lib/prisma"
import { requireClientRole } from "@/lib/auth-helpers"
import { loadPortalTodoById, toPortalView, PORTAL_TODO_SELECT } from "@/lib/portal-helpers"
import type { PortalTodoView } from "@/lib/portal-events"

const DAY = 86_400_000

export async function listPortalTodos(): Promise<PortalTodoView[]> {
  const user = await requireClientRole()
  const now = Date.now()
  const past7 = new Date(now - 7 * DAY)
  const future30 = new Date(now + 30 * DAY)
  const past30 = new Date(now - 30 * DAY)

  const rows = await prisma.todo.findMany({
    where: {
      clientId: user.clientId,
      visibleToClient: true,
      status: { not: "CANCELLED" },
      OR: [
        { dueAt: { gte: past7, lte: future30 } },
        { completedAt: { gte: past30 } },
      ],
    },
    select: PORTAL_TODO_SELECT,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { completedAt: "desc" }],
  })

  return rows.map(toPortalView)
}

export async function getPortalTodo(todoId: string): Promise<PortalTodoView | null> {
  const user = await requireClientRole()
  const row = await loadPortalTodoById(todoId, user.clientId)
  if (!row) return null
  return toPortalView(row)
}
