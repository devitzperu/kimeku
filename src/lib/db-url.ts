/**
 * Build PostgreSQL connection URL from individual env vars.
 * URL-encodes special chars in user/password automatically.
 */
export function buildDbUrl(env: NodeJS.ProcessEnv = process.env): string {
  const host = env.DB_HOST ?? "localhost"
  const port = env.DB_PORT ?? "5432"
  const user = encodeURIComponent(env.DB_USER ?? "postgres")
  const password = encodeURIComponent(env.DB_PASSWORD ?? "")
  const name = env.DB_NAME ?? "postgres"
  const schema = env.DB_SCHEMA ?? "public"
  const params = env.DB_PARAMS?.trim()

  let url = `postgresql://${user}:${password}@${host}:${port}/${name}?schema=${schema}`
  if (params) url += `&${params.replace(/^[?&]+/, "")}`
  return url
}
