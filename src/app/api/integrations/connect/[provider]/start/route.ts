import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { getAppBaseUrl, getOAuthConfig, providerKind } from "@/lib/git/oauth-config"
import { signState } from "@/lib/git/oauth-state"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const kind = providerKind(provider)
  if (!kind) {
    return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const cfg = getOAuthConfig(provider as "github" | "gitlab")
  const baseUrl = getAppBaseUrl(req.nextUrl.origin)
  const redirectUri = `${baseUrl}/api/integrations/connect/${provider}/callback`
  const state = signState(session.user.id)

  const params_ = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state,
  })

  return NextResponse.redirect(`${cfg.authorizeUrl}?${params_.toString()}`)
}
