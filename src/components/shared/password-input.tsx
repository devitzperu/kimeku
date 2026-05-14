"use client"

import * as React from "react"
import { Eye, EyeOff, Sparkles, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { suggestPassword } from "@/lib/password-suggest"
import { scorePassword, type Strength } from "@/lib/password-strength"

type Props = {
  id?: string
  name?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  minLength?: number
  placeholder?: string
  autoComplete?: string
  showSuggest?: boolean
  showStrength?: boolean
  showCopy?: boolean
  suggestLabel?: string
  className?: string
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  autoComplete = "new-password",
  showSuggest = true,
  showStrength = true,
  showCopy = true,
  suggestLabel = "Sugerir",
  className,
}: Props) {
  const [show, setShow] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const strength = React.useMemo(() => scorePassword(value), [value])

  function handleSuggest() {
    onChange(suggestPassword())
    setShow(true)
  }

  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const trailingButtons = (showCopy && value ? 1 : 0) + 1
  const padRight = trailingButtons === 2 ? "pr-20" : "pr-10"

  return (
    <div className="space-y-1.5">
      {showSuggest && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSuggest}
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            {suggestLabel}
          </button>
        </div>
      )}
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(padRight, "font-mono", className)}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {showCopy && value && (
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            title={show ? "Ocultar" : "Mostrar"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-bg-muted transition-colors"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {showStrength && value && <StrengthMeter level={strength.level} label={strength.label} />}
    </div>
  )
}

function StrengthMeter({ level, label }: Strength) {
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-info", "bg-success"]
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < level ? colors[level] : "bg-bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-fg-subtle">{label}</p>
    </div>
  )
}
