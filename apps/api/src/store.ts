import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChangeProposal } from "@agentdocs/change-model";
import type { RepositoryConfig } from "@agentdocs/config";
import type { RunEvent } from "@agentdocs/agent-runtime";

export interface StoredWorkspace {
  id: string;
  repositoryPath?: string;
  github?: { owner: string; repository: string; defaultBranch: string };
  baseSha: string;
  createdAt: string;
  config: RepositoryConfig;
  proposals: Record<string, { proposal: ChangeProposal; events: RunEvent[]; diff: string; createdAt: string; published?: { commitSha: string; branch: string }; pullRequest?: { number: number; url: string } }>;
}

export class JsonWorkspaceStore {
  constructor(private readonly directory: string) {}
  async initialize(): Promise<void> { await mkdir(this.directory, { recursive: true }); }
  private path(id: string): string { return join(this.directory, `${id}.json`); }

  async save(workspace: StoredWorkspace): Promise<void> {
    await this.initialize();
    const target = this.path(workspace.id);
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(workspace, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
  }

  async get(id: string): Promise<StoredWorkspace | undefined> {
    try { return JSON.parse(await readFile(this.path(id), "utf8")) as StoredWorkspace; }
    catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined; throw error; }
  }

  async list(): Promise<StoredWorkspace[]> {
    await this.initialize();
    const files = (await readdir(this.directory)).filter((file) => file.endsWith(".json"));
    return Promise.all(files.map(async (file) => JSON.parse(await readFile(join(this.directory, file), "utf8")) as StoredWorkspace));
  }
}
