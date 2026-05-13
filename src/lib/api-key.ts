import { randomBytes, createHash } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import type { Scope } from "@/lib/api-key-scopes"

export { SCOPES, type Scope } from "@/lib/api-key-scopes"

const PREFIX = "dia"

/** Generate new API key. Returns plaintext (show once) + record fields to store. */
export function generateApiKey() {
  const random = randomBytes(24).toString("base64url")
  const prefix = `${PREFIX}_${randomBytes(4).toString("base64url")}`
  const plaintext = `${prefix}_${random}`
  return { plaintext, prefix }
}

/** Hash a plaintext key for storage. Uses bcrypt for slow comparison. */
export async function hashApiKey(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 10)
}

/** Quick fingerprint for fast lookup (sha256). */
export function fingerprint(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex").slice(0, 32)
}

/** Verify candidate key against DB. Returns user/scope if valid, else null. */
export async function verifyApiKey(plaintext: string) {
  if (!plaintext.startsWith(`${PREFIX}_`)) return null
  const prefix = plaintext.split("_").slice(0, 2).join("_")

  const key = await prisma.apiKey.findFirst({
    where: { prefix, revokedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  if (!key) return null
  if (key.expiresAt && key.expiresAt < new Date()) return null

  const ok = await bcrypt.compare(plaintext, key.hashedKey)
  if (!ok) return null

  // Touch lastUsedAt async (don't await)
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return {
    keyId: key.id,
    user: key.user,
    scopes: key.scopes as Scope[],
  }
}
