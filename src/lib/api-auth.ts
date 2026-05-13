import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { verifyApiKey, type Scope } from "@/lib/api-key"

export type ApiPrincipal = {
  userId: string
  name: string
  email: string
  role: "ADMIN" | "EDITOR" | "VIEWER"
  scopes: Scope[] | "*"
  via: "session" | "api-key"
  keyId?: string
}

/**
 * Resolve auth from either:
 *   - Authorization: Bearer <jwt>  (UI session)
 *   - X-API-Key: <plaintext>       (integration key)
 */
export async function authenticateRequest(req: Request | NextRequest): Promise<ApiPrincipal | null> {
  const apiKey = req.headers.get("x-api-key")
  if (apiKey) {
    const verified = await verifyApiKey(apiKey)
    if (!verified) return null
    if (verified.user.role === "CLIENT") return null
    return {
      userId: verified.user.id,
      name: verified.user.name,
      email: verified.user.email,
      role: verified.user.role as "ADMIN" | "EDITOR" | "VIEWER",
      scopes: verified.scopes,
      via: "api-key",
      keyId: verified.keyId,
    }
  }

  // Fall back to session cookie / bearer (NextAuth handles both)
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role === "CLIENT") return null
  return {
    userId: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as "ADMIN" | "EDITOR" | "VIEWER",
    scopes: "*",
    via: "session",
  }
}

export function hasScope(principal: ApiPrincipal, scope: Scope): boolean {
  if (principal.scopes === "*") return true
  return principal.scopes.includes(scope)
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden(scope?: string) {
  return Response.json(
    { error: "Forbidden", required_scope: scope },
    { status: 403 }
  )
}

export function badRequest(message: string, details?: unknown) {
  return Response.json({ error: message, details }, { status: 400 })
}

export function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 })
}
