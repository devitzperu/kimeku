import {
  GitAuthError,
  GitConflictError,
  GitForbiddenError,
  GitNotFoundError,
  type GitCommit,
  type GitFileRead,
  type GitFileWrite,
  type GitProvider,
  type GitRepoSummary,
} from "./types"

const API = "https://gitlab.com/api/v4"
const WEB = "https://gitlab.com"

interface GlFileRes {
  content: string
  encoding: string
  blob_id: string
  last_commit_id: string
}

interface GlCommitRes {
  id: string
  message: string
  author_name: string
  author_email: string
  authored_date: string
  web_url: string
}

interface GlProjectRes {
  id: number
  path_with_namespace: string
  default_branch: string | null
  web_url: string
  visibility: string
}

interface GlBranchRes {
  name: string
}

interface GlWriteRes {
  file_path: string
  branch: string
}

function glHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "kimeku-app",
  }
}

async function glFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...glHeaders(token), ...(init?.headers ?? {}) },
  })
  if (res.ok) {
    if (res.status === 204) return undefined as unknown as T
    return (await res.json()) as T
  }
  const body = await res.text().catch(() => "")
  if (res.status === 401) throw new GitAuthError()
  if (res.status === 403) throw new GitForbiddenError(extractMsg(body) ?? "GitLab denegó el acceso")
  if (res.status === 404) throw new GitNotFoundError(extractMsg(body) ?? "GitLab: no encontrado")
  if (res.status === 400 && body.includes("changed")) throw new GitConflictError()
  if (res.status === 409) throw new GitConflictError()
  throw new Error(`GitLab ${res.status}: ${extractMsg(body) ?? res.statusText}`)
}

function extractMsg(body: string): string | null {
  try {
    const j = JSON.parse(body) as { message?: string | Record<string, unknown>; error?: string }
    if (typeof j.message === "string") return j.message
    if (j.error) return j.error
    if (j.message) return JSON.stringify(j.message)
    return null
  } catch {
    return null
  }
}

function encId(id: string): string {
  return encodeURIComponent(id)
}

export function createGitlabProvider(token: string): GitProvider {
  return {
    kind: "GITLAB",

    async whoami() {
      const u = await glFetch<{ username: string; email: string | null; name: string | null }>(
        token,
        "/user"
      )
      return { login: u.username, email: u.email, name: u.name }
    },

    async listRepos() {
      const projects = await glFetch<GlProjectRes[]>(
        token,
        "/projects?membership=true&per_page=100&order_by=updated_at"
      )
      return projects.map<GitRepoSummary>((p) => ({
        fullName: p.path_with_namespace,
        defaultBranch: p.default_branch ?? "main",
        url: p.web_url,
        private: p.visibility !== "public",
      }))
    },

    async listBranches(repo) {
      const branches = await glFetch<GlBranchRes[]>(
        token,
        `/projects/${encId(repo)}/repository/branches?per_page=100`
      )
      return branches.map((b) => b.name)
    },

    async readFile(repo, path, ref): Promise<GitFileRead> {
      const data = await glFetch<GlFileRes>(
        token,
        `/projects/${encId(repo)}/repository/files/${encId(path)}?ref=${encodeURIComponent(ref)}`
      )
      const content =
        data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf8")
          : data.content
      return {
        content,
        sha: data.blob_id,
        commitSha: data.last_commit_id,
      }
    },

    async writeFile({ repo, path, content, message, branch, prevSha }): Promise<GitFileWrite> {
      const body: Record<string, unknown> = {
        branch,
        content,
        commit_message: message,
        encoding: "text",
      }
      if (prevSha) body.last_commit_id = prevSha

      const exists = await fileExists(token, repo, path, branch)
      const method = exists ? "PUT" : "POST"
      await glFetch<GlWriteRes>(
        token,
        `/projects/${encId(repo)}/repository/files/${encId(path)}`,
        {
          method,
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      )

      const fresh = await glFetch<GlFileRes>(
        token,
        `/projects/${encId(repo)}/repository/files/${encId(path)}?ref=${encodeURIComponent(branch)}`
      )
      return { sha: fresh.blob_id, commitSha: fresh.last_commit_id }
    },

    async listCommits(repo, path, branch, limit = 30) {
      const commits = await glFetch<GlCommitRes[]>(
        token,
        `/projects/${encId(repo)}/repository/commits?path=${encodeURIComponent(path)}&ref_name=${encodeURIComponent(branch)}&per_page=${limit}`
      )
      return commits.map<GitCommit>((c) => ({
        sha: c.id,
        message: c.message,
        authorName: c.author_name,
        authorEmail: c.author_email,
        date: c.authored_date,
        url: c.web_url,
      }))
    },

    fileWebUrl(repo, path, branch) {
      return `${WEB}/${repo}/-/blob/${encodeURIComponent(branch)}/${path
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/")}`
    },

    commitWebUrl(repo, commitSha) {
      return `${WEB}/${repo}/-/commit/${commitSha}`
    },
  }
}

async function fileExists(
  token: string,
  repo: string,
  path: string,
  branch: string
): Promise<boolean> {
  try {
    await glFetch<GlFileRes>(
      token,
      `/projects/${encId(repo)}/repository/files/${encId(path)}?ref=${encodeURIComponent(branch)}`
    )
    return true
  } catch (err) {
    if (err instanceof GitNotFoundError) return false
    throw err
  }
}
