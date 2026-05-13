import Link from "next/link"
import { Layers, BookOpen, Clock, Workflow, ArrowUpRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

export default async function DashboardHome() {
  const session = await auth()

  const [processCount, bitacoraCount, historialCount, flowCount, recentProcesses] = await Promise.all([
    prisma.process.count(),
    prisma.bitacora.count(),
    prisma.historial.count(),
    prisma.flowDefinition.count(),
    prisma.process.findMany({
      where: { parentId: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { children: true } },
        tags: { include: { tag: true } },
      },
    }),
  ])

  const stats = [
    { label: "Procesos", value: processCount, href: "/procesos", icon: Layers },
    { label: "Bitácora", value: bitacoraCount, href: "/bitacora", icon: BookOpen },
    { label: "Historiales", value: historialCount, href: "/historial", icon: Clock },
    { label: "Flujos", value: flowCount, href: "/flows", icon: Workflow },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        ribbon="00 · Inicio"
        title={`${greeting}, ${session?.user?.name?.split(" ")[0] ?? "explorador"}`}
        description="Documentación viva de procesos, bitácora de operaciones y línea de tiempo de ejecución."
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="group hover:border-accent-border transition-colors h-full">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <s.icon className="h-4 w-4 text-fg-subtle group-hover:text-accent transition-colors" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-fg-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <div>
                  <p className="font-semibold text-2xl leading-none">{s.value}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                    {s.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Procesos recientes</CardTitle>
              <CardDescription className="mt-1">Últimos 5 procesos raíz actualizados</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/procesos">
                Ver todos
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProcesses.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">
                Aún no hay procesos. <Link href="/procesos" className="text-accent underline-offset-4 hover:underline">Crear el primero</Link>.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentProcesses.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/procesos/${p.id}`}
                      className="flex items-center justify-between gap-4 py-3 group"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-medium truncate group-hover:text-accent">
                          {p.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                            v{p.version}
                          </span>
                          <span className="text-fg-subtle">·</span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                            {p._count.children} sub-procesos
                          </span>
                          <span className="text-fg-subtle">·</span>
                          <span className="text-fg-subtle">{formatDate(p.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.tags.slice(0, 2).map((t) => (
                          <Badge key={t.tagId} variant="default">
                            {t.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="bg-grid bg-grid-mask absolute inset-0 opacity-30 pointer-events-none" aria-hidden />
          <CardHeader className="relative">
            <CardTitle>Atajos</CardTitle>
            <CardDescription className="mt-1">Acciones rápidas</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-2">
            <Button asChild variant="default" className="w-full justify-between">
              <Link href="/procesos/new">
                Nuevo proceso
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/bitacora/new">
                Nueva entrada bitácora
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/historial/new">
                Iniciar ejecución
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
