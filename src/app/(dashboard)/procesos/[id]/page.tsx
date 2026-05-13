import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Plus,
  History,
  Layers,
  Code2,
  FileText,
  Building2,
  Users,
  Tag as TagIcon,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownView } from "@/components/shared/markdown-view"
import { DeleteProcessButton } from "@/components/processes/delete-process-button"
import { formatDate } from "@/lib/utils"
import { getProcessCodeBlocks } from "@/actions/processes"

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")
  const canDelete = hasRole(session?.user.role, "ADMIN")

  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, title: true } },
      children: {
        select: {
          id: true,
          title: true,
          version: true,
          _count: { select: { children: true } },
        },
        orderBy: { order: "asc" },
      },
      areas: { include: { area: true } },
      clients: { include: { client: true } },
      tags: { include: { tag: true } },
      attachments: true,
      repoBinding: true,
      _count: { select: { versions: true } },
    },
  })

  if (!process) notFound()

  const code = await getProcessCodeBlocks(id, {
    fresh: true,
    userId: session?.user?.id,
  })

  const breadcrumb: { id: string; title: string }[] = []
  let cur = process.parent
  while (cur) {
    breadcrumb.unshift({ id: cur.id, title: cur.title })
    const parentRow = await prisma.process.findUnique({
      where: { id: cur.id },
      select: { parent: { select: { id: true, title: true } } },
    })
    cur = parentRow?.parent ?? null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-1 text-xs">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/procesos">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px] uppercase tracking-wider">Procesos</span>
          </Link>
        </Button>
        {breadcrumb.map((b) => (
          <span key={b.id} className="flex items-center gap-1">
            <span className="text-fg-subtle">/</span>
            <Link
              href={`/procesos/${b.id}`}
              className="text-fg-muted hover:text-accent font-mono text-[11px] uppercase tracking-wider"
            >
              {b.title}
            </Link>
          </span>
        ))}
      </div>

      <PageHeader
        ribbon={`02 · v${process.version} · actualizado ${formatDate(process.updatedAt)}`}
        title={process.title}
        actions={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/procesos/${process.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {process._count.versions > 0 && (
              <Button asChild variant="ghost">
                <Link href={`/procesos/${process.id}/versions`}>
                  <History className="h-4 w-4" />
                  Versiones
                </Link>
              </Button>
            )}
            {canDelete && <DeleteProcessButton id={process.id} />}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Descripción
              </p>
              <MarkdownView source={process.description ?? ""} />
            </CardContent>
          </Card>

          {code.blocks.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                    <Code2 className="h-3 w-3" />
                    Código
                    {code.bindingActive && process.repoBinding && (
                      <span className="text-fg-subtle">
                        · {process.repoBinding.provider.toLowerCase()}:{process.repoBinding.repoFullName}@
                        {process.repoBinding.defaultBranch}
                      </span>
                    )}
                  </p>
                </div>
                {code.staleProvider && (
                  <p className="rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning">
                    Mostrando última copia conocida. El proveedor Git no respondió o no tienes la cuenta conectada.
                  </p>
                )}
                {code.blocks.map((cb) => (
                  <div key={cb.id} className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="accent" className="font-mono normal-case tracking-normal">
                        {cb.language}
                      </Badge>
                      {cb.description && (
                        <span className="text-xs text-fg-muted">{cb.description}</span>
                      )}
                      {cb.path && (
                        <Badge variant="outline" className="font-mono normal-case tracking-normal">
                          {cb.path}
                        </Badge>
                      )}
                      {cb.lastCommitSha && (
                        <Badge variant="default" className="font-mono normal-case tracking-normal">
                          {cb.lastCommitSha.slice(0, 7)}
                        </Badge>
                      )}
                      {cb.webUrl && (
                        <a
                          href={cb.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-wider font-mono text-accent hover:underline"
                        >
                          ver en provider →
                        </a>
                      )}
                    </div>
                    <pre className="rounded-md border border-border bg-bg-muted p-4 text-xs overflow-x-auto">
                      <code className="font-mono">{cb.code}</code>
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {process.children.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                    <Layers className="h-3 w-3" />
                    Sub-procesos · {process.children.length}
                  </p>
                  {canEdit && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/procesos/new?parentId=${process.id}`}>
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </Link>
                    </Button>
                  )}
                </div>
                <ul className="divide-y divide-border">
                  {process.children.map((c, i) => (
                    <li key={c.id}>
                      <Link
                        href={`/procesos/${c.id}`}
                        className="flex items-center gap-3 py-3 group hover:bg-subtle -mx-2 px-2 rounded-md transition-colors"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle w-6">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-sm group-hover:text-accent transition-colors">
                          {c.title}
                        </span>
                        {c._count.children > 0 && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                            {c._count.children} sub
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          v{c.version}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {process.attachments.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Archivos · {process.attachments.length}
                </p>
                <ul className="space-y-1">
                  {process.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-accent-border hover:text-accent transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-fg-muted" />
                        <span className="flex-1 truncate">{a.filename}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          {humanSize(a.size)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              {process.tags.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <TagIcon className="h-3 w-3" />
                    Etiquetas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {process.tags.map((t) => (
                      <Badge
                        key={t.tagId}
                        variant="default"
                        className="gap-1 normal-case font-sans tracking-normal text-xs"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: t.tag.color }}
                        />
                        {t.tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {process.areas.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Áreas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {process.areas.map((a) => (
                      <Link key={a.areaId} href={`/areas/${a.areaId}`}>
                        <Badge
                          variant="outline"
                          className="hover:border-accent-border hover:text-accent transition-colors normal-case font-sans tracking-normal text-xs"
                        >
                          {a.area.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {process.clients.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Clientes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {process.clients.map((c) => (
                      <Link key={c.clientId} href={`/clientes/${c.clientId}`}>
                        <Badge
                          variant="outline"
                          className="hover:border-accent-border hover:text-accent transition-colors normal-case font-sans tracking-normal text-xs"
                        >
                          {c.client.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="bg-grid bg-grid-mask absolute inset-0 opacity-30" aria-hidden />
            <CardContent className="relative p-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                Acciones
              </p>
              <Button asChild variant="default" size="sm" className="w-full justify-start">
                <Link href={`/historial/new?processId=${process.id}`}>
                  Iniciar ejecución
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/bitacora/new?processId=${process.id}`}>
                  Nueva bitácora
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/flows/new?processId=${process.id}`}>
                  Crear flujo
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
