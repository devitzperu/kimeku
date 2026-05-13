"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { registerAction } from "@/actions/auth"

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null)

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required autoComplete="name" placeholder="Tu nombre" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@empresa.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
        />
      </div>

      {state && !state.ok && (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Crear cuenta
      </Button>
    </form>
  )
}
