import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createTwoFilesPatch } from "diff";
import type { ChangeProposal, FileOperation } from "@agentdocs/change-model";

const run = promisify(execFile);

export interface RepositoryFile { path: string; content: string; sha: string; }
export interface PublishResult { commitSha: string; branch: string; }

export interface GitProvider {
  head(branch?: string): Promise<string>;
  listFiles(sha: string): Promise<string[]>;
  readFile(path: string, sha: string): Promise<RepositoryFile>;
  diff(proposal: ChangeProposal): Promise<string>;
  publish(proposal: ChangeProposal, message: string, branch?: string): Promise<PublishResult>;
}

export class LocalGitProvider implements GitProvider {
  constructor(private readonly repositoryPath: string) {}

  private async git(args: string[], cwd = this.repositoryPath, trim = true): Promise<string> {
    const { stdout } = await run("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return trim ? stdout.trimEnd() : stdout;
  }

  async head(branch = "HEAD"): Promise<string> { return this.git(["rev-parse", branch]); }

  async listFiles(sha: string): Promise<string[]> {
    const output = await this.git(["ls-tree", "-r", "--name-only", sha]);
    return output ? output.split("\n") : [];
  }

  async readFile(path: string, sha: string): Promise<RepositoryFile> {
    const content = await this.git(["show", `${sha}:${path}`], this.repositoryPath, false);
    const blobSha = await this.git(["rev-parse", `${sha}:${path}`]);
    return { path, content, sha: blobSha };
  }

  private async previous(operation: FileOperation, sha: string): Promise<string> {
    if (operation.type === "create") return "";
    try { return (await this.readFile(operation.path, sha)).content; } catch { return ""; }
  }

  async diff(proposal: ChangeProposal): Promise<string> {
    const patches = await Promise.all(proposal.operations.map(async (operation) => {
      const before = await this.previous(operation, proposal.baseSha);
      const after = operation.type === "delete" ? "" : operation.content;
      return createTwoFilesPatch(`a/${operation.path}`, `b/${operation.path}`, before, after, proposal.baseSha, "proposal", { context: 3 });
    }));
    return patches.join("\n");
  }

  async publish(proposal: ChangeProposal, message: string, branch = "agentdocs/change"): Promise<PublishResult> {
    const currentHead = await this.head("HEAD");
    if (currentHead !== proposal.baseSha) throw new Error(`Stale proposal: expected ${proposal.baseSha}, repository is ${currentHead}`);
    const status = await this.git(["status", "--porcelain"]);
    if (status) throw new Error("Repository working tree must be clean before publishing");

    const worktree = await mkdtemp(join(tmpdir(), "agentdocs-"));
    let published = false;
    try {
      await this.git(["worktree", "add", "-b", branch, worktree, proposal.baseSha]);
      for (const operation of proposal.operations) {
        const target = join(worktree, operation.path);
        if (operation.type === "delete") {
          await unlink(target);
        } else {
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, operation.content, "utf8");
        }
      }
      await this.git(["add", "--all"], worktree);
      await this.git(["commit", "-m", message], worktree);
      const commitSha = await this.git(["rev-parse", "HEAD"], worktree);
      published = true;
      return { commitSha, branch };
    } finally {
      try { await this.git(["worktree", "remove", "--force", worktree]); } catch { await rm(worktree, { recursive: true, force: true }); }
      if (!published) {
        try { await this.git(["branch", "-D", branch]); } catch { /* branch may not exist */ }
      }
    }
  }
}
