"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { startHistorialFromTodo } from "@/actions/todos"

export function StartHistorialButton({ todoId }: { todoId: string }) {
  const router = useRouter()
  const [pending, start] = React.useTransition()

  function onClick() {
    start(async () => {
      const res = await startHistorialFromTodo(todoId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const id = (res.data as { historialId: string } | undefined)?.historialId
      if (id) router.push(`/historial/${id}`)
    })
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      Iniciar Historial
    </Button>
  )
}
