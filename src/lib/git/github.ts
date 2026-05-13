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

const API = "https://api.github.com"

interface GhContentRes {
  content: string
  sha: string
  encoding: string
}

interface GhCommitRes {
  sha: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
  }
  author: { login: string } | null
  html_url: string
}

interface GhRepoRes {
  full_name: string
  default_branch: string
  html_url: string
  private: boolean
}

interface GhBranchRes {
  name: string
}

interface GhPutRes {
  content: { sha: string }
  commit: { sha: string }
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kimeku-app",
  }
}

async function ghFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...ghHeaders(token), ...(init?.headers ?? {}) },
  })
  if (res.ok) return (await res.json()) as T
  const body = await res.text().catch(() => "")
  if (res.status === 401) throw new GitAuthError()
  if (res.status === 403) throw new GitForbiddenError(extractMsg(body) ?? "GitHub denegó el acceso")
  if (res.status === 404) throw new GitNotFoundError(extractMsg(body) ?? "GitHub: no encontrado")
  if (res.status === 409 || res.status === 422) {
    throw new GitConflictError(extractMsg(body) ?? "GitHub: conflicto")
  }
  throw new Error(`GitHub ${res.status}: ${extractMsg(body) ?? res.statusText}`)
}

function extractMsg(body: string): string | null {
  try {
    const j = JSON.parse(body) as { message?: string }
    return j.message ?? null
  } catch {
    return null
  }
}

function encodePath(p: string): string {
  return p
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
}

export function createGithubProvider(token: string): GitProvider {
  return {
    kind: "GITHUB",

    async whoami() {
      const u = await ghFetch<{ login: string; email: string | null; name: string | null }>(
        token,
        "/user"
      )
      return { login: u.login, email: u.email, name: u.name }
    },

    async listRepos() {
      const repos = await ghFetch<GhRepoRes[]>(
        token,
        "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
      )
      return repos.map<GitRepoSummary>((r) => ({
        fullName: r.full_name,
        defaultBranch: r.default_branch,
        url: r.html_url,
        private: r.private,
      }))
    },

    async listBranches(repo) {
      const data = await ghFetch<GhBranchRes[]>(
        token,
        `/repos/${repo}/branches?per_page=100`
      )
      return data.map((b) => b.name)
    },

    async readFile(repo, path, ref): Promise<GitFileRead> {
      const data = await ghFetch<GhContentRes>(
        token,
        `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`
      )
      const content =
        data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf8")
          : data.content
      const commits = await ghFetch<GhCommitRes[]>(
        token,
        `/repos/${repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(ref)}&per_page=1`
      )
      return {
        content,
        sha: data.sha,
        commitSha: commits[0]?.sha ?? "",
      }
    },

    async writeFile({ repo, path, content, message, branch, prevSha }): Promise<GitFileWrite> {
      const body: Record<string, unknown> = {
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
      }
      if (prevSha) body.sha = prevSha
      const res = await ghFetch<GhPutRes>(
        token,
        `/repos/${repo}/contents/${encodePath(path)}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      )
      return { sha: res.content.sha, commitSha: res.commit.sha }
    },

    async listCommits(repo, path, branch, limit = 30) {
      const commits = await ghFetch<GhCommitRes[]>(
        token,
        `/repos/${repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(branch)}&per_page=${limit}`
      )
      return commits.map<GitCommit>((c) => ({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author.name,
        authorEmail: c.commit.author.email,
        authorLogin: c.author?.login,
        date: c.commit.author.date,
        url: c.html_url,
      }))
    },

    fileWebUrl(repo, path, branch) {
      return `https://github.com/${repo}/blob/${encodeURIComponent(branch)}/${encodePath(path)}`
    },

    commitWebUrl(repo, commitSha) {
      return `https://github.com/${repo}/commit/${commitSha}`
    },
  }
}
