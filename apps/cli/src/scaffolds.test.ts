import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { loadRepositoryConfig } from "@agentdocs/config";
import { availablePresets, initializeScaffold } from "./scaffolds";

const root = join(tmpdir(), `agentdocs-scaffolds-${process.pid}`);
after(() => rm(root, { recursive: true, force: true }));

describe("documentation scaffolds", () => {
  for (const preset of availablePresets()) it(`creates the ${preset} preset`, async () => {
    const target = join(root, preset);
    const result = await initializeScaffold({ target, preset });
    assert.equal(result.gitInitialized, true);
    assert.ok(result.filesCreated >= 14);
    assert.match(await readFile(join(target, "skills/agentdocs-repository/SKILL.md"), "utf8"), new RegExp(`AgentDocs ${preset} repository`));
    assert.equal((await loadRepositoryConfig(target)).version, 1);
    if (preset === "minimal") {
      const status = JSON.parse(execFileSync(process.execPath, [join(__dirname, "index.js"), "status"], { cwd: target, encoding: "utf8" }));
      assert.equal(status.head, null);
    }
  });

  it("composes include/exclude modules and refuses accidental overwrites", async () => {
    const target = join(root, "custom");
    const result = await initializeScaffold({ target, preset: "team", include: ["operations"], exclude: ["individual-updates"] });
    assert.ok(result.modules.includes("operations"));
    assert.ok(!result.modules.includes("individual-updates"));
    await assert.rejects(initializeScaffold({ target, preset: "minimal" }), /Refusing to overwrite/);
  });
});
