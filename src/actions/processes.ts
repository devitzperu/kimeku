"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { processSchema, reorderSchema, type ProcessInput } from "@/lib/validations/process"
import { indexDoc, removeDoc } from "@/lib/search"
import { getProviderForUser } from "@/lib/git/factory"
import {
  GitConflictError,
  MissingAccountError,
  type GitProvider,
} from "@/lib/git/types"

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

async function nextOrder(parentId: string | null): Promise<number> {
  const last = await prisma.process.findFirst({
    where: { parentId: parentId ?? null },
    orderBy: { order: "desc" },
  })
  return (last?.order ?? -1) + 1
}

function joinPath(basePath: string, path: string): string {
  if (!basePath) return path
  return `${basePath.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

export async function createProcess(input: ProcessInput): Promise<ActionResult<{ id: string }>> {
  await requireRole("EDITOR")
  const parsed = processSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }

  const data = parsed.data
  const order = await nextOrder(data.parentId ?? null)

  const created = await prisma.$transaction(async (tx) => {
    const proc = await tx.process.create({
      data: {
        title: data.title,
        description: data.description || null,
        parentId: data.parentId ?? null,
        order,
        areas: { create: data.areaIds.map((areaId) => ({ areaId })) },
        clients: { create: data.clientIds.map((clientId) => ({ clientId })) },
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
        codeBlocks: {
          create: data.codeBlocks.map((cb, i) => ({
            language: cb.language,
            cachedCode: cb.code,
            description: cb.description ?? null,
            path: cb.path ?? null,
            order: i,
          })),
        },
        attachments: {
          create: data.attachments.map((a) => ({
            filename: a.filename,
            path: a.path,
            mimeType: a.mimeType,
            size: a.size,
          })),
        },
      },
    })
    return proc
  })

  revalidatePath("/procesos")
  if (data.parentId) revalidatePath(`/procesos/${data.parentId}`)

  await indexDoc({
    id: created.id,
    type: "process",
    title: data.title,
    body: data.description ?? "",
    href: `/procesos/${created.id}`,
  })

  return { ok: true, data: { id: created.id } }
}

export async function updateProcess(id: string, input: ProcessInput): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const parsed = processSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  const data = parsed.data

  const existing = await prisma.process.findUnique({
    where: { id },
    include: {
      areas: true,
      clients: true,
      tags: true,
      codeBlocks: { orderBy: { order: "asc" } },
      attachments: true,
      repoBinding: true,
    },
  })
  if (!existing) return { ok: false, error: "Proceso no encontrado" }

  const binding = existing.repoBinding

  // Git commits (if binding) are done BEFORE the DB transaction.
  // If any commit fails, no DB changes happen.
  type ResolvedBlock = {
    inputIdx: number
    language: string
    code: string
    description: string | null
    path: string | null
    order: number
    lastSha: string | null
    lastCommitSha: string | null
  }

  const resolved: ResolvedBlock[] = data.codeBlocks.map((cb, i) => ({
    inputIdx: i,
    language: cb.language,
    code: cb.code,
    description: cb.description ?? null,
    path: cb.path ?? null,
    order: i,
    lastSha: null,
    lastCommitSha: null,
  }))

  if (binding) {
    let provider: GitProvider
    try {
      provider = await getProviderForUser(user.id, binding.provider)
    } catch (err) {
      if (err instanceof MissingAccountError) return { ok: false, error: err.message }
      throw err
    }

    const existingByPath = new Map<string, (typeof existing.codeBlocks)[number]>()
    for (const cb of existing.codeBlocks) {
      if (cb.path) existingByPath.set(cb.path, cb)
    }

    const message =
      data.commitMessage?.trim() ||
      `kimeku: actualiza ${existing.title}`

    for (const r of resolved) {
      if (!r.path) continue
      const prev = existingByPath.get(r.path)
      const contentChanged = !prev || prev.cachedCode !== r.code

      if (!contentChanged && prev) {
        r.lastSha = prev.lastSha
        r.lastCommitSha = prev.lastCommitSha
        continue
      }

      const fullPath = joinPath(binding.basePath, r.path)
      try {
        const result = await provider.writeFile({
          repo: binding.repoFullName,
          path: fullPath,
          content: r.code,
          message,
          branch: binding.defaultBranch,
          prevSha: prev?.lastSha ?? null,
        })
        r.lastSha = result.sha
        r.lastCommitSha = result.commitSha
      } catch (err) {
        if (err instanceof GitConflictError) {
          return {
            ok: false,
            error: `Conflicto en ${r.path}: el archivo cambió en el repositorio. Recarga el proceso y reintenta.`,
          }
        }
        return {
          ok: false,
          error: `Error al guardar ${r.path}: ${err instanceof Error ? err.message : "error desconocido"}`,
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.processVersion.create({
      data: {
        processId: id,
        version: existing.version,
        editedById: user.id,
        note: binding ? data.commitMessage ?? null : null,
        data: {
          title: existing.title,
          description: existing.description,
          parentId: existing.parentId,
          areas: existing.areas,
          clients: existing.clients,
          tags: existing.tags,
          codeBlocks: binding
            ? existing.codeBlocks.map((c) => ({
                path: c.path,
                language: c.language,
                description: c.description,
                lastSha: c.lastSha,
                lastCommitSha: c.lastCommitSha,
              }))
            : existing.codeBlocks,
          attachments: existing.attachments,
        },
      },
    })

    await tx.process.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        parentId: data.parentId ?? null,
        version: { increment: 1 },
        areas: { deleteMany: {}, create: data.areaIds.map((areaId) => ({ areaId })) },
        clients: { deleteMany: {}, create: data.clientIds.map((clientId) => ({ clientId })) },
        tags: { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) },
      },
    })

    await tx.processCode.deleteMany({ where: { processId: id } })
    if (resolved.length > 0) {
      await tx.processCode.createMany({
        data: resolved.map((r) => ({
          processId: id,
          language: r.language,
          cachedCode: r.code,
          description: r.description,
          path: r.path,
          lastSha: r.lastSha,
          lastCommitSha: r.lastCommitSha,
          order: r.order,
        })),
      })
    }

    await tx.attachment.deleteMany({ where: { processId: id } })
    if (data.attachments.length) {
      await tx.attachment.createMany({
        data: data.attachments.map((a) => ({
          processId: id,
          filename: a.filename,
          path: a.path,
          mimeType: a.mimeType,
          size: a.size,
        })),
      })
    }
  })

  revalidatePath("/procesos")
  revalidatePath(`/procesos/${id}`)

  await indexDoc({
    id,
    type: "process",
    title: data.title,
    body: data.description ?? "",
    href: `/procesos/${id}`,
  })

  return { ok: true }
}

export async function deleteProcess(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await prisma.process.delete({ where: { id } })
  revalidatePath("/procesos")
  await removeDoc("process", id)
  return { ok: true }
}

export async function reorderProcesses(parentId: string | null, ids: string[]): Promise<ActionResult> {
  await requireRole("EDITOR")
  const parsed = reorderSchema.safeParse({ parentId, ids })
  if (!parsed.success) return { ok: false, error: "Inválido" }

  await prisma.$transaction(
    parsed.data.ids.map((id, idx) =>
      prisma.process.update({
        where: { id },
        data: { order: idx, parentId: parsed.data.parentId },
      })
    )
  )

  revalidatePath("/procesos")
  if (parentId) revalidatePath(`/procesos/${parentId}`)
  return { ok: true }
}

export async function moveProcess(id: string, newParentId: string | null): Promise<ActionResult> {
  await requireRole("EDITOR")
  if (newParentId) {
    let cur: string | null = newParentId
    while (cur) {
      if (cur === id) return { ok: false, error: "No se puede mover dentro de un descendiente" }
      const parentRow: { parentId: string | null } | null = await prisma.process.findUnique({
        where: { id: cur },
        select: { parentId: true },
      })
      cur = parentRow?.parentId ?? null
    }
  }
  const order = await nextOrder(newParentId)
  await prisma.process.update({
    where: { id },
    data: { parentId: newParentId, order },
  })
  revalidatePath("/procesos")
  return { ok: true }
}

export interface CodeBlockView {
  id: string
  language: string
  code: string
  description: string | null
  path: string | null
  lastSha: string | null
  lastCommitSha: string | null
  stale: boolean
  webUrl: string | null
}

export async function getProcessCodeBlocks(
  processId: string,
  opts: { fresh?: boolean; userId?: string } = {}
): Promise<{ blocks: CodeBlockView[]; bindingActive: boolean; staleProvider: boolean }> {
  const process = await prisma.process.findUnique({
    where: { id: processId },
    include: {
      codeBlocks: { orderBy: { order: "asc" } },
      repoBinding: true,
    },
  })
  if (!process) return { blocks: [], bindingActive: false, staleProvider: false }

  const binding = process.repoBinding
  if (!binding) {
    return {
      blocks: process.codeBlocks.map((c) => ({
        id: c.id,
        language: c.language,
        code: c.cachedCode,
        description: c.description,
        path: c.path,
        lastSha: c.lastSha,
        lastCommitSha: c.lastCommitSha,
        stale: false,
        webUrl: null,
      })),
      bindingActive: false,
      staleProvider: false,
    }
  }

  if (!opts.fresh || !opts.userId) {
    return {
      blocks: process.codeBlocks.map((c) => ({
        id: c.id,
        language: c.language,
        code: c.cachedCode,
        description: c.description,
        path: c.path,
        lastSha: c.lastSha,
        lastCommitSha: c.lastCommitSha,
        stale: false,
        webUrl: null,
      })),
      bindingActive: true,
      staleProvider: false,
    }
  }

  let provider: GitProvider | null = null
  try {
    provider = await getProviderForUser(opts.userId, binding.provider)
  } catch {
    provider = null
  }

  const blocks: CodeBlockView[] = []
  let staleAny = false

  for (const c of process.codeBlocks) {
    if (!c.path || !provider) {
      blocks.push({
        id: c.id,
        language: c.language,
        code: c.cachedCode,
        description: c.description,
        path: c.path,
        lastSha: c.lastSha,
        lastCommitSha: c.lastCommitSha,
        stale: !!c.path,
        webUrl: c.path
          ? webUrlFor(binding.provider, binding.repoFullName, joinPath(binding.basePath, c.path), binding.defaultBranch)
          : null,
      })
      if (c.path) staleAny = true
      continue
    }

    const fullPath = joinPath(binding.basePath, c.path)
    try {
      const fresh = await provider.readFile(binding.repoFullName, fullPath, binding.defaultBranch)
      if (fresh.sha !== c.lastSha || fresh.content !== c.cachedCode) {
        await prisma.processCode.update({
          where: { id: c.id },
          data: {
            cachedCode: fresh.content,
            lastSha: fresh.sha,
            lastCommitSha: fresh.commitSha || c.lastCommitSha,
          },
        })
      }
      blocks.push({
        id: c.id,
        language: c.language,
        code: fresh.content,
        description: c.description,
        path: c.path,
        lastSha: fresh.sha,
        lastCommitSha: fresh.commitSha || c.lastCommitSha,
        stale: false,
        webUrl: provider.fileWebUrl(binding.repoFullName, fullPath, binding.defaultBranch),
      })
    } catch {
      staleAny = true
      blocks.push({
        id: c.id,
        language: c.language,
        code: c.cachedCode,
        description: c.description,
        path: c.path,
        lastSha: c.lastSha,
        lastCommitSha: c.lastCommitSha,
        stale: true,
        webUrl: provider.fileWebUrl(binding.repoFullName, fullPath, binding.defaultBranch),
      })
    }
  }

  return { blocks, bindingActive: true, staleProvider: staleAny }
}

function webUrlFor(
  provider: "GITHUB" | "GITLAB",
  repo: string,
  path: string,
  branch: string
): string {
  const encodedPath = path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
  if (provider === "GITHUB") {
    return `https://github.com/${repo}/blob/${encodeURIComponent(branch)}/${encodedPath}`
  }
  return `https://gitlab.com/${repo}/-/blob/${encodeURIComponent(branch)}/${encodedPath}`
}
