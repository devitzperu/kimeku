import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAncestorOf } from "@/lib/org-hierarchy"
import { TodoDrawer } from "@/components/todos/todo-drawer"

export const dynamic = "force-dynamic"

export default async function TodoIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const todo = await prisma.todo.findUnique({
    where: { id },
    include: {
      tags: true,
      process: { select: { id: true, title: true } },
      owner: { select: { id: true, name: true } },
    },
  })
  if (!todo) notFound()

  const isOwner = todo.ownerId === session.user.id
  if (!isOwner) {
    const allowed = await isAncestorOf(session.user.id, todo.ownerId)
    if (!allowed) redirect("/todos")
  }

  const [processes, tags, clients] = await Promise.all([
    prisma.process.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.tag.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <TodoDrawer
      initial={{
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueAt: todo.dueAt,
        alarmAt: todo.alarmAt,
        priority: todo.priority,
        rrule: todo.rrule,
        rruleUntil: todo.rruleUntil,
        processId: todo.processId,
        tagIds: todo.tags.map((t) => t.tagId),
        process: todo.process,
        owner: { id: todo.owner.id, name: todo.owner.name },
        status: todo.status,
        visibleToClient: todo.visibleToClient,
        clientId: todo.clientId,
      }}
      processes={processes}
      tags={tags}
      clients={clients}
      readOnly={!isOwner}
    />
  )
}
