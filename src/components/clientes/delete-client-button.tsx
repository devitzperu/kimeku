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
import { deleteClient } from "@/actions/clients"

export function DeleteClientButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onDelete() {
    start(async () => {
      const res = await deleteClient(id)
      if (res.ok) {
        toast.success("Cliente eliminado")
        router.push("/clientes")
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
          <DialogTitle>¿Eliminar este cliente?</DialogTitle>
          <DialogDescription>Acción irreversible.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={pending}>Cancelar</Button>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
