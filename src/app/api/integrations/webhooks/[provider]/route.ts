import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { decryptOptional } from "@/lib/crypto"
import { providerKind } from "@/lib/git/oauth-config"
import { verifyGithubSignature, verifyGitlabSignature } from "@/lib/git/webhooks"

interface GhPushPayload {
  ref: string
  repository: { full_name: string }
  head_commit?: { id: string } | null
  commits?: { id: string; added: string[]; modified: string[]; removed: string[] }[]
}

interface GlPushPayload {
  object_kind: "push"
  ref: string
  project: { path_with_namespace: string; id: number }
  after?: string
  commits?: { id: string; added: string[]; modified: string[]; removed: string[] }[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const kind = providerKind(provider)
  if (!kind) return NextResponse.json({ error: "provider" }, { status: 400 })

  const rawBody = await req.text()

  let repoFullName: string
  let ref: string
  let headSha: string | null
  let touchedPaths: Set<string>

  try {
    if (kind === "GITHUB") {
      const data = JSON.parse(rawBody) as GhPushPayload
      repoFullName = data.repository.full_name
      ref = data.ref
      headSha = data.head_commit?.id ?? null
      touchedPaths = collectGhPaths(data)
    } else {
      const data = JSON.parse(rawBody) as GlPushPayload
      repoFullName = data.project.path_with_namespace
      ref = data.ref
      headSha = data.after ?? null
      touchedPaths = collectGlPaths(data)
    }
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const bindings = await prisma.repoBinding.findMany({
    where: { provider: kind, repoFullName, webhookActive: true },
    include: { process: { include: { codeBlocks: true } } },
  })
  if (bindings.length === 0) {
    return NextResponse.json({ ok: true, matched: 0 })
  }

  let processed = 0

  for (const binding of bindings) {
    const secret = decryptOptional(binding.webhookSecret)
    if (!secret) continue

    const valid =
      kind === "GITHUB"
        ? verifyGithubSignature(rawBody, req.headers.get("x-hub-signature-256"), secret)
        : verifyGitlabSignature(req.headers.get("x-gitlab-token"), secret)

    if (!valid) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 })
    }

    const expectedRef = `refs/heads/${binding.defaultBranch}`
    if (ref !== expectedRef) continue

    const affected = binding.process.codeBlocks.filter((cb) => {
      if (!cb.path) return false
      const full = binding.basePath ? `${binding.basePath}/${cb.path}` : cb.path
      return touchedPaths.has(full) || touchedPaths.has(full.replace(/^\/+/, ""))
    })

    if (affected.length === 0) continue

    const allAlreadySynced = headSha
      ? affected.every((cb) => cb.lastCommitSha === headSha)
      : false
    if (allAlreadySynced) continue

    if (headSha) {
      await prisma.processCode.updateMany({
        where: { id: { in: affected.map((a) => a.id) } },
        data: { lastCommitSha: headSha, lastSha: null },
      })
    }

    revalidatePath(`/procesos/${binding.processId}`)
    processed++
  }

  return NextResponse.json({ ok: true, matched: bindings.length, processed })
}

function collectGhPaths(data: GhPushPayload): Set<string> {
  const out = new Set<string>()
  for (const c of data.commits ?? []) {
    for (const p of c.added ?? []) out.add(p)
    for (const p of c.modified ?? []) out.add(p)
    for (const p of c.removed ?? []) out.add(p)
  }
  return out
}

function collectGlPaths(data: GlPushPayload): Set<string> {
  const out = new Set<string>()
  for (const c of data.commits ?? []) {
    for (const p of c.added ?? []) out.add(p)
    for (const p of c.modified ?? []) out.add(p)
    for (const p of c.removed ?? []) out.add(p)
  }
  return out
}
