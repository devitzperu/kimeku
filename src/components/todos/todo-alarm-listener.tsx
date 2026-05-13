"use client"

import * as React from "react"
import { toast } from "sonner"
import { playBell } from "@/lib/sound"

interface AlarmPayload {
  type: "todo-alarm"
  title: string
  body?: string
  todoId?: string | null
}

export function TodoAlarmListener() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const onMessage = (event: MessageEvent) => {
      const data = event.data as AlarmPayload | undefined
      if (!data || data.type !== "todo-alarm") return
      playBell()
      toast.info(data.title, { description: data.body, duration: 10_000 })
    }

    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
    }
  }, [])

  return null
}
