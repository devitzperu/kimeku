"use client"

import { Workflow, Building2, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { MarkdownView } from "@/components/shared/markdown-view"
import type { PortalTodoView } from "@/lib/portal-events"

type PortalDrawerProps = {
  todo: PortalTodoView | null
  clientCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PortalDrawer({ todo, clientCode, open, onOpenChange }: PortalDrawerProps) {
  const isCompleted = todo?.status === "COMPLETED"
  const isInProgress = todo?.status === "IN_PROGRESS"
  const StatusIcon = isCompleted ? CheckCircle2 : isInProgress ? Loader2 : Clock
  const statusLabel = isCompleted ? "Completada" : isInProgress ? "En curso" : "Pendiente"
  const statusClass = isCompleted ? "text-success" : isInProgress ? "text-warning animate-spin" : "text-accent"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-xl flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {todo ? (
          <>
            <header className="border-b border-border px-6 py-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                ◆ ACTIVIDAD · {new Date().toLocaleDateString("es")}
              </p>
              <SheetTitle className="mt-1.5">{todo.title}</SheetTitle>
            </header>

            <div className="flex-1 space-y-6 px-6 py-6">
              <Field label="Estado">
                <span className="inline-flex items-center gap-2 text-sm">
                  <StatusIcon className={`h-4 w-4 ${statusClass}`} />
                  {statusLabel}
                </span>
              </Field>

              {todo.areaNames.length > 0 && (
                <Field label="Áreas">
                  <div className="flex flex-wrap gap-1.5">
                    {todo.areaNames.map((area) => (
                      <Badge
                        key={area}
                        variant="outline"
                        className="gap-1 font-mono text-[10px] uppercase tracking-wider"
                      >
                        <Building2 className="h-2.5 w-2.5" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                </Field>
              )}

              {todo.processTitle && (
                <Field label="Proceso">
                  <Badge variant="default" className="gap-1 normal-case tracking-normal">
                    <Workflow className="h-3 w-3" />
                    {todo.processTitle}
                  </Badge>
                </Field>
              )}

              {todo.dueAt && !isCompleted && (
                <Field label="Vence">
                  <p className="text-sm">{formatFull(todo.dueAt)}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {relative(todo.dueAt)}
                  </p>
                </Field>
              )}

              {todo.completedAt && isCompleted && (
                <Field label="Cerrada el">
                  <p className="text-sm">{formatFull(todo.completedAt)}</p>
                </Field>
              )}

              {todo.description && (
                <Field label="Descripción">
                  <div className="prose-doc text-sm">
                    <MarkdownView source={todo.description} />
                  </div>
                </Field>
              )}
            </div>

            <footer className="border-t border-border px-6 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                ◆ Solo lectura · {clientCode}
              </p>
            </footer>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">{label}</p>
      <div>{children}</div>
    </div>
  )
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function relative(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.round(diff / 86_400_000)
  if (days === 0) return "hoy"
  if (days === 1) return "mañana"
  if (days > 1) return `en ${days} días`
  if (days === -1) return "ayer"
  return `hace ${Math.abs(days)} días`
}
