import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-border bg-elevated px-6 py-16 text-center",
        className
      )}
    >
      <div className="bg-grid bg-grid-mask absolute inset-0 opacity-40 pointer-events-none" aria-hidden />
      <div className="relative space-y-3">
        {icon && (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-fg-muted">
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-xl tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-fg-muted max-w-sm mx-auto">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  )
}
