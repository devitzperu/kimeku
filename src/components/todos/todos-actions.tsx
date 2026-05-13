"use client"

import { Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PomodoroWidget } from "@/components/todos/pomodoro-widget"
import { useDashboardTodos } from "@/components/todos/dashboard-todos-provider"

export function TodosActions() {
  const { pomodoro, pipSupported, pipOpen, openPip } = useDashboardTodos()
  return (
    <>
      <PomodoroWidget state={pomodoro} />
      {pipSupported && (
        <Button variant="outline" onClick={openPip} disabled={pipOpen}>
          <Monitor className="h-4 w-4" />
          Modo flotante
        </Button>
      )}
    </>
  )
}
