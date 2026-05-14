"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X, Loader2 } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CreatableOption = { value: string; label: string; color?: string }

interface CreatableMultiSelectProps {
  options: CreatableOption[]
  selected: string[]
  onChange: (vals: string[]) => void
  placeholder?: string
  emptyText?: string
  /** Habilita creación inline cuando query no matchea. */
  canCreate?: boolean
  /** Label del item de creación. Recibe el query actual. Default: `Crear "{query}"`. */
  createLabel?: (query: string) => string
  /**
   * Handler de creación rápida. Recibe el nombre tipeado.
   * Retorna la opción creada (que será auto-seleccionada) o null si falló.
   * Si no se provee y `canCreate` es true, se delega a `onRequestCreate` (modal).
   */
  onCreate?: (name: string) => Promise<CreatableOption | null>
  /**
   * Alternativa: abre un modal externo. Recibe el query pre-rellenado.
   * El consumidor debe agregar la opción nueva al array y seleccionarla.
   */
  onRequestCreate?: (name: string) => void
}

export function CreatableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar…",
  emptyText = "Sin resultados",
  canCreate = false,
  createLabel = (q) => `Crear "${q}"`,
  onCreate,
  onRequestCreate,
}: CreatableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }
  function remove(val: string) {
    onChange(selected.filter((v) => v !== val))
  }

  const trimmed = query.trim()
  const filtered = options.filter((o) => o.label.toLowerCase().includes(trimmed.toLowerCase()))
  const exactMatch = filtered.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())
  const showCreate = canCreate && trimmed.length > 0 && !exactMatch && (onCreate || onRequestCreate)

  async function handleCreate() {
    if (!trimmed) return
    if (onCreate) {
      setCreating(true)
      try {
        const created = await onCreate(trimmed)
        if (created) {
          onChange([...selected, created.value])
          setQuery("")
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error creando")
      } finally {
        setCreating(false)
      }
      return
    }
    if (onRequestCreate) {
      onRequestCreate(trimmed)
      setOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-fg-subtle">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <CommandPrimitive className="flex flex-col">
            <div className="border-b border-border px-3">
              <CommandPrimitive.Input
                placeholder="Buscar…"
                value={query}
                onValueChange={setQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && showCreate && filtered.length === 0) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
                className="h-9 w-full bg-transparent text-sm placeholder:text-fg-subtle focus:outline-none"
              />
            </div>
            <CommandPrimitive.List className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 && !showCreate && (
                <p className="py-6 text-center text-xs text-fg-muted">{emptyText}</p>
              )}
              {filtered.map((o) => {
                const checked = selected.includes(o.value)
                return (
                  <CommandPrimitive.Item
                    key={o.value}
                    value={o.value}
                    onSelect={() => toggle(o.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer",
                      "data-[selected=true]:bg-muted aria-selected:bg-muted",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-border-strong",
                        checked && "bg-accent border-accent text-accent-fg",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    {o.color && (
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
                    )}
                    <span>{o.label}</span>
                  </CommandPrimitive.Item>
                )
              })}
              {showCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className={cn(
                    "mt-1 flex w-full items-center gap-2 rounded-sm border-t border-border px-2 py-2 text-sm",
                    "hover:bg-muted disabled:opacity-60",
                  )}
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-muted" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-accent" />
                  )}
                  <span className="font-medium">{createLabel(trimmed)}</span>
                </button>
              )}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((val) => {
            const opt = options.find((o) => o.value === val)
            if (!opt) return null
            return (
              <Badge
                key={val}
                variant="default"
                className="gap-1.5 normal-case font-sans tracking-normal text-xs py-1"
              >
                {opt.color && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.label}
                <button
                  type="button"
                  onClick={() => remove(val)}
                  className="hover:text-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
