export type GitProviderKind = "GITHUB" | "GITLAB"

export interface GitFileRead {
  content: string
  sha: string
  commitSha: string
}

export interface GitFileWrite {
  sha: string
  commitSha: string
}

export interface GitCommit {
  sha: string
  message: string
  authorName: string
  authorEmail: string
  authorLogin?: string
  date: string
  url: string
}

export interface GitRepoSummary {
  fullName: string
  defaultBranch: string
  url: string
  private: boolean
}

export interface GitProvider {
  kind: GitProviderKind
  whoami(): Promise<{ login: string; email: string | null; name: string | null }>
  listRepos(): Promise<GitRepoSummary[]>
  listBranches(repo: string): Promise<string[]>
  readFile(repo: string, path: string, ref: string): Promise<GitFileRead>
  writeFile(args: {
    repo: string
    path: string
    content: string
    message: string
    branch: string
    prevSha?: string | null
  }): Promise<GitFileWrite>
  listCommits(repo: string, path: string, branch: string, limit?: number): Promise<GitCommit[]>
  fileWebUrl(repo: string, path: string, branch: string): string
  commitWebUrl(repo: string, commitSha: string): string
}

export class GitConflictError extends Error {
  constructor(message = "El archivo cambió en el repositorio. Recarga y reintenta.") {
    super(message)
    this.name = "GitConflictError"
  }
}

export class GitForbiddenError extends Error {
  constructor(message = "Permiso denegado por el proveedor Git.") {
    super(message)
    this.name = "GitForbiddenError"
  }
}

export class GitNotFoundError extends Error {
  constructor(message = "Recurso no encontrado en el proveedor Git.") {
    super(message)
    this.name = "GitNotFoundError"
  }
}

export class GitAuthError extends Error {
  constructor(message = "Token inválido o expirado.") {
    super(message)
    this.name = "GitAuthError"
  }
}

export class MissingAccountError extends Error {
  readonly provider: GitProviderKind
  constructor(provider: GitProviderKind) {
    super(
      provider === "GITHUB"
        ? "Conecta tu cuenta GitHub en /configuracion/integraciones."
        : "Conecta tu cuenta GitLab en /configuracion/integraciones."
    )
    this.provider = provider
    this.name = "MissingAccountError"
  }
}
