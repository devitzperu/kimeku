"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { getProviderForUser } from "@/lib/git/factory"
import { MissingAccountError, type GitProviderKind } from "@/lib/git/types"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

export interface ConnectedAccount {
  provider: "github" | "gitlab"
  providerAccountId: string
  scope: string | null
  expiresAt: number | null
  hasRefreshToken: boolean
}

export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  const user = await requireRole("ADMIN")
  const accounts = await prisma.account.findMany({
    where: {
      userId: user.id,
      provider: { in: ["github", "gitlab"] },
    },
    select: {
      provider: true,
      providerAccountId: true,
      scope: true,
      expires_at: true,
      refresh_token: true,
    },
  })
  return accounts.map((a) => ({
    provider: a.provider as "github" | "gitlab",
    providerAccountId: a.providerAccountId,
    scope: a.scope,
    expiresAt: a.expires_at,
    hasRefreshToken: !!a.refresh_token,
  }))
}

export async function disconnectAccount(
  provider: "github" | "gitlab"
): Promise<ActionResult> {
  const user = await requireRole("ADMIN")
  await prisma.account.deleteMany({
    where: { userId: user.id, provider },
  })
  revalidatePath("/configuracion/integraciones")
  return { ok: true }
}

const REPO_CACHE = new Map<string, { ts: number; data: unknown }>()
const CACHE_MS = 60_000

function cacheKey(userId: string, op: string, extra = ""): string {
  return `${userId}:${op}:${extra}`
}

function readCache<T>(key: string): T | null {
  const hit = REPO_CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_MS) {
    REPO_CACHE.delete(key)
    return null
  }
  return hit.data as T
}

function writeCache(key: string, data: unknown) {
  REPO_CACHE.set(key, { ts: Date.now(), data })
}

export async function listMyRepos(
  kind: GitProviderKind
): Promise<ActionResult<{ fullName: string; defaultBranch: string; private: boolean }[]>> {
  const user = await requireRole("ADMIN")
  const key = cacheKey(user.id, "repos", kind)
  const cached = readCache<{ fullName: string; defaultBranch: string; private: boolean }[]>(key)
  if (cached) return { ok: true, data: cached }

  try {
    const provider = await getProviderForUser(user.id, kind)
    const repos = await provider.listRepos()
    const data = repos.map((r) => ({
      fullName: r.fullName,
      defaultBranch: r.defaultBranch,
      private: r.private,
    }))
    writeCache(key, data)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof MissingAccountError) {
      return { ok: false, error: err.message }
    }
    return { ok: false, error: err instanceof Error ? err.message : "Error al listar repos" }
  }
}

export async function listMyBranches(
  kind: GitProviderKind,
  repo: string
): Promise<ActionResult<string[]>> {
  const user = await requireRole("ADMIN")
  const key = cacheKey(user.id, "branches", `${kind}:${repo}`)
  const cached = readCache<string[]>(key)
  if (cached) return { ok: true, data: cached }

  try {
    const provider = await getProviderForUser(user.id, kind)
    const branches = await provider.listBranches(repo)
    writeCache(key, branches)
    return { ok: true, data: branches }
  } catch (err) {
    if (err instanceof MissingAccountError) {
      return { ok: false, error: err.message }
    }
    return { ok: false, error: err instanceof Error ? err.message : "Error al listar ramas" }
  }
}
