"use client"

import { Workflow, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PortalTodoView } from "@/lib/portal-events"

type Tone = "pending" | "inprogress" | "completed"

type PortalCardProps = {
  todo: PortalTodoView
  tone: Tone
  highlight?: boolean
  index?: number
  onOpen: () => void
}

const MS_DAY = 86_400_000

export function PortalCard({ todo, tone, highlight, index = 0, onOpen }: PortalCardProps) {
  const isCompleted = tone === "completed"
  const isInProgress = tone === "inprogress"
  const dateLabel = isCompleted
    ? completedLabel(todo.completedAt)
    : dueLabel(todo.dueAt)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group block w-full text-left rounded-md border border-border bg-bg-elevated px-4 py-4 transition-all duration-200 animate-fade-in",
        "hover:border-accent-border hover:bg-bg-muted/40",
        highlight && "ring-2 ring-accent-border ring-offset-2 ring-offset-bg"
      )}
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 font-mono text-lg leading-none",
            isCompleted && "text-success",
            isInProgress && "text-warning animate-pulse-soft",
            !isCompleted && !isInProgress && "text-accent"
          )}
        >
          {isCompleted ? "✓" : isInProgress ? "◐" : "▸"}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <p
            className={cn(
              "text-base font-medium leading-snug",
              isCompleted && "line-through text-fg-muted"
            )}
          >
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-sm text-fg-muted line-clamp-2 leading-relaxed">
              {todo.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {todo.areaNames.slice(0, 2).map((area) => (
              <Badge
                key={area}
                variant="outline"
                className="gap-1 font-mono text-[11px] uppercase tracking-wider"
              >
                <Building2 className="h-3 w-3" />
                {area}
              </Badge>
            ))}
            {todo.processTitle && (
              <Badge
                variant="default"
                className="gap-1 font-mono text-[11px] normal-case tracking-normal"
              >
                <Workflow className="h-3 w-3" />
                {truncate(todo.processTitle, 26)}
              </Badge>
            )}
          </div>
          {dateLabel && (
            <p className={cn(
              "font-mono text-[11px] uppercase tracking-wider",
              dateLabel.tone === "danger" && "text-danger",
              dateLabel.tone === "warning" && "text-warning",
              dateLabel.tone === "muted" && "text-fg-subtle"
            )}>
              ◆ {dateLabel.text}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

type DateLabel = { text: string; tone: "danger" | "warning" | "muted" }

function dueLabel(iso: string | null): DateLabel | null {
  if (!iso) return { text: "sin fecha límite", tone: "muted" }
  const d = new Date(iso)
  const now = Date.now()
  const diff = d.getTime() - now
  const days = Math.round(diff / MS_DAY)
  const fmt = formatDay(d)
  if (diff < 0) return { text: `vencido · ${fmt}`, tone: "danger" }
  if (days <= 2) return { text: `vence ${fmt} · en ${days}d`, tone: "danger" }
  if (days <= 7) return { text: `vence ${fmt} · en ${days}d`, tone: "warning" }
  return { text: `vence ${fmt} · en ${days}d`, tone: "muted" }
}

function completedLabel(iso: string | null): DateLabel | null {
  if (!iso) return null
  return { text: `cerrado ${formatDay(new Date(iso))}`, tone: "muted" }
}

function formatDay(d: Date) {
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" })
}
