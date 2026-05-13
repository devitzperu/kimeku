import "server-only"

import { prisma } from "@/lib/prisma"
import type { PortalTodoView } from "@/lib/portal-events"

export type TodoRowForPortal = {
  id: string
  title: string
  description: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  dueAt: Date | null
  completedAt: Date | null
  process: {
    title: string
    areas: { area: { name: string } }[]
  } | null
  owner: {
    areaMemberships: { area: { name: string } }[]
  }
}

export function toPortalView(row: TodoRowForPortal): PortalTodoView {
  const areaSet = new Set<string>()
  for (const a of row.owner.areaMemberships) areaSet.add(a.area.name)
  for (const a of row.process?.areas ?? []) areaSet.add(a.area.name)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    processTitle: row.process?.title ?? null,
    areaNames: Array.from(areaSet),
  }
}

export const PORTAL_TODO_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueAt: true,
  completedAt: true,
  process: {
    select: {
      title: true,
      areas: { select: { area: { select: { name: true } } } },
    },
  },
  owner: {
    select: {
      areaMemberships: { select: { area: { select: { name: true } } } },
    },
  },
} as const

export async function loadPortalTodoById(
  todoId: string,
  clientId: string
): Promise<TodoRowForPortal | null> {
  return prisma.todo.findFirst({
    where: {
      id: todoId,
      clientId,
      visibleToClient: true,
    },
    select: PORTAL_TODO_SELECT,
  })
}
