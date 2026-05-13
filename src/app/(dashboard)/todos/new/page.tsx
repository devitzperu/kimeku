import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { TodoForm } from "@/components/todos/todo-form"

export default async function NewTodoPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

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
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        ribbon="06 · Nuevo pendiente"
        title="Crear pendiente"
        description="Detalle, recurrencia, alarma y vínculo a proceso."
      />
      <Card>
        <CardContent className="p-6">
          <TodoForm processes={processes} tags={tags} clients={clients} />
        </CardContent>
      </Card>
    </div>
  )
}
