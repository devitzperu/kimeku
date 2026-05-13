import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const STATE_VERSION = "v1"

function getSecret(): string {
  const sec = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!sec) throw new Error("NEXTAUTH_SECRET/AUTH_SECRET no configurado")
  return sec
}

export function signState(userId: string): string {
  const nonce = randomBytes(12).toString("base64url")
  const ts = Math.floor(Date.now() / 1000)
  const payload = `${STATE_VERSION}.${userId}.${ts}.${nonce}`
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verifyState(state: string, maxAgeSeconds = 600): { userId: string } | null {
  const parts = state.split(".")
  if (parts.length !== 5) return null
  const [version, userId, tsStr, nonce, sig] = parts
  if (version !== STATE_VERSION) return null
  const payload = `${version}.${userId}.${tsStr}.${nonce}`
  const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  if (sig.length !== expectedSig.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null
  } catch {
    return null
  }
  const ts = Number(tsStr)
  if (!Number.isFinite(ts)) return null
  const now = Math.floor(Date.now() / 1000)
  if (now - ts > maxAgeSeconds) return null
  return { userId }
}
