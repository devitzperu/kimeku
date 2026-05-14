import type { NextAuthConfig } from "next-auth"

/**
 * Edge-compatible config (used by middleware).
 * Heavy stuff (Prisma adapter, bcrypt) lives in lib/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role
      const path = nextUrl.pathname
      const isOnAuth = path.startsWith("/login") || path.startsWith("/register")
      const isPortal = path.startsWith("/portal")
      const isPortalApi = path.startsWith("/api/portal")

      if (isOnAuth) {
        if (isLoggedIn) {
          const target = role === "CLIENT" ? "/portal" : "/"
          return Response.redirect(new URL(target, nextUrl))
        }
        return true
      }

      if (path.startsWith("/docs") || path.startsWith("/api/openapi.json")) return true
      if (path.startsWith("/api/v1/webhooks/")) return true
      if (path.startsWith("/api/integrations/webhooks/")) return true
      if (path.startsWith("/api/v1/")) return true
      if (path.startsWith("/api/auth")) return true
      if (path.startsWith("/api/cron/")) return true

      if (!isLoggedIn) return false

      if (role === "CLIENT") {
        if (isPortal || isPortalApi) return true
        return Response.redirect(new URL("/portal", nextUrl))
      }

      if (isPortal || isPortalApi) {
        return Response.redirect(new URL("/", nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        const r = (user as { role?: "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT" }).role
        token.role = r ?? "VIEWER"
        const cid = (user as { clientId?: string | null }).clientId
        token.clientId = cid ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role =
          (token.role as "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT") ?? "VIEWER"
        session.user.clientId = (token.clientId as string | null | undefined) ?? null
      }
      return session
    },
  },
} satisfies NextAuthConfig
