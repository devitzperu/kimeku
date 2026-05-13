"use client"

import * as React from "react"

type Status = "connecting" | "live" | "reconnecting" | "polling"

type PortalStatusBarProps = {
  status: Status
  lastUpdate: Date
  clientCode: string
}

export function PortalStatusBar({ status, lastUpdate, clientCode }: PortalStatusBarProps) {
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const label = labelFor(status)
  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdate.getTime()) / 1000))

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 md:px-8">
        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          ◆ {label} · HACE {seconds}S
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          {clientCode}
        </p>
      </div>
    </div>
  )
}

function labelFor(s: Status) {
  switch (s) {
    case "live":
      return "SSE ACTIVO"
    case "connecting":
      return "CONECTANDO"
    case "reconnecting":
      return "RECONECTANDO"
    case "polling":
      return "POLLING 10S"
  }
}
