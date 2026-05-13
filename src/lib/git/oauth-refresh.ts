import { prisma } from "@/lib/prisma"
import { encryptOptional } from "@/lib/crypto"

const GITLAB_TOKEN_URL = "https://gitlab.com/oauth/token"
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"

interface RefreshResult {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
}

/**
 * Refreshes an OAuth access token for the given provider.
 * Updates the Account row in DB (re-encrypted) and returns the new plaintext access token.
 */
export async function refreshAccessToken(args: {
  accountId: string
  provider: "github" | "gitlab"
  refreshToken: string
}): Promise<RefreshResult> {
  if (args.provider === "github") {
    return refreshGithub(args.accountId, args.refreshToken)
  }
  return refreshGitlab(args.accountId, args.refreshToken)
}

async function refreshGitlab(accountId: string, refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.AUTH_GITLAB_ID
  const clientSecret = process.env.AUTH_GITLAB_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GITLAB_ID/SECRET no configurados")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const res = await fetch(GITLAB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new Error(`GitLab refresh fallido (${res.status})`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresAt = data.expires_in
    ? Math.floor(Date.now() / 1000) + data.expires_in
    : null

  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: encryptOptional(data.access_token),
      refresh_token: data.refresh_token ? encryptOptional(data.refresh_token) : undefined,
      expires_at: expiresAt,
    },
  })

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
  }
}

async function refreshGithub(accountId: string, refreshToken: string): Promise<RefreshResult> {
  const clientId = process.env.AUTH_GITHUB_ID
  const clientSecret = process.env.AUTH_GITHUB_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GITHUB_ID/SECRET no configurados")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new Error(`GitHub refresh fallido (${res.status})`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }

  if (data.error) {
    throw new Error(`GitHub refresh: ${data.error}`)
  }

  const expiresAt = data.expires_in
    ? Math.floor(Date.now() / 1000) + data.expires_in
    : null

  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: encryptOptional(data.access_token),
      refresh_token: data.refresh_token ? encryptOptional(data.refresh_token) : undefined,
      expires_at: expiresAt,
    },
  })

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
  }
}
