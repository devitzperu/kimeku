import type { GitProviderKind } from "./types"

export interface OAuthEndpointConfig {
  authorizeUrl: string
  tokenUrl: string
  scope: string
  clientId: string
  clientSecret: string
}

export type ProviderName = "github" | "gitlab"

const KIND_TO_NAME: Record<GitProviderKind, ProviderName> = {
  GITHUB: "github",
  GITLAB: "gitlab",
}

export function providerName(kind: GitProviderKind): ProviderName {
  return KIND_TO_NAME[kind]
}

export function providerKind(name: string): GitProviderKind | null {
  if (name === "github") return "GITHUB"
  if (name === "gitlab") return "GITLAB"
  return null
}

export function getOAuthConfig(name: ProviderName): OAuthEndpointConfig {
  if (name === "github") {
    const clientId = process.env.AUTH_GITHUB_ID
    const clientSecret = process.env.AUTH_GITHUB_SECRET
    if (!clientId || !clientSecret) {
      throw new Error("AUTH_GITHUB_ID/SECRET no configurados en .env")
    }
    return {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email repo",
      clientId,
      clientSecret,
    }
  }
  const clientId = process.env.AUTH_GITLAB_ID
  const clientSecret = process.env.AUTH_GITLAB_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GITLAB_ID/SECRET no configurados en .env")
  }
  return {
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scope: "read_user api read_repository write_repository",
    clientId,
    clientSecret,
  }
}

export function getAppBaseUrl(reqOrigin?: string): string {
  const env = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (env) return env.replace(/\/$/, "")
  if (reqOrigin) return reqOrigin.replace(/\/$/, "")
  return "http://localhost:3000"
}
