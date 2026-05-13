import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-8 shadow-lg animate-fade-in">
      <div className="mb-8 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          ◆ Acceso · Sesión
        </p>
        <h1 className="font-semibold text-2xl tracking-tight">Bienvenido</h1>
        <p className="text-sm text-fg-muted">Ingresa para continuar documentando.</p>
      </div>

      <LoginForm />
    </div>
  )
}
