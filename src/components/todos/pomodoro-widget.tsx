"use client"

import * as React from "react"
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { playBell } from "@/lib/sound"

type Mode = "FOCUS" | "BREAK"
type Preset = "25/5" | "50/10" | "90/20" | "custom"

interface Config {
  workMin: number
  breakMin: number
  soundOn: boolean
  preset: Preset
}

const PRESETS: Record<Exclude<Preset, "custom">, { workMin: number; breakMin: number }> = {
  "25/5": { workMin: 25, breakMin: 5 },
  "50/10": { workMin: 50, breakMin: 10 },
  "90/20": { workMin: 90, breakMin: 20 },
}

const DEFAULT_CONFIG: Config = {
  workMin: 25,
  breakMin: 5,
  soundOn: true,
  preset: "25/5",
}

const STORAGE_KEY = "pomodoro-config"

export function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`
}

function loadConfig(): Config {
  if (typeof window === "undefined") return DEFAULT_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw) as Partial<Config>
    return {
      workMin: typeof parsed.workMin === "number" ? parsed.workMin : DEFAULT_CONFIG.workMin,
      breakMin: typeof parsed.breakMin === "number" ? parsed.breakMin : DEFAULT_CONFIG.breakMin,
      soundOn: typeof parsed.soundOn === "boolean" ? parsed.soundOn : DEFAULT_CONFIG.soundOn,
      preset: parsed.preset ?? DEFAULT_CONFIG.preset,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export interface PomodoroState {
  config: Config
  mode: Mode
  running: boolean
  remainingMs: number
  cycleCount: number
  totalMs: number
  start: () => void
  pause: () => void
  reset: () => void
  applyPreset: (p: Exclude<Preset, "custom">) => void
  setCustom: (key: "workMin" | "breakMin", value: number) => void
  toggleSound: () => void
}

export function usePomodoro(): PomodoroState {
  const [config, setConfig] = React.useState<Config>(DEFAULT_CONFIG)
  const [hydrated, setHydrated] = React.useState(false)
  const [mode, setMode] = React.useState<Mode>("FOCUS")
  const [running, setRunning] = React.useState(false)
  const [endsAt, setEndsAt] = React.useState<number | null>(null)
  const [remainingMs, setRemainingMs] = React.useState(DEFAULT_CONFIG.workMin * 60_000)
  const [cycleCount, setCycleCount] = React.useState(0)

  const originalTitleRef = React.useRef<string>("")

  React.useEffect(() => {
    const loaded = loadConfig()
    setConfig(loaded)
    setRemainingMs(loaded.workMin * 60_000)
    setHydrated(true)
    originalTitleRef.current = document.title
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config, hydrated])

  const blockMs = React.useCallback(
    (m: Mode) => (m === "FOCUS" ? config.workMin : config.breakMin) * 60_000,
    [config.workMin, config.breakMin]
  )

  const onBlockEnd = React.useCallback(
    (finishedMode: Mode) => {
      if (config.soundOn) playBell()
      if (finishedMode === "FOCUS") {
        setCycleCount((c) => c + 1)
        toast.success(`Foco completado · break ${config.breakMin} min`)
      } else {
        toast.info(`Break terminado · foco ${config.workMin} min`)
      }
    },
    [config.soundOn, config.workMin, config.breakMin]
  )

  React.useEffect(() => {
    if (!running || endsAt == null) return
    const id = setInterval(() => {
      const left = endsAt - Date.now()
      if (left <= 0) {
        const next: Mode = mode === "FOCUS" ? "BREAK" : "FOCUS"
        onBlockEnd(mode)
        const nextDur = blockMs(next)
        const nextEnd = Date.now() + nextDur
        setMode(next)
        setEndsAt(nextEnd)
        setRemainingMs(nextDur)
      } else {
        setRemainingMs(left)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, endsAt, mode, blockMs, onBlockEnd])

  React.useEffect(() => {
    if (!hydrated) return
    if (running) {
      const icon = mode === "FOCUS" ? "🍅" : "☕"
      document.title = `${icon} ${fmt(remainingMs)} · Actividades`
    } else {
      document.title = originalTitleRef.current
    }
  }, [running, remainingMs, mode, hydrated])

  React.useEffect(() => {
    return () => {
      if (originalTitleRef.current) document.title = originalTitleRef.current
    }
  }, [])

  React.useEffect(() => {
    if (running) return
    setRemainingMs(blockMs(mode))
  }, [config.workMin, config.breakMin, mode, blockMs, running])

  const start = React.useCallback(() => {
    // Prime audio under user gesture so subsequent autoplay works.
    if (typeof window !== "undefined") {
      try {
        const a = new Audio("/sounds/bell.wav")
        a.volume = 0
        const p = a.play()
        if (p && typeof p.then === "function") {
          p.then(() => {
            a.pause()
            a.currentTime = 0
          }).catch(() => {})
        }
      } catch {
        // ignore
      }
    }
    setRemainingMs((prev) => {
      const dur = running ? prev : blockMs(mode)
      setEndsAt(Date.now() + dur)
      return dur
    })
    setRunning(true)
  }, [running, mode, blockMs])

  const pause = React.useCallback(() => {
    setEndsAt((prev) => {
      if (prev != null) setRemainingMs(Math.max(0, prev - Date.now()))
      return null
    })
    setRunning(false)
  }, [])

  const reset = React.useCallback(() => {
    setRunning(false)
    setEndsAt(null)
    setMode("FOCUS")
    setRemainingMs(blockMs("FOCUS"))
    setCycleCount(0)
  }, [blockMs])

  const applyPreset = React.useCallback(
    (p: Exclude<Preset, "custom">) => {
      setConfig((c) => ({ ...c, ...PRESETS[p], preset: p }))
    },
    []
  )

  const setCustom = React.useCallback(
    (key: "workMin" | "breakMin", value: number) => {
      const clamped = Math.max(1, Math.min(180, Math.floor(value || 1)))
      setConfig((c) => ({ ...c, [key]: clamped, preset: "custom" }))
    },
    []
  )

  const toggleSound = React.useCallback(() => {
    setConfig((c) => ({ ...c, soundOn: !c.soundOn }))
  }, [])

  return {
    config,
    mode,
    running,
    remainingMs,
    cycleCount,
    totalMs: blockMs(mode),
    start,
    pause,
    reset,
    applyPreset,
    setCustom,
    toggleSound,
  }
}

interface PomodoroPanelProps {
  state: PomodoroState
  compact?: boolean
}

export function PomodoroPanel({ state, compact }: PomodoroPanelProps) {
  const {
    config,
    mode,
    running,
    remainingMs,
    cycleCount,
    totalMs,
    start,
    pause,
    reset,
    applyPreset,
    setCustom,
    toggleSound,
  } = state
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full shrink-0",
              running && "animate-pulse",
              mode === "FOCUS" ? "bg-danger" : "bg-success"
            )}
          />
          <span className="font-mono tabular-nums text-base font-semibold leading-none">
            {fmt(remainingMs)}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-fg-subtle">
            {mode === "FOCUS" ? "FOCO" : "BREAK"}
            {cycleCount > 0 && ` · #${cycleCount}`}
          </span>
          <div className="flex-1" />
          {running ? (
            <Button onClick={pause} variant="ghost" size="icon-sm" aria-label="Pausar">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={start} variant="ghost" size="icon-sm" aria-label="Iniciar">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button onClick={reset} variant="ghost" size="icon-sm" aria-label="Reset">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <button
            type="button"
            onClick={toggleSound}
            className="text-fg-subtle hover:text-fg transition-colors"
            aria-label={config.soundOn ? "Silenciar" : "Activar sonido"}
          >
            {config.soundOn ? (
              <Volume2 className="h-3 w-3" />
            ) : (
              <VolumeX className="h-3 w-3" />
            )}
          </button>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-200",
              mode === "FOCUS" ? "bg-danger" : "bg-success"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          {mode === "FOCUS" ? "◆ Foco" : "◆ Break"}
          {cycleCount > 0 && <span className="ml-2 text-fg-muted">#{cycleCount}</span>}
        </p>
        <button
          type="button"
          onClick={toggleSound}
          className="text-fg-subtle hover:text-fg transition-colors"
          aria-label={config.soundOn ? "Silenciar" : "Activar sonido"}
        >
          {config.soundOn ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="font-mono tabular-nums font-semibold tracking-tight leading-none text-5xl">
          {fmt(remainingMs)}
        </p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-200",
              mode === "FOCUS" ? "bg-danger" : "bg-success"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {running ? (
          <Button onClick={pause} variant="default" size="sm">
            <Pause className="h-3.5 w-3.5" />
            Pausar
          </Button>
        ) : (
          <Button onClick={start} variant="default" size="sm">
            <Play className="h-3.5 w-3.5" />
            Iniciar
          </Button>
        )}
        <Button onClick={reset} variant="ghost" size="sm" aria-label="Reset">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!compact && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            Modo
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors",
                  config.preset === p
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-border text-fg-muted hover:border-border-strong"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              Foco
              <input
                type="number"
                min={1}
                max={180}
                value={config.workMin}
                onChange={(e) => setCustom("workMin", Number(e.target.value))}
                className="w-14 rounded-sm border border-border bg-bg px-1.5 py-0.5 font-mono text-xs"
              />
              min
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              Break
              <input
                type="number"
                min={1}
                max={180}
                value={config.breakMin}
                onChange={(e) => setCustom("breakMin", Number(e.target.value))}
                className="w-14 rounded-sm border border-border bg-bg px-1.5 py-0.5 font-mono text-xs"
              />
              min
            </label>
          </div>
          {running && (
            <p className="text-[10px] text-fg-subtle">Aplica al próximo bloque.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface PomodoroWidgetProps {
  state: PomodoroState
}

export function PomodoroWidget({ state }: PomodoroWidgetProps) {
  const [open, setOpen] = React.useState(false)
  const { running, mode, remainingMs, totalMs } = state
  const showingTime = running || remainingMs < totalMs

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {running ? (
            <>
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full animate-pulse",
                  mode === "FOCUS" ? "bg-danger" : "bg-success"
                )}
              />
              <span className="font-mono tabular-nums">{fmt(remainingMs)}</span>
            </>
          ) : (
            <>
              <Timer className="h-4 w-4" />
              {showingTime ? (
                <span className="font-mono tabular-nums">{fmt(remainingMs)}</span>
              ) : (
                "Pomodoro"
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PomodoroPanel state={state} />
      </PopoverContent>
    </Popover>
  )
}
