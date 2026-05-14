"use client"

import * as React from "react"
import { Loader2, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/shared/password-input"
import { changePassword } from "@/actions/users"

export function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [pending, start] = React.useTransition()

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 8
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  function reset() {
    setCurrent("")
    setNext("")
    setConfirm("")
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    start(async () => {
      const res = await changePassword({ current, next })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Contraseña actualizada")
      reset()
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <CardTitle>Cambiar contraseña</CardTitle>
        </div>
        <CardDescription>Actualiza tu clave de acceso</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <PasswordInput
              id="current-password"
              value={current}
              onChange={setCurrent}
              required
              autoComplete="current-password"
              showSuggest={false}
              showStrength={false}
              showCopy={false}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next-password">Nueva contraseña</Label>
            <PasswordInput
              id="next-password"
              value={next}
              onChange={setNext}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
            {tooShort && (
              <p className="text-[11px] text-danger">Mínimo 8 caracteres</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={setConfirm}
              required
              minLength={8}
              autoComplete="new-password"
              showSuggest={false}
              showStrength={false}
              showCopy={false}
            />
            {mismatch && (
              <p className="text-[11px] text-danger">Las contraseñas no coinciden</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !canSubmit}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
