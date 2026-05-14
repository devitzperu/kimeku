export type Strength = { level: 0 | 1 | 2 | 3 | 4; label: string }

export function scorePassword(pwd: string): Strength {
  if (!pwd) return { level: 0, label: "" }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  const level = Math.min(4, score) as Strength["level"]
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"]
  return { level, label: labels[level] }
}
