import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encryptOptional } from "@/lib/crypto"
import { getAppBaseUrl, getOAuthConfig, providerKind } from "@/lib/git/oauth-config"
import { verifyState } from "@/lib/git/oauth-state"

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

interface UserInfo {
  id: string | number
  login?: string
  username?: string
}

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

  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const oauthError = req.nextUrl.searchParams.get("error")

  const baseUrl = getAppBaseUrl(req.nextUrl.origin)
  const integrationsPage = `${baseUrl}/configuracion/integraciones`

  if (oauthError) {
    return NextResponse.redirect(`${integrationsPage}?error=${encodeURIComponent(oauthError)}`)
  }
  if (!code || !state) {
    return NextResponse.redirect(`${integrationsPage}?error=missing_params`)
  }

  const verified = verifyState(state)
  if (!verified || verified.userId !== session.user.id) {
    return NextResponse.redirect(`${integrationsPage}?error=invalid_state`)
  }

  const cfg = getOAuthConfig(provider as "github" | "gitlab")
  const redirectUri = `${baseUrl}/api/integrations/connect/${provider}/callback`

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "")
    console.error(`OAuth ${provider} token exchange failed: ${tokenRes.status} ${body}`)
    return NextResponse.redirect(`${integrationsPage}?error=token_exchange`)
  }

  const tokens = (await tokenRes.json()) as TokenResponse
  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      `${integrationsPage}?error=${encodeURIComponent(tokens.error ?? "no_token")}`
    )
  }

  const userInfo = await fetchUserInfo(provider as "github" | "gitlab", tokens.access_token)
  const providerAccountId = String(userInfo.id)

  const expiresAt = tokens.expires_in
    ? Math.floor(Date.now() / 1000) + tokens.expires_in
    : null

  const data = {
    userId: session.user.id,
    type: "oauth",
    provider,
    providerAccountId,
    access_token: encryptOptional(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptOptional(tokens.refresh_token) : null,
    expires_at: expiresAt,
    token_type: tokens.token_type ?? null,
    scope: tokens.scope ?? cfg.scope,
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: { provider, providerAccountId },
    },
    create: data,
    update: {
      userId: session.user.id,
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? undefined,
      expires_at: expiresAt,
      token_type: data.token_type ?? undefined,
      scope: data.scope,
    },
  })

  return NextResponse.redirect(`${integrationsPage}?connected=${provider}`)
}

async function fetchUserInfo(name: "github" | "gitlab", token: string): Promise<UserInfo> {
  if (name === "github") {
    const r = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "kimeku-app",
      },
    })
    if (!r.ok) throw new Error(`GitHub /user ${r.status}`)
    return (await r.json()) as UserInfo
  }
  const r = await fetch("https://gitlab.com/api/v4/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "kimeku-app",
    },
  })
  if (!r.ok) throw new Error(`GitLab /user ${r.status}`)
  return (await r.json()) as UserInfo
}
