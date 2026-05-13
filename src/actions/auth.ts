"use server"

import { redirect } from "next/navigation"
import { AuthError as NextAuthError } from "next-auth"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"
import { loginSchema, registerSchema } from "@/lib/validations/auth"

export type ActionState =
  | { ok: true }
  | { ok: false; error: string; fields?: Record<string, string> }

export async function loginAction(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fields: parsed.error.flatten().fieldErrors as never }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (err) {
    if (err instanceof NextAuthError) {
      return { ok: false, error: "Credenciales inválidas" }
    }
    throw err
  }

  redirect("/")
}

export async function registerAction(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fields: parsed.error.flatten().fieldErrors as never }
  }

  const { name, email, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { ok: false, error: "Email ya registrado" }
  }

  // First user becomes admin
  const userCount = await prisma.user.count()
  const role = userCount === 0 ? "ADMIN" : "VIEWER"

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { name, email, password: hashed, role },
  })

  try {
    await signIn("credentials", { email, password, redirect: false })
  } catch (err) {
    if (err instanceof NextAuthError) {
      return { ok: false, error: "Cuenta creada pero falló login automático" }
    }
    throw err
  }

  redirect("/")
}

export async function logoutAction() {
  const { signOut } = await import("@/lib/auth")
  await signOut({ redirect: false })
  redirect("/login")
}
