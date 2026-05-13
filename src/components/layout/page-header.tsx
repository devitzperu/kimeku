import { cn } from "@/lib/utils"

interface PageHeaderProps {
  ribbon?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ ribbon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="space-y-2 min-w-0">
        {ribbon && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">◆ {ribbon}</p>
        )}
        <h1 className="font-semibold text-2xl md:text-3xl tracking-tight leading-none">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-fg-muted max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
