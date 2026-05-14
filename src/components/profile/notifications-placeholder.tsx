import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function NotificationsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-fg-subtle" />
            <CardTitle>Notificaciones</CardTitle>
          </div>
          <Badge variant="warning">En desarrollo</Badge>
        </div>
        <CardDescription>Pronto podrás configurar cómo recibir avisos</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-fg-muted">
          Aquí podrás elegir qué eventos te notificarán y por qué canal (email, push, app).
        </p>
      </CardContent>
    </Card>
  )
}
