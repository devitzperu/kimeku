import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlowEditor } from "@/components/flows/flow-editor"

export default async function FlowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const flow = await prisma.flowDefinition.findUnique({
    where: { id },
    include: {
      process: { select: { id: true, title: true } },
      _count: { select: { executions: true } },
    },
  })
  if (!flow) notFound()

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/flows">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="font-mono text-[11px] uppercase tracking-wider">Flujos</span>
            </Link>
          </Button>
          <span className="text-fg-subtle">/</span>
          <Link
            href={`/procesos/${flow.process.id}`}
            className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-accent"
          >
            {flow.process.title}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={flow.active ? "success" : "default"}>
            {flow.active ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant="default">v{flow.version}</Badge>
          <Badge variant="default">{flow._count.executions} ejec.</Badge>
        </div>
      </div>

      <h1 className="font-semibold text-xl tracking-tight">{flow.name}</h1>

      <FlowEditor
        flowId={flow.id}
        initialName={flow.name}
        initialNodes={flow.nodes as never}
        initialEdges={flow.edges as never}
        initialTriggers={flow.triggers as never}
        canEdit={canEdit}
      />
    </div>
  )
}
