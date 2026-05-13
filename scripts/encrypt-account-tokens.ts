/**
 * Migración one-shot idempotente: cifra Account.access_token, refresh_token, id_token
 * que aún están en texto plano. Detecta prefijo `enc:v1:` para no recifrar.
 *
 * Uso: pnpm tsx scripts/encrypt-account-tokens.ts
 *      (o con env loader: node scripts/with-db.mjs pnpm tsx scripts/encrypt-account-tokens.ts)
 */
import { PrismaClient } from "@prisma/client"
import { encryptOptional, isEncrypted, assertCryptoConfigured } from "../src/lib/crypto"

async function main() {
  assertCryptoConfigured()

  const prisma = new PrismaClient()
  const accounts = await prisma.account.findMany({
    select: { id: true, access_token: true, refresh_token: true, id_token: true },
  })

  let updated = 0
  let skipped = 0

  for (const acc of accounts) {
    const patch: Record<string, string | null> = {}
    let touched = false

    for (const field of ["access_token", "refresh_token", "id_token"] as const) {
      const value = acc[field]
      if (value && !isEncrypted(value)) {
        patch[field] = encryptOptional(value)
        touched = true
      }
    }

    if (touched) {
      await prisma.account.update({ where: { id: acc.id }, data: patch })
      updated++
    } else {
      skipped++
    }
  }

  console.log(`Done. Updated=${updated}, Skipped=${skipped}, Total=${accounts.length}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
