"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth-helpers"
import { walkProcessTree } from "@/lib/process-tree"
import { getSubordinateUserIds, isAncestorOf } from "@/lib/org-hierarchy"
import { expandOccurrences, nextOccurrenceAfter } from "@/lib/todo-recurrence"
import { notify } from "@/lib/portal-events"
import { loadPortalTodoById, toPortalView } from "@/lib/portal-helpers"
import { indexDoc, removeDoc } from "@/lib/search"
import {
  todoSchema,
  quickAddSchema,
  todoPatchSchema,
  type TodoInput,
  type QuickAddInput,
  type TodoPatchInput,
} from "@/lib/validations/todo"
import { Prisma, TodoEventType, type Todo, type TodoTag, type Tag } from "@prisma/client"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

type TodoWithTags = Todo & {
  tags: (TodoTag & { tag: Tag })[]
  client: { id: string; name: string } | null
}

export type TodoView = TodoWithTags & {
  occurrenceDate: Date | null
  isOccurrence: boolean
  clientName: string | null
}

async function loadOwnedOrThrow(id: string, userId: string) {
  const todo = await prisma.todo.findUnique({ where: { id } })
  if (!todo) return { error: "Todo no encontrado" as const, todo: null }
  if (todo.ownerId !== userId) return { error: "Sin permiso" as const, todo: null }
  return { error: null, todo }
}

async function emitUpsert(clientId: string, todoId: string) {
  const row = await loadPortalTodoById(todoId, clientId)
  if (!row) return
  await notify(clientId, { type: "todo:upsert", todo: toPortalView(row) })
}

async function emitDelete(clientId: string, todoId: string) {
  await notify(clientId, { type: "todo:delete", id: todoId })
}

async function logTodoEvent(args: {
  todoId: string
  type: TodoEventType
  actorId: string
  reason?: string | null
  tx?: Prisma.TransactionClient
}) {
  const db = args.tx ?? prisma
  await db.todoEvent.create({
    data: {
      todoId: args.todoId,
      type: args.type,
      actorId: args.actorId,
      reason: args.reason?.trim() ? args.reason.trim() : null,
    },
  })
}

export async function createTodo(input: TodoInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth()
  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const data = parsed.data

  const visible = !!data.visibleToClient
  const clientId = visible ? data.clientId || null : null

  const created = await prisma.todo.create({
    data: {
      ownerId: user.id,
      title: data.title,
      description: data.description || null,
      dueAt: data.dueAt ?? null,
      alarmAt: data.alarmAt ?? null,
      priority: data.priority,
      rrule: data.rrule || null,
      rruleUntil: data.rruleUntil ?? null,
      processId: data.processId || null,
      visibleToClient: visible,
      clientId,
      tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
    },
  })

  await logTodoEvent({ todoId: created.id, type: TodoEventType.CREATED, actorId: user.id })

  if (visible && clientId) await emitUpsert(clientId, created.id)

  revalidatePath("/todos")

  await indexDoc({
    id: created.id,
    type: "todo",
    title: data.title,
    body: data.description ?? "",
    href: `/todos/${created.id}`,
    ownerId: user.id,
    clientId,
    visibleToClient: visible,
  })

  return { ok: true, data: { id: created.id } }
}

export async function quickAddTodo(input: QuickAddInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth()
  const parsed = quickAddSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const created = await prisma.todo.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      dueAt: parsed.data.dueAt ?? null,
    },
  })
  await logTodoEvent({ todoId: created.id, type: TodoEventType.CREATED, actorId: user.id })
  revalidatePath("/todos")

  await indexDoc({
    id: created.id,
    type: "todo",
    title: parsed.data.title,
    body: "",
    href: `/todos/${created.id}`,
    ownerId: user.id,
    clientId: null,
    visibleToClient: false,
  })

  return { ok: true, data: { id: created.id } }
}

export async function updateTodo(id: string, input: TodoInput): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo: existing } = await loadOwnedOrThrow(id, user.id)
  if (error || !existing) return { ok: false, error: error ?? "Todo no encontrado" }

  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const data = parsed.data

  const nextVisible = !!data.visibleToClient
  const nextClientId = nextVisible ? data.clientId || null : null
  const prevVisible = existing.visibleToClient
  const prevClientId = existing.clientId

  await prisma.$transaction(async (tx) => {
    await tx.todo.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        dueAt: data.dueAt ?? null,
        alarmAt: data.alarmAt ?? null,
        priority: data.priority,
        rrule: data.rrule || null,
        rruleUntil: data.rruleUntil ?? null,
        processId: data.processId || null,
        visibleToClient: nextVisible,
        clientId: nextClientId,
        alarmSentAt: null,
        tags: {
          deleteMany: {},
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
    })
  })

  await emitVisibilityChange({
    todoId: id,
    prevVisible,
    prevClientId,
    nextVisible,
    nextClientId,
  })

  revalidatePath("/todos")
  revalidatePath(`/todos/${id}`)

  await indexDoc({
    id,
    type: "todo",
    title: data.title,
    body: data.description ?? "",
    href: `/todos/${id}`,
    ownerId: existing.ownerId,
    clientId: nextClientId,
    visibleToClient: nextVisible,
  })

  return { ok: true }
}

export async function patchTodo(id: string, input: TodoPatchInput): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo: existing } = await loadOwnedOrThrow(id, user.id)
  if (error || !existing) return { ok: false, error: error ?? "Todo no encontrado" }

  const parsed = todoPatchSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const data = parsed.data

  const payload: Prisma.TodoUpdateInput = {}
  if ("title" in data && data.title !== undefined) payload.title = data.title
  if ("description" in data) payload.description = data.description ?? null
  if ("dueAt" in data) payload.dueAt = data.dueAt ?? null
  if ("alarmAt" in data) payload.alarmAt = data.alarmAt ?? null
  if ("priority" in data && data.priority !== undefined) payload.priority = data.priority
  if ("processId" in data) {
    if (data.processId) {
      payload.process = { connect: { id: data.processId } }
    } else {
      payload.process = { disconnect: true }
    }
  }
  const rruleChanged = "rrule" in data
  const rruleUntilChanged = "rruleUntil" in data
  if (rruleChanged) payload.rrule = data.rrule ?? null
  if (rruleUntilChanged) payload.rruleUntil = data.rruleUntil ?? null
  if (rruleChanged || rruleUntilChanged) payload.alarmSentAt = null

  const visibleProvided = "visibleToClient" in data && data.visibleToClient !== undefined
  const clientProvided = "clientId" in data
  const nextVisible = visibleProvided ? !!data.visibleToClient : existing.visibleToClient
  let nextClientId = clientProvided ? data.clientId ?? null : existing.clientId
  if (!nextVisible) nextClientId = null
  if (nextVisible && !nextClientId) {
    return { ok: false, error: "Selecciona un cliente para mostrar esta actividad" }
  }
  if (visibleProvided) payload.visibleToClient = nextVisible
  if (clientProvided || (visibleProvided && !nextVisible)) {
    if (nextClientId) {
      payload.client = { connect: { id: nextClientId } }
    } else {
      payload.client = { disconnect: true }
    }
  }

  await prisma.$transaction(async (tx) => {
    const hasFieldUpdates = Object.keys(payload).length > 0
    if (hasFieldUpdates) {
      await tx.todo.update({ where: { id }, data: payload })
    }
    if ("tagIds" in data && data.tagIds) {
      await tx.todoTag.deleteMany({ where: { todoId: id } })
      if (data.tagIds.length > 0) {
        await tx.todoTag.createMany({
          data: data.tagIds.map((tagId) => ({ todoId: id, tagId })),
        })
      }
    }
  })

  await emitVisibilityChange({
    todoId: id,
    prevVisible: existing.visibleToClient,
    prevClientId: existing.clientId,
    nextVisible,
    nextClientId,
  })

  revalidatePath("/todos")
  revalidatePath(`/todos/${id}`)

  const fresh = await prisma.todo.findUnique({ where: { id } })
  if (fresh) {
    await indexDoc({
      id: fresh.id,
      type: "todo",
      title: fresh.title,
      body: fresh.description ?? "",
      href: `/todos/${fresh.id}`,
      ownerId: fresh.ownerId,
      clientId: fresh.clientId,
      visibleToClient: fresh.visibleToClient,
    })
  }

  return { ok: true }
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo: existing } = await loadOwnedOrThrow(id, user.id)
  if (error || !existing) return { ok: false, error: error ?? "Todo no encontrado" }
  await prisma.todo.delete({ where: { id } })
  if (existing.visibleToClient && existing.clientId) {
    await emitDelete(existing.clientId, id)
  }
  revalidatePath("/todos")
  await removeDoc("todo", id)
  return { ok: true }
}

export async function completeTodo(
  id: string,
  occurrenceDate?: Date,
  reason?: string | null
): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo } = await loadOwnedOrThrow(id, user.id)
  if (error || !todo) return { ok: false, error: error ?? "Todo no encontrado" }

  const now = new Date()
  let eventTargetId = id

  if (todo.rrule && occurrenceDate) {
    const occurrence = await prisma.todo.create({
      data: {
        ownerId: todo.ownerId,
        parentTodoId: todo.id,
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        dueAt: occurrenceDate,
        processId: todo.processId,
        status: "COMPLETED",
        completedAt: now,
        visibleToClient: todo.visibleToClient,
        clientId: todo.clientId,
      },
    })
    eventTargetId = occurrence.id
    await logTodoEvent({ todoId: occurrence.id, type: TodoEventType.CREATED, actorId: user.id })
  } else {
    await prisma.todo.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: now },
    })
  }

  await logTodoEvent({
    todoId: eventTargetId,
    type: TodoEventType.COMPLETED,
    actorId: user.id,
    reason,
  })

  if (todo.visibleToClient && todo.clientId) {
    await emitUpsert(todo.clientId, id)
  }

  revalidatePath("/todos")
  revalidatePath(`/todos/${id}`)
  return { ok: true }
}

export async function startTodo(id: string, reason?: string | null): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo } = await loadOwnedOrThrow(id, user.id)
  if (error || !todo) return { ok: false, error: error ?? "Todo no encontrado" }
  if (todo.status === "COMPLETED") {
    return { ok: false, error: "Actividad ya completada" }
  }
  await prisma.todo.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  })
  await logTodoEvent({ todoId: id, type: TodoEventType.STARTED, actorId: user.id, reason })
  if (todo.visibleToClient && todo.clientId) {
    await emitUpsert(todo.clientId, id)
  }
  revalidatePath("/todos")
  revalidatePath(`/todos/${id}`)
  return { ok: true }
}

export async function pauseTodo(id: string, reason?: string | null): Promise<ActionResult> {
  const user = await requireAuth()
  const { error, todo } = await loadOwnedOrThrow(id, user.id)
  if (error || !todo) return { ok: false, error: error ?? "Todo no encontrado" }
  const wasCompleted = todo.status === "COMPLETED"
  await prisma.todo.update({
    where: { id },
    data: { status: "PENDING", completedAt: null },
  })
  await logTodoEvent({
    todoId: id,
    type: wasCompleted ? TodoEventType.REOPENED : TodoEventType.PAUSED,
    actorId: user.id,
    reason,
  })
  if (todo.visibleToClient && todo.clientId) {
    await emitUpsert(todo.clientId, id)
  }
  revalidatePath("/todos")
  revalidatePath(`/todos/${id}`)
  return { ok: true }
}

export async function reopenTodo(id: string, reason?: string | null): Promise<ActionResult> {
  return pauseTodo(id, reason)
}

export type TodoEventView = {
  id: string
  type: TodoEventType
  actor: { id: string; name: string }
  reason: string | null
  createdAt: Date
}

export async function listTodoEvents(todoId: string): Promise<ActionResult<TodoEventView[]>> {
  const user = await requireAuth()
  const todo = await prisma.todo.findUnique({ where: { id: todoId }, select: { ownerId: true } })
  if (!todo) return { ok: false, error: "Todo no encontrado" }
  if (todo.ownerId !== user.id) {
    const allowed = await isAncestorOf(user.id, todo.ownerId)
    if (!allowed) return { ok: false, error: "Sin permiso" }
  }
  const events = await prisma.todoEvent.findMany({
    where: { todoId },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return {
    ok: true,
    data: events.map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      reason: e.reason,
      createdAt: e.createdAt,
    })),
  }
}

type ListFilter = {
  status?: "PENDING" | "COMPLETED" | "CANCELLED"
  from?: Date
  to?: Date
}

async function fetchTodosForUsers(userIds: string[], filter?: ListFilter): Promise<TodoWithTags[]> {
  if (userIds.length === 0) return []
  return prisma.todo.findMany({
    where: {
      ownerId: { in: userIds },
      ...(filter?.status ? { status: filter.status } : {}),
    },
    include: {
      tags: { include: { tag: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  })
}

function expandTodoList(todos: TodoWithTags[], from: Date, to: Date): TodoView[] {
  const result: TodoView[] = []
  for (const t of todos) {
    const clientName = t.client?.name ?? null
    if (t.rrule) {
      const dates = expandOccurrences(
        { rrule: t.rrule, rruleUntil: t.rruleUntil, dueAt: t.dueAt },
        from,
        to
      )
      for (const d of dates) {
        result.push({ ...t, occurrenceDate: d, isOccurrence: true, clientName })
      }
    } else {
      result.push({ ...t, occurrenceDate: t.dueAt, isOccurrence: false, clientName })
    }
  }
  return result
}

export async function listOwnTodos(filter?: ListFilter): Promise<ActionResult<TodoView[]>> {
  const user = await requireAuth()
  const from = filter?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const to = filter?.to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const rows = await fetchTodosForUsers([user.id], filter)
  return { ok: true, data: expandTodoList(rows, from, to) }
}

export async function listTeamTodos(rootUserId?: string, filter?: ListFilter): Promise<ActionResult<{ userId: string; todos: TodoView[] }[]>> {
  const user = await requireAuth()
  const target = rootUserId ?? user.id

  if (target !== user.id) {
    const allowed = await isAncestorOf(user.id, target)
    if (!allowed) return { ok: false, error: "Sin permiso" }
  }

  const subordinates = await getSubordinateUserIds(target)
  if (subordinates.length === 0) return { ok: true, data: [] }

  const from = filter?.from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const to = filter?.to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const rows = await fetchTodosForUsers(subordinates, filter)

  const grouped = new Map<string, TodoWithTags[]>()
  for (const r of rows) {
    const list = grouped.get(r.ownerId) ?? []
    list.push(r)
    grouped.set(r.ownerId, list)
  }

  return {
    ok: true,
    data: Array.from(grouped.entries()).map(([userId, todos]) => ({
      userId,
      todos: expandTodoList(todos, from, to),
    })),
  }
}

export async function startHistorialFromTodo(todoId: string): Promise<ActionResult<{ historialId: string }>> {
  const user = await requireRole("EDITOR")
  const todo = await prisma.todo.findUnique({ where: { id: todoId } })
  if (!todo) return { ok: false, error: "Todo no encontrado" }
  if (todo.ownerId !== user.id) return { ok: false, error: "Sin permiso" }
  if (!todo.processId) return { ok: false, error: "Todo sin proceso vinculado" }

  const root = await prisma.process.findUnique({ where: { id: todo.processId } })
  if (!root) return { ok: false, error: "Proceso no encontrado" }

  const steps = await walkProcessTree(root.id)
  const created = await prisma.historial.create({
    data: {
      title: todo.title,
      processId: root.id,
      userId: user.id,
      notes: todo.description,
      steps: {
        create: steps.map((s, i) => ({ processId: s.processId, order: i })),
      },
    },
  })

  revalidatePath("/historial")
  revalidatePath(`/todos/${todoId}`)
  return { ok: true, data: { historialId: created.id } }
}

export async function advanceRecurringAlarm(todoId: string): Promise<ActionResult> {
  const todo = await prisma.todo.findUnique({ where: { id: todoId } })
  if (!todo || !todo.rrule) return { ok: false, error: "Sin recurrencia" }

  const next = nextOccurrenceAfter(
    { rrule: todo.rrule, rruleUntil: todo.rruleUntil, dueAt: todo.dueAt },
    new Date()
  )
  await prisma.todo.update({
    where: { id: todoId },
    data: { alarmAt: next, alarmSentAt: null },
  })
  return { ok: true }
}

export async function setTodoVisibility(
  todoId: string,
  visible: boolean,
  clientId: string | null
): Promise<ActionResult> {
  return patchTodo(todoId, { visibleToClient: visible, clientId })
}

export async function listClientsForSelect(): Promise<ActionResult<{ id: string; name: string }[]>> {
  await requireAuth()
  const rows = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return { ok: true, data: rows }
}

type VisibilityArgs = {
  todoId: string
  prevVisible: boolean
  prevClientId: string | null
  nextVisible: boolean
  nextClientId: string | null
}

async function emitVisibilityChange(args: VisibilityArgs) {
  const prevTarget = args.prevVisible && args.prevClientId ? args.prevClientId : null
  const nextTarget = args.nextVisible && args.nextClientId ? args.nextClientId : null

  if (prevTarget && prevTarget !== nextTarget) {
    await emitDelete(prevTarget, args.todoId)
  }
  if (nextTarget) {
    await emitUpsert(nextTarget, args.todoId)
  }
}

