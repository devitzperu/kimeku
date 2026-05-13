import type { Adapter, AdapterAccount } from "next-auth/adapters"
import { encryptOptional } from "@/lib/crypto"

const ENCRYPTED_FIELDS: (keyof AdapterAccount)[] = [
  "access_token",
  "refresh_token",
  "id_token",
]

function encryptAccount(account: AdapterAccount): AdapterAccount {
  const next = { ...account } as Record<string, unknown>
  for (const field of ENCRYPTED_FIELDS) {
    const value = account[field]
    if (typeof value === "string") {
      next[field as string] = encryptOptional(value)
    }
  }
  return next as AdapterAccount
}

export function withEncryptedAccountTokens(adapter: Adapter): Adapter {
  const wrapped: Adapter = { ...adapter }

  if (adapter.linkAccount) {
    const original = adapter.linkAccount.bind(adapter)
    wrapped.linkAccount = (async (account: AdapterAccount) => {
      const encrypted = encryptAccount(account)
      return original(encrypted)
    }) as Adapter["linkAccount"]
  }

  return wrapped
}
