import "next-auth"
import "next-auth/jwt"

type AppRole = "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT"

declare module "next-auth" {
  interface User {
    role?: AppRole
    clientId?: string | null
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: AppRole
      clientId?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: AppRole
    clientId?: string | null
  }
}
