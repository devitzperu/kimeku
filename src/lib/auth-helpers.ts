import { auth } from "@/lib/auth"
import type { Role } from "@prisma/client"

const RANK: Record<Role, number> = { ADMIN: 3, EDITOR: 2, VIEWER: 1, CLIENT: 0 }

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new AuthError("Unauthorized", 401)
  return session.user
}

export async function requireRole(min: Role) {
  const user = await requireAuth()
  const userRank = RANK[user.role as Role] ?? 0
  const minRank = RANK[min]
  if (userRank < minRank) throw new AuthError("Forbidden", 403)
  if (min !== "CLIENT" && user.role === "CLIENT") throw new AuthError("Forbidden", 403)
  return user
}

export async function requireClientRole() {
  const user = await requireAuth()
  if (user.role !== "CLIENT") throw new AuthError("Forbidden", 403)
  if (!user.clientId) throw new AuthError("Cliente no asignado", 403)
  return user as typeof user & { clientId: string }
}

export function hasRole(role: Role | undefined, min: Role) {
  return (RANK[role as Role] ?? 0) >= RANK[min]
}

export function isClientRole(role: Role | undefined) {
  return role === "CLIENT"
}
