"use client"

import * as React from "react"
import { rrulestr } from "rrule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Preset = { label: string; value: string | null }

const PRESETS: Preset[] = [
  { label: "Sin recurrencia", value: null },
  { label: "Diario", value: "FREQ=DAILY" },
  { label: "Días hábiles", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Semanal", value: "FREQ=WEEKLY" },
  { label: "Mensual", value: "FREQ=MONTHLY" },
]

interface RecurrencePickerProps {
  value: string | null
  onChange: (rrule: string | null) => void
  rruleUntil: Date | null
  onRruleUntilChange: (d: Date | null) => void
}

export function RecurrencePicker({ value, onChange, rruleUntil, onRruleUntilChange }: RecurrencePickerProps) {
  const [custom, setCustom] = React.useState(value ?? "")
  const [mode, setMode] = React.useState<"preset" | "custom">(() => {
    if (!value) return "preset"
    return PRESETS.some((p) => p.value === value) ? "preset" : "custom"
  })

  const preview = React.useMemo(() => {
    if (!value) return "No se repite"
    try {
      return rrulestr(value).toText()
    } catch {
      return "RRULE inválido"
    }
  }, [value])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = mode === "preset" && (value ?? null) === p.value
          return (
            <Button
              key={p.label}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => {
                setMode("preset")
                onChange(p.value)
              }}
            >
              {p.label}
            </Button>
          )
        })}
        <Button
          type="button"
          size="sm"
          variant={mode === "custom" ? "default" : "outline"}
          onClick={() => setMode("custom")}
        >
          Personalizado…
        </Button>
      </div>

      {mode === "custom" && (
        <div className="space-y-1.5">
          <Label htmlFor="rrule-custom">RRULE (RFC 5545)</Label>
          <Input
            id="rrule-custom"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              onChange(e.target.value || null)
            }}
            placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
          />
        </div>
      )}

      <p className="text-xs text-fg-muted font-mono">{preview}</p>

      {value && (
        <div className="space-y-1.5">
          <Label htmlFor="rrule-until">Termina (opcional)</Label>
          <Input
            id="rrule-until"
            type="date"
            value={rruleUntil ? rruleUntil.toISOString().slice(0, 10) : ""}
            onChange={(e) => onRruleUntilChange(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
      )}
    </div>
  )
}
