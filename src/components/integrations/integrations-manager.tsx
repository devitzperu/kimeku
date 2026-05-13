"use client"

import * as React from "react"
import { Box, GitBranch, Plug, Unplug, Check, Clock } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { disconnectAccount, type ConnectedAccount } from "@/actions/integrations"

interface ProviderInfo {
  key: "github" | "gitlab"
  label: string
  icon: React.ComponentType<{ className?: string }>
  scopeHint: string
}

const PROVIDERS: ProviderInfo[] = [
  { key: "github", label: "GitHub.com", icon: Box, scopeHint: "scope: repo" },
  {
    key: "gitlab",
    label: "GitLab.com",
    icon: GitBranch,
    scopeHint: "scope: api read_repository write_repository",
  },
]

export function IntegrationsManager({ accounts }: { accounts: ConnectedAccount[] }) {
  const byProvider = new Map(accounts.map((a) => [a.provider, a]))
  const [pending, startTransition] = React.useTransition()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  function disconnect(provider: "github" | "gitlab") {
    if (!confirm(`¿Desconectar tu cuenta de ${provider.toUpperCase()}?`)) return
    startTransition(async () => {
      const res = await disconnectAccount(provider)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Cuenta desconectada")
      window.location.assign(window.location.pathname)
    })
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {PROVIDERS.map((p) => {
            const acct = byProvider.get(p.key)
            const Icon = p.icon
            return (
              <li key={p.key} className="px-5 py-4 flex items-center gap-4">
                <Icon className="h-5 w-5 shrink-0 text-fg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{p.label}</p>
                    {acct ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" /> conectado
                      </Badge>
                    ) : (
                      <Badge variant="default">no conectado</Badge>
                    )}
                  </div>
                  {acct ? (
                    <div className="flex flex-wrap gap-3 mt-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      <span>id: {acct.providerAccountId}</span>
                      {acct.scope && <span>scopes: {acct.scope}</span>}
                      {acct.expiresAt && mounted && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          expira: {new Date(acct.expiresAt * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-fg-muted">{p.scopeHint}</p>
                  )}
                </div>
                {acct ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect(p.key)}
                    disabled={pending}
                  >
                    <Unplug className="h-4 w-4" />
                    Desconectar
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <a href={`/api/integrations/connect/${p.key}/start`}>
                      <Plug className="h-4 w-4" />
                      Conectar
                    </a>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
