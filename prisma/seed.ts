import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name} env. Set it in .env before seeding.`)
  }
  return value.trim()
}

function optionalEnv(name: string, fallback: string): string {
  return (process.env[name] ?? "").trim() || fallback
}

async function main() {
  console.log("Seeding…")

  const adminEmail = requireEnv("SEED_ADMIN_EMAIL")
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD")
  const adminName = optionalEnv("SEED_ADMIN_NAME", "Admin")
  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.")
  }

  // Default admin (only if no users exist)
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    const password = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password,
        role: "ADMIN",
      },
    })
    console.log(`✓ Admin user created — ${adminEmail}`)
  } else {
    console.log("✓ Users exist — skipped admin creation")
  }

  // Optional demo client + portal user. Skipped if env vars missing.
  const demoClientEmail = (process.env.SEED_DEMO_CLIENT_EMAIL ?? "").trim()
  const demoClientPassword = (process.env.SEED_DEMO_CLIENT_PASSWORD ?? "").trim()
  if (demoClientEmail && demoClientPassword) {
    if (demoClientPassword.length < 8) {
      throw new Error("SEED_DEMO_CLIENT_PASSWORD must be at least 8 characters.")
    }
    const demoClientName = optionalEnv("SEED_DEMO_CLIENT_NAME", "Cliente Demo")
    const demoClient = await prisma.client.upsert({
      where: { id: "demo-client" },
      update: {},
      create: {
        id: "demo-client",
        name: demoClientName,
        description: "Cliente de ejemplo para validar el portal externo.",
      },
    })
    const existingClientUser = await prisma.user.findUnique({
      where: { email: demoClientEmail },
    })
    if (!existingClientUser) {
      const clientPass = await bcrypt.hash(demoClientPassword, 10)
      await prisma.user.create({
        data: {
          name: demoClientName,
          email: demoClientEmail,
          password: clientPass,
          role: "CLIENT",
          clientId: demoClient.id,
        },
      })
      console.log(`✓ Client portal user created — ${demoClientEmail}`)
    } else {
      console.log("✓ Client portal user exists — skipped")
    }
  } else {
    console.log("✓ Demo client seed skipped (SEED_DEMO_CLIENT_EMAIL/PASSWORD unset)")
  }

  // Default tags
  const defaultTags = [
    { name: "urgente", color: "#c2664a" },
    { name: "rutinario", color: "#6b8a6e" },
    { name: "documentación", color: "#5b7a99" },
    { name: "automatizable", color: "#a87a3a" },
    { name: "manual", color: "#8a6b8a" },
  ]
  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
  }
  console.log(`✓ ${defaultTags.length} default tags ready`)

  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
