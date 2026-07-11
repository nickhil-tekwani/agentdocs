import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { loadEnvironment } from "@agentdocs/config";
import { createApp } from "./app";

describe("AgentDocs API", () => {
  let root: string;
  let repository: string;
  let server: Server;
  let origin: string;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "agentdocs-api-test-"));
    repository = join(root, "repo");
    await mkdir(join(repository, ".agentdocs"), { recursive: true });
    await writeFile(join(repository, "README.md"), "# Test repository\n", "utf8");
    await writeFile(join(repository, ".agentdocs/config.yml"), "version: 1\ndocs_roots: ['.']\npolicies:\n  require_evidence: true\n  max_files_per_change: 5\n  protected_paths: ['LICENSE']\n", "utf8");
    git(["init", "-q"], repository); git(["config", "user.name", "Test"], repository); git(["config", "user.email", "test@example.invalid"], repository); git(["add", "."], repository); git(["commit", "-qm", "base"], repository);
    const environment = loadEnvironment({ NODE_ENV: "test", AGENTDOCS_DATA_DIR: join(root, "data"), AGENTDOCS_ALLOWED_REPOSITORY_ROOTS: root });
    server = createApp({ environment }).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address");
    origin = `http://127.0.0.1:${address.port}`;
  });

  after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await rm(root, { recursive: true, force: true }); });

  it("persists, validates, and publishes a proposal", async () => {
    const workspace = await json(`${origin}/v1/workspaces`, { method: "POST", body: { repositoryPath: repository } });
    assert.match(workspace.baseSha, /^[a-f0-9]{40}$/);
    const tree = await json(`${origin}/v1/workspaces/${workspace.id}/tree`);
    assert.deepEqual(tree.files, ["README.md"]);

    const record = await json(`${origin}/v1/workspaces/${workspace.id}/agent-runs`, { method: "POST", body: { intent: "Add setup notes", targetPath: "README.md", instruction: "Setup" } });
    assert.equal(record.proposal.validation.markdown, "passed");
    assert.equal(record.proposal.validation.links, "passed");
    assert.match(record.diff, /Draft generated for review/);

    const published = await json(`${origin}/v1/workspaces/${workspace.id}/publish`, { method: "POST", body: { proposalId: record.proposal.id, message: "Add setup notes", branch: "agentdocs/api-test" } });
    assert.match(published.commitSha, /^[a-f0-9]{40}$/);
    assert.match(execFileSync("git", ["show", "agentdocs/api-test:README.md"], { cwd: repository, encoding: "utf8" }), /## Setup/);
    const listed = await json(`${origin}/v1/workspaces`);
    assert.equal(listed[0].proposalCount, 1);
  });
});

function git(args: string[], cwd: string) { execFileSync("git", args, { cwd, stdio: "ignore" }); }
async function json(url: string, options?: { method?: string; body?: unknown }) {
  const response = await fetch(url, { method: options?.method, headers: options?.body ? { "content-type": "application/json" } : undefined, body: options?.body ? JSON.stringify(options.body) : undefined });
  const body = await response.json() as any;
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}
