"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteArea } from "@/actions/areas"

export function DeleteAreaButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onDelete() {
    start(async () => {
      const res = await deleteArea(id)
      if (res.ok) {
        toast.success("Área eliminada")
        router.push("/areas")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-danger hover:text-danger">
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta área?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Los procesos asociados perderán esta vinculación.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
