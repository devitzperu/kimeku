import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ENV_VAR = "INTEGRATIONS_ENCRYPTION_KEY"
const VERSION = "v1"
const PREFIX = `enc:${VERSION}:`
const ALGO = "aes-256-gcm"
const IV_LENGTH = 12
const KEY_LENGTH = 32

let cachedKey: Buffer | null = null

function loadKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env[ENV_VAR]
  if (!raw) {
    throw new Error(
      `Missing ${ENV_VAR} env var. Generate with: openssl rand -base64 32`
    )
  }
  let buf: Buffer
  try {
    buf = Buffer.from(raw, "base64")
  } catch {
    throw new Error(`${ENV_VAR} must be base64-encoded`)
  }
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `${ENV_VAR} must decode to ${KEY_LENGTH} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    )
  }
  cachedKey = buf
  return buf
}

export function isEncrypted(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(PREFIX)
}

export function encrypt(plaintext: string): string {
  const key = loadKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([enc, tag])
  return `${PREFIX}${iv.toString("base64")}:${payload.toString("base64")}`
}

export function decrypt(token: string): string {
  if (!isEncrypted(token)) {
    throw new Error("Value is not encrypted with the expected scheme")
  }
  const body = token.slice(PREFIX.length)
  const sepIdx = body.indexOf(":")
  if (sepIdx === -1) throw new Error("Malformed encrypted token")
  const iv = Buffer.from(body.slice(0, sepIdx), "base64")
  const payload = Buffer.from(body.slice(sepIdx + 1), "base64")
  if (iv.length !== IV_LENGTH) throw new Error("Invalid IV length")
  if (payload.length < 17) throw new Error("Payload too short")
  const tag = payload.subarray(payload.length - 16)
  const enc = payload.subarray(0, payload.length - 16)
  const key = loadKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString("utf8")
}

export function encryptOptional(value: string | null | undefined): string | null {
  if (value == null) return null
  if (isEncrypted(value)) return value
  return encrypt(value)
}

export function decryptOptional(value: string | null | undefined): string | null {
  if (value == null) return null
  if (!isEncrypted(value)) return value
  return decrypt(value)
}

export function assertCryptoConfigured(): void {
  loadKey()
}
