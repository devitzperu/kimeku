import { prisma } from "@/lib/prisma"
import { decryptOptional } from "@/lib/crypto"
import { createGithubProvider } from "./github"
import { createGitlabProvider } from "./gitlab"
import { refreshAccessToken } from "./oauth-refresh"
import { MissingAccountError, type GitProvider, type GitProviderKind } from "./types"

const PROVIDER_NAME: Record<GitProviderKind, "github" | "gitlab"> = {
  GITHUB: "github",
  GITLAB: "gitlab",
}

const REFRESH_GRACE_SECONDS = 60

export async function getProviderForUser(
  userId: string,
  kind: GitProviderKind
): Promise<GitProvider> {
  const providerName = PROVIDER_NAME[kind]
  const account = await prisma.account.findFirst({
    where: { userId, provider: providerName },
  })
  if (!account || !account.access_token) {
    throw new MissingAccountError(kind)
  }

  let accessToken = decryptOptional(account.access_token) as string

  const now = Math.floor(Date.now() / 1000)
  if (
    account.expires_at &&
    account.expires_at - REFRESH_GRACE_SECONDS <= now &&
    account.refresh_token
  ) {
    const refresh = decryptOptional(account.refresh_token) as string
    const refreshed = await refreshAccessToken({
      accountId: account.id,
      provider: providerName,
      refreshToken: refresh,
    })
    accessToken = refreshed.accessToken
  }

  return kind === "GITHUB"
    ? createGithubProvider(accessToken)
    : createGitlabProvider(accessToken)
}

export async function userHasAccount(
  userId: string,
  kind: GitProviderKind
): Promise<boolean> {
  const providerName = PROVIDER_NAME[kind]
  const count = await prisma.account.count({
    where: { userId, provider: providerName },
  })
  return count > 0
}
