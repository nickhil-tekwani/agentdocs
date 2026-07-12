#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRepositoryConfig } from "@agentdocs/config";
import { validateMarkdown } from "@agentdocs/markdown-core";
import { availableModules, availablePresets, initializeScaffold, type ScaffoldPreset } from "./scaffolds";

const args = process.argv.slice(2);
const command = args.shift() ?? "status";

main().catch((error) => { console.error(`agentdocs: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });

async function main() {
  if (command === "templates") {
    console.log(JSON.stringify({ presets: availablePresets(), modules: availableModules() }, null, 2));
    return;
  }
  if (command === "init") {
    const preset = (value("--template") ?? "minimal") as ScaffoldPreset;
    const target = value("--target") ?? process.cwd();
    const result = await initializeScaffold({ target, preset, include: csv("--include"), exclude: csv("--exclude"), force: args.includes("--force"), initializeGit: !args.includes("--no-git") });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const root = git(["rev-parse", "--show-toplevel"]);
  const config = await loadRepositoryConfig(root);
  const changed = changedPaths().filter((path) => inRoots(path, config.docs_roots));
  if (command === "status") {
    console.log(JSON.stringify({ repository: root, branch: git(["branch", "--show-current"]), head: tryGit(["rev-parse", "--verify", "HEAD"]) ?? null, docsRoots: config.docs_roots, changedDocumentation: changed }, null, 2));
    return;
  }
  if (command === "validate") {
    validate(changed);
    console.log(`Validated ${changed.length} changed documentation file(s)`);
    return;
  }
  if (command === "publish") {
    if (!changed.length) throw new Error("No documentation changes to publish");
    const protectedPath = changed.find((path) => config.policies.protected_paths.some((protectedRoot) => path === protectedRoot || path.startsWith(`${protectedRoot}/`)));
    if (protectedPath) throw new Error(`Protected path cannot be published: ${protectedPath}`);
    validate(changed);
    const branch = value("--branch") ?? `agentdocs/docs-${stamp()}`;
    const message = value("--message") ?? "Update documentation";
    const remote = value("--remote") ?? "origin";
    git(["switch", "-c", branch]);
    git(["add", "--", ...changed]);
    git(["commit", "-m", message]);
    git(["fetch", remote]);
    const target = value("--target") ?? remoteDefault(remote);
    const remoteTarget = `${remote}/${target}`;
    const hasRemoteTarget = tryGit(["show-ref", "--verify", `refs/remotes/${remote}/${target}`]) !== undefined;
    if (hasRemoteTarget) try { git(["rebase", "--autostash", remoteTarget]); }
    catch (error) { try { git(["rebase", "--abort"]); } catch { /* no active rebase */ } throw new Error(`Automatic rebase failed; branch ${branch} was kept for manual conflict resolution`); }
    git(["push", "--set-upstream", remote, `HEAD:refs/heads/${branch}`]);
    console.log(JSON.stringify({ branch, commitSha: git(["rev-parse", "HEAD"]), pushed: true, rebasedOnto: hasRemoteTarget ? remoteTarget : undefined }, null, 2));
    return;
  }
  throw new Error("Usage: agentdocs <templates|init|status|validate|publish> [options]");

  function changedPaths() {
    const output = git(["status", "--porcelain=v1", "-z"], false);
    return output.split("\0").filter(Boolean).map((entry) => entry.slice(3)).map((path) => path.includes(" -> ") ? path.split(" -> ").pop()! : path);
  }
  function validate(paths: string[]) {
    const failures = paths.filter((path) => /\.mdx?$/.test(path) && validateMarkdown(readFileSync(resolve(root, path), "utf8")).valid === false);
    if (failures.length) throw new Error(`Markdown validation failed: ${failures.join(", ")}`);
  }
}

function git(arguments_: string[], trim = true) { const output = execFileSync("git", arguments_, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return trim ? output.trim() : output; }
function tryGit(arguments_: string[]) { try { return git(arguments_); } catch { return undefined; } }
function value(flag: string) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
function csv(flag: string) { return value(flag)?.split(",").map((item) => item.trim()).filter(Boolean); }
function inRoots(path: string, roots: string[]) { return roots.some((root) => root === "." || path === root || path.startsWith(`${root}/`)); }
function remoteDefault(remote: string) { try { return git(["symbolic-ref", `refs/remotes/${remote}/HEAD`]).replace(`refs/remotes/${remote}/`, ""); } catch { return "main"; } }
function stamp() { return new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-"); }
