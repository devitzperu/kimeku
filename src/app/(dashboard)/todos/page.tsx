import { ListTodo } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSubordinateUserIds } from "@/lib/org-hierarchy"
import { expandOccurrences } from "@/lib/todo-recurrence"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TodoQuickAdd } from "@/components/todos/todo-quick-add"
import { TodoList } from "@/components/todos/todo-list"
import { TeamTodoView } from "@/components/todos/team-todo-view"
import { PushPermissionPrompt } from "@/components/todos/push-permission-prompt"
import { TodoAlarmListener } from "@/components/todos/todo-alarm-listener"
import { TodosActions } from "@/components/todos/todos-actions"
import type { TodoItemView } from "@/components/todos/todo-item"

export const dynamic = "force-dynamic"

type TodoRow = Awaited<ReturnType<typeof fetchOwn>>[number]

async function fetchOwn(userId: string) {
  return prisma.todo.findMany({
    where: { ownerId: userId },
    include: { tags: { include: { tag: true } }, client: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  })
}

async function fetchTeam(userIds: string[]) {
  if (userIds.length === 0) return []
  return prisma.todo.findMany({
    where: { ownerId: { in: userIds } },
    include: {
      tags: { include: { tag: true } },
      owner: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  })
}

function expand(rows: TodoRow[], from: Date, to: Date): TodoItemView[] {
  const result: TodoItemView[] = []
  for (const t of rows) {
    if (t.rrule && t.status === "PENDING") {
      const dates = expandOccurrences(
        { rrule: t.rrule, rruleUntil: t.rruleUntil, dueAt: t.dueAt },
        from,
        to
      )
      for (const d of dates) {
        result.push(toView(t, d, true))
      }
    } else {
      result.push(toView(t, t.dueAt, false))
    }
  }
  return result
}

function toView(t: TodoRow, occurrenceDate: Date | null, isOccurrence: boolean): TodoItemView {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    alarmAt: t.alarmAt,
    rrule: t.rrule,
    processId: t.processId,
    occurrenceDate,
    isOccurrence,
    tags: t.tags,
    visibleToClient: t.visibleToClient,
    clientId: t.clientId,
    clientName: t.client?.name ?? null,
  }
}

export default async function TodosPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const subordinates = await getSubordinateUserIds(session.user.id)
  const showTeam = subordinates.length > 0

  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [own, team] = await Promise.all([
    fetchOwn(session.user.id),
    showTeam ? fetchTeam(subordinates) : Promise.resolve([]),
  ])

  const ownView = expand(own, from, to)
  const teamGrouped = (() => {
    if (!team.length) return []
    const map = new Map<string, { user: { id: string; name: string }; rows: TodoRow[] }>()
    for (const r of team as (TodoRow & { owner: { id: string; name: string } })[]) {
      const g = map.get(r.ownerId) ?? { user: r.owner, rows: [] }
      g.rows.push(r)
      map.set(r.ownerId, g)
    }
    return Array.from(map.values()).map((g) => ({
      user: g.user,
      todos: expand(g.rows, from, to),
    }))
  })()

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`06 · ${ownView.filter((t) => t.status === "PENDING").length} actividades`}
        title="Actividades"
        description="Diario corporativo. Lo que tienes que hacer hoy, alarmas y procesos vinculados."
        actions={<TodosActions />}
      />

      <PushPermissionPrompt />
      <TodoAlarmListener />

      <TodoQuickAdd />

      {showTeam ? (
        <Tabs defaultValue="own">
          <TabsList>
            <TabsTrigger value="own">Mis actividades</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
          </TabsList>
          <TabsContent value="own" className="mt-4">
            {ownView.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="Sin actividades"
                description="Agrega uno arriba o crea uno con detalle."
              />
            ) : (
              <TodoList todos={ownView} />
            )}
          </TabsContent>
          <TabsContent value="team" className="mt-4">
            <TeamTodoView groups={teamGrouped} />
          </TabsContent>
        </Tabs>
      ) : ownView.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-5 w-5" />}
          title="Sin actividades"
          description="Agrega uno arriba o crea uno con detalle."
        />
      ) : (
        <TodoList todos={ownView} />
      )}
    </div>
  )
}
