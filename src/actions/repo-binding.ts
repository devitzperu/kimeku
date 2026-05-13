"use server"

import { revalidatePath } from "next/cache"
import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { encryptOptional, decryptOptional } from "@/lib/crypto"
import { getProviderForUser } from "@/lib/git/factory"
import { createWebhook, deleteWebhook } from "@/lib/git/webhooks"
import { getAppBaseUrl } from "@/lib/git/oauth-config"
import { MissingAccountError, GitConflictError } from "@/lib/git/types"
import { repoBindingSchema, type RepoBindingInput } from "@/lib/validations/repo-binding"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

function defaultExtForLanguage(lang: string): string {
  const map: Record<string, string> = {
    sql: "sql",
    javascript: "js",
    typescript: "ts",
    python: "py",
    bash: "sh",
    shell: "sh",
    powershell: "ps1",
    json: "json",
    yaml: "yml",
    html: "html",
    css: "css",
    go: "go",
    rust: "rs",
    java: "java",
    csharp: "cs",
    php: "php",
    ruby: "rb",
  }
  return map[lang] ?? "txt"
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export async function bindProcessToRepo(args: {
  processId: string
  input: RepoBindingInput
  migrateExistingCode?: boolean
}): Promise<ActionResult<{ bindingId: string }>> {
  const user = await requireRole("EDITOR")
  const parsed = repoBindingSchema.safeParse(args.input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const data = parsed.data

  const process = await prisma.process.findUnique({
    where: { id: args.processId },
    include: {
      codeBlocks: { orderBy: { order: "asc" } },
      repoBinding: true,
    },
  })
  if (!process) return { ok: false, error: "Proceso no encontrado" }

  let provider
  try {
    provider = await getProviderForUser(user.id, data.provider)
  } catch (err) {
    if (err instanceof MissingAccountError) return { ok: false, error: err.message }
    throw err
  }

  let webhookId: string | null = null
  let webhookSecretEncrypted: string | null = null

  const existingBinding = process.repoBinding

  if (existingBinding?.webhookActive && existingBinding.webhookId) {
    const accountFor = await prisma.account.findFirst({
      where: { userId: user.id, provider: existingBinding.provider.toLowerCase() },
    })
    if (accountFor?.access_token) {
      const tok = decryptOptional(accountFor.access_token) as string
      await deleteWebhook(
        tok,
        existingBinding.provider,
        existingBinding.repoFullName,
        existingBinding.webhookId
      ).catch(() => {})
    }
  }

  if (data.enableWebhook) {
    const secret = randomBytes(32).toString("base64url")
    const baseUrl = getAppBaseUrl()
    const callbackUrl = `${baseUrl}/api/integrations/webhooks/${data.provider.toLowerCase()}`
    const accountFor = await prisma.account.findFirst({
      where: { userId: user.id, provider: data.provider.toLowerCase() },
    })
    if (!accountFor?.access_token) {
      return { ok: false, error: "Cuenta del provider no encontrada" }
    }
    const tok = decryptOptional(accountFor.access_token) as string
    try {
      const created = await createWebhook(tok, data.provider, {
        repo: data.repoFullName,
        callbackUrl,
        secret,
      })
      webhookId = created.id
      webhookSecretEncrypted = encryptOptional(secret)
    } catch (err) {
      return {
        ok: false,
        error: `No se pudo registrar webhook: ${err instanceof Error ? err.message : "error"}`,
      }
    }
  }

  const binding = await prisma.repoBinding.upsert({
    where: { processId: args.processId },
    create: {
      processId: args.processId,
      provider: data.provider,
      repoFullName: data.repoFullName,
      defaultBranch: data.defaultBranch,
      basePath: data.basePath,
      webhookId,
      webhookSecret: webhookSecretEncrypted,
      webhookActive: !!webhookId,
      createdById: user.id,
    },
    update: {
      provider: data.provider,
      repoFullName: data.repoFullName,
      defaultBranch: data.defaultBranch,
      basePath: data.basePath,
      webhookId,
      webhookSecret: webhookSecretEncrypted,
      webhookActive: !!webhookId,
    },
  })

  if (args.migrateExistingCode && process.codeBlocks.length > 0) {
    const updates: { id: string; path: string; lastSha: string; lastCommitSha: string }[] = []
    for (let i = 0; i < process.codeBlocks.length; i++) {
      const cb = process.codeBlocks[i]
      const existingPath = cb.path
      const ext = defaultExtForLanguage(cb.language)
      const baseName = cb.description ? slugify(cb.description) : `${slugify(cb.language)}-${i + 1}`
      const path = existingPath ?? `${baseName || `block-${i + 1}`}.${ext}`
      const fullPath = data.basePath ? `${data.basePath}/${path}` : path
      try {
        const result = await provider.writeFile({
          repo: data.repoFullName,
          path: fullPath,
          content: cb.cachedCode,
          message: `kimeku: migra ${process.title} (${path})`,
          branch: data.defaultBranch,
        })
        updates.push({
          id: cb.id,
          path,
          lastSha: result.sha,
          lastCommitSha: result.commitSha,
        })
      } catch (err) {
        if (err instanceof GitConflictError) {
          return {
            ok: false,
            error: `Conflicto al subir ${path}. ¿Existía con sha distinto? ${err.message}`,
          }
        }
        return {
          ok: false,
          error: `Error subiendo ${path}: ${err instanceof Error ? err.message : "error"}`,
        }
      }
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.processCode.update({
          where: { id: u.id },
          data: { path: u.path, lastSha: u.lastSha, lastCommitSha: u.lastCommitSha },
        })
      )
    )
  }

  revalidatePath(`/procesos/${args.processId}`)
  revalidatePath(`/procesos/${args.processId}/edit`)
  return { ok: true, data: { bindingId: binding.id } }
}

export async function unbindProcess(processId: string): Promise<ActionResult> {
  const user = await requireRole("ADMIN")
  const binding = await prisma.repoBinding.findUnique({ where: { processId } })
  if (!binding) return { ok: true }

  if (binding.webhookActive && binding.webhookId) {
    const accountFor = await prisma.account.findFirst({
      where: { userId: user.id, provider: binding.provider.toLowerCase() },
    })
    if (accountFor?.access_token) {
      const tok = decryptOptional(accountFor.access_token) as string
      await deleteWebhook(tok, binding.provider, binding.repoFullName, binding.webhookId).catch(
        () => {}
      )
    }
  }

  await prisma.repoBinding.delete({ where: { processId } })
  await prisma.processCode.updateMany({
    where: { processId },
    data: { path: null, lastSha: null, lastCommitSha: null },
  })

  revalidatePath(`/procesos/${processId}`)
  revalidatePath(`/procesos/${processId}/edit`)
  return { ok: true }
}
