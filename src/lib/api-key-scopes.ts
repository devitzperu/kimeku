export const SCOPES = [
  "read:processes",
  "write:processes",
  "read:bitacora",
  "write:bitacora",
  "read:historial",
  "write:historial",
  "execute:flows",
] as const

export type Scope = (typeof SCOPES)[number]
