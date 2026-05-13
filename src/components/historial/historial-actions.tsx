"use client"

import { useTransition } from "react"
import { Play, Square, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { startHistorial, finishHistorial, cancelHistorial } from "@/actions/historial"

export function HistorialActions({
  historial,
}: {
  historial: { id: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }
}) {
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    start(async () => {
      const res = await fn()
      if (res.ok) toast.success(msg)
      else toast.error(res.error ?? "Error")
    })
  }

  if (historial.status === "PENDING") {
    return (
      <Button onClick={() => run(() => startHistorial(historial.id), "Ejecución iniciada")} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Iniciar
      </Button>
    )
  }

  if (historial.status === "IN_PROGRESS") {
    return (
      <>
        <Button
          variant="default"
          onClick={() => run(() => finishHistorial(historial.id), "Ejecución completada")}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          Finalizar
        </Button>
        <Button
          variant="outline"
          onClick={() => run(() => cancelHistorial(historial.id), "Ejecución cancelada")}
          disabled={pending}
          className="text-danger hover:text-danger"
        >
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </>
    )
  }

  return null
}
