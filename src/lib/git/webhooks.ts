import { createHmac, timingSafeEqual } from "node:crypto"
import type { GitProviderKind } from "./types"

export interface CreateWebhookArgs {
  repo: string
  callbackUrl: string
  secret: string
}

export interface CreateWebhookResult {
  id: string
}

export async function createGithubWebhook(
  token: string,
  args: CreateWebhookArgs
): Promise<CreateWebhookResult> {
  const res = await fetch(`https://api.github.com/repos/${args.repo}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "kimeku-app",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: args.callbackUrl,
        content_type: "json",
        secret: args.secret,
        insecure_ssl: "0",
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`GitHub webhook create failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { id: number }
  return { id: String(data.id) }
}

export async function deleteGithubWebhook(
  token: string,
  repo: string,
  hookId: string
): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${repo}/hooks/${hookId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kimeku-app",
    },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub webhook delete failed (${res.status})`)
  }
}

export async function createGitlabWebhook(
  token: string,
  args: CreateWebhookArgs
): Promise<CreateWebhookResult> {
  const res = await fetch(
    `https://gitlab.com/api/v4/projects/${encodeURIComponent(args.repo)}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "kimeku-app",
      },
      body: JSON.stringify({
        url: args.callbackUrl,
        push_events: true,
        token: args.secret,
        enable_ssl_verification: true,
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`GitLab webhook create failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { id: number }
  return { id: String(data.id) }
}

export async function deleteGitlabWebhook(
  token: string,
  repo: string,
  hookId: string
): Promise<void> {
  const res = await fetch(
    `https://gitlab.com/api/v4/projects/${encodeURIComponent(repo)}/hooks/${hookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "kimeku-app",
      },
    }
  )
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitLab webhook delete failed (${res.status})`)
  }
}

export function verifyGithubSignature(
  rawBody: string,
  headerSig: string | null,
  secret: string
): boolean {
  if (!headerSig) return false
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
  if (expected.length !== headerSig.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(headerSig))
  } catch {
    return false
  }
}

export function verifyGitlabSignature(headerToken: string | null, secret: string): boolean {
  if (!headerToken) return false
  if (headerToken.length !== secret.length) return false
  try {
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(secret))
  } catch {
    return false
  }
}

export async function createWebhook(
  token: string,
  provider: GitProviderKind,
  args: CreateWebhookArgs
): Promise<CreateWebhookResult> {
  return provider === "GITHUB"
    ? createGithubWebhook(token, args)
    : createGitlabWebhook(token, args)
}

export async function deleteWebhook(
  token: string,
  provider: GitProviderKind,
  repo: string,
  hookId: string
): Promise<void> {
  return provider === "GITHUB"
    ? deleteGithubWebhook(token, repo, hookId)
    : deleteGitlabWebhook(token, repo, hookId)
}
