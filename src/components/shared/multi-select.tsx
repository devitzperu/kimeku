"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type MultiSelectOption = { value: string; label: string; color?: string }

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (vals: string[]) => void
  placeholder?: string
  emptyText?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar…",
  emptyText = "Sin resultados",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }
  function remove(val: string) {
    onChange(selected.filter((v) => v !== val))
  }

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

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
                className="h-9 w-full bg-transparent text-sm placeholder:text-fg-subtle focus:outline-none"
              />
            </div>
            <CommandPrimitive.List className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 && (
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
                      "data-[selected=true]:bg-muted aria-selected:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-border-strong",
                        checked && "bg-accent border-accent text-accent-fg"
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
              <Badge key={val} variant="default" className="gap-1.5 normal-case font-sans tracking-normal text-xs py-1">
                {opt.color && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                )}
                {opt.label}
                <button type="button" onClick={() => remove(val)} className="hover:text-danger">
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
