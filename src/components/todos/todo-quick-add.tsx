"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { quickAddTodo } from "@/actions/todos"

export function TodoQuickAdd() {
  const router = useRouter()
  const [title, setTitle] = React.useState("")
  const [dueAt, setDueAt] = React.useState("")
  const [pending, start] = React.useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    start(async () => {
      const res = await quickAddTodo({
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt) : null,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setTitle("")
      setDueAt("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Agregar pendiente y presionar Enter…"
        className="flex-1"
        maxLength={200}
      />
      <Input
        type="date"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        className="sm:w-44"
      />
      <Button type="submit" disabled={pending || !title.trim()}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Agregar
      </Button>
    </form>
  )
}
