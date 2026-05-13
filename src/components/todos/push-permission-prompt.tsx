"use client"

import * as React from "react"
import { Bell, BellOff, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { subscribePush } from "@/actions/push-subscriptions"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function PushPermissionPrompt() {
  const [supported, setSupported] = React.useState(true)
  const [permission, setPermission] = React.useState<NotificationPermission>("default")
  const [dismissed, setDismissed] = React.useState(false)
  const [pending, start] = React.useTransition()

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupported(false)
      return
    }
    setPermission(Notification.permission)
    setDismissed(localStorage.getItem("push-prompt-dismissed") === "1")
  }, [])

  if (!supported || dismissed || permission === "granted" || !VAPID_PUBLIC_KEY) return null

  function dismiss() {
    localStorage.setItem("push-prompt-dismissed", "1")
    setDismissed(true)
  }

  async function enable() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
        const perm = await Notification.requestPermission()
        setPermission(perm)
        if (perm !== "granted") return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
        })

        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        const res = await subscribePush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        toast.success("Notificaciones activadas")
      } catch (e) {
        toast.error("No se pudo activar notificaciones")
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-accent-border bg-accent-subtle px-3 py-2 text-sm">
      {permission === "denied" ? (
        <BellOff className="h-4 w-4 text-fg-muted" />
      ) : (
        <Bell className="h-4 w-4 text-accent" />
      )}
      <span className="flex-1">
        {permission === "denied"
          ? "Notificaciones bloqueadas. Habilítalas en la configuración del navegador."
          : "Activa las notificaciones para recibir tus alarmas."}
      </span>
      {permission !== "denied" && (
        <Button size="sm" onClick={enable} disabled={pending}>
          Activar
        </Button>
      )}
      <Button size="icon-sm" variant="ghost" onClick={dismiss}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
