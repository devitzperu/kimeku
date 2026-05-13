import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding…")

  // Default admin (only if no users exist)
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    const password = await bcrypt.hash("admin1234", 10)
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@doc-ia.local",
        password,
        role: "ADMIN",
      },
    })
    console.log("✓ Admin user created — admin@doc-ia.local / admin1234")
  } else {
    console.log("✓ Users exist — skipped admin creation")
  }

  // Demo client + portal user
  const demoClient = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: {
      id: "demo-client",
      name: "Cliente Demo",
      description: "Cliente de ejemplo para validar el portal externo.",
    },
  })
  const existingClientUser = await prisma.user.findUnique({
    where: { email: "cliente@demo.local" },
  })
  if (!existingClientUser) {
    const clientPass = await bcrypt.hash("cliente1234", 10)
    await prisma.user.create({
      data: {
        name: "Cliente Demo",
        email: "cliente@demo.local",
        password: clientPass,
        role: "CLIENT",
        clientId: demoClient.id,
      },
    })
    console.log("✓ Client portal user created — cliente@demo.local / cliente1234")
  } else {
    console.log("✓ Client portal user exists — skipped")
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
