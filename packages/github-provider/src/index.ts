import { createSign } from "node:crypto";
import { createTwoFilesPatch } from "diff";
import type { ChangeProposal, FileOperation } from "@agentdocs/change-model";
import type { GitProvider, PublishResult, RepositoryFile } from "@agentdocs/git-provider";

interface GitHubOptions { owner: string; repository: string; token: () => Promise<string>; defaultBranch?: string; apiUrl?: string; }

export class GitHubGitProvider implements GitProvider {
  private readonly apiUrl: string;
  private readonly defaultBranch: string;
  constructor(private readonly options: GitHubOptions) { this.apiUrl = options.apiUrl ?? "https://api.github.com"; this.defaultBranch = options.defaultBranch ?? "main"; }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, { ...init, headers: { accept: "application/vnd.github+json", authorization: `Bearer ${await this.options.token()}`, "x-github-api-version": "2022-11-28", "content-type": "application/json", ...init.headers } });
    if (!response.ok) throw Object.assign(new Error(`GitHub API failed (${response.status}): ${(await response.text()).slice(0, 500)}`), { status: response.status });
    return response.status === 204 ? undefined as T : await response.json() as T;
  }

  private repo(path: string) { return `/repos/${encodeURIComponent(this.options.owner)}/${encodeURIComponent(this.options.repository)}${path}`; }
  async head(branch = this.defaultBranch): Promise<string> { const result = await this.request<{ object: { sha: string } }>(this.repo(`/git/ref/heads/${encodeURIComponent(branch)}`)); return result.object.sha; }
  async listFiles(sha: string): Promise<string[]> { const result = await this.request<{ tree: Array<{ path: string; type: string }>; truncated: boolean }>(this.repo(`/git/trees/${sha}?recursive=1`)); if (result.truncated) throw new Error("GitHub tree response was truncated; use the clone-backed adapter"); return result.tree.filter((item) => item.type === "blob").map((item) => item.path); }
  async readFile(path: string, sha: string): Promise<RepositoryFile> { const result = await this.request<{ content: string; encoding: string; sha: string }>(this.repo(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`)); if (result.encoding !== "base64") throw new Error(`Unsupported GitHub content encoding: ${result.encoding}`); return { path, content: Buffer.from(result.content.replace(/\n/g, ""), "base64").toString("utf8"), sha: result.sha }; }

  private async previous(operation: FileOperation, sha: string) { if (operation.type === "create") return ""; try { return (await this.readFile(operation.path, sha)).content; } catch { return ""; } }
  async diff(proposal: ChangeProposal): Promise<string> { return (await Promise.all(proposal.operations.map(async (operation) => createTwoFilesPatch(`a/${operation.path}`, `b/${operation.path}`, await this.previous(operation, proposal.baseSha), operation.type === "delete" ? "" : operation.content, proposal.baseSha, "proposal", { context: 3 })))).join("\n"); }

  async publish(proposal: ChangeProposal, message: string, branch = "agentdocs/change"): Promise<PublishResult> {
    const currentHead = await this.head(this.defaultBranch);
    if (currentHead !== proposal.baseSha) throw new Error(`Stale proposal: expected ${proposal.baseSha}, repository is ${currentHead}`);
    const blobs = new Map<string, string>();
    for (const operation of proposal.operations) if (operation.type !== "delete") {
      const blob = await this.request<{ sha: string }>(this.repo("/git/blobs"), { method: "POST", body: JSON.stringify({ content: operation.content, encoding: "utf-8" }) });
      blobs.set(operation.path, blob.sha);
    }
    const tree = await this.request<{ sha: string }>(this.repo("/git/trees"), { method: "POST", body: JSON.stringify({ base_tree: proposal.baseSha, tree: proposal.operations.map((operation) => ({ path: operation.path, mode: "100644", type: "blob", sha: operation.type === "delete" ? null : blobs.get(operation.path) })) }) });
    const commit = await this.request<{ sha: string }>(this.repo("/git/commits"), { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [proposal.baseSha] }) });
    await this.request(this.repo("/git/refs"), { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) });
    return { commitSha: commit.sha, branch };
  }

  async openPullRequest(branch: string, title: string, body: string, base = this.defaultBranch): Promise<{ number: number; url: string }> {
    const result = await this.request<{ number: number; html_url: string }>(this.repo("/pulls"), { method: "POST", body: JSON.stringify({ head: branch, base, title, body }) });
    return { number: result.number, url: result.html_url };
  }
}

export class GitHubAppTokenProvider {
  private cached?: { token: string; expiresAt: number };
  constructor(private readonly options: { appId: string; installationId: string; privateKey: string; apiUrl?: string }) {}
  async token(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) return this.cached.token;
    const jwt = createAppJwt(this.options.appId, this.options.privateKey);
    const response = await fetch(`${this.options.apiUrl ?? "https://api.github.com"}/app/installations/${this.options.installationId}/access_tokens`, { method: "POST", headers: { accept: "application/vnd.github+json", authorization: `Bearer ${jwt}`, "x-github-api-version": "2022-11-28" } });
    if (!response.ok) throw new Error(`GitHub installation token exchange failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    const payload = await response.json() as { token: string; expires_at: string };
    this.cached = { token: payload.token, expiresAt: Date.parse(payload.expires_at) };
    return payload.token;
  }
}

export function createAppJwt(appId: string, privateKey: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId })}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  return `${unsigned}.${signer.sign(privateKey.replace(/\\n/g, "\n"), "base64url")}`;
}
