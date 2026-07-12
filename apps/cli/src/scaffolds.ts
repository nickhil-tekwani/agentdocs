import { execFileSync } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

export type ScaffoldPreset = "minimal" | "project" | "team" | "technical" | "hybrid";
export interface ScaffoldOptions { target: string; preset: ScaffoldPreset; include?: string[]; exclude?: string[]; force?: boolean; initializeGit?: boolean; }
export interface ScaffoldResult { target: string; preset: ScaffoldPreset; modules: string[]; filesCreated: number; gitInitialized: boolean; }

type Files = Record<string, string>;

const presets: Record<ScaffoldPreset, string[]> = {
  minimal: [],
  project: ["project-core", "architecture", "decisions", "stakeholder-reporting", "operations"],
  team: ["team-core", "team-cadence", "individual-updates", "decisions"],
  technical: ["technical-core", "operations", "decisions", "contributing"],
  hybrid: ["project-core", "team-core", "team-cadence", "technical-core", "architecture", "decisions", "stakeholder-reporting", "operations", "contributing"]
};

const modules: Record<string, Files> = {
  "project-core": docs({
    "docs/overview/charter.md": "Project charter", "docs/overview/business-case.md": "Business case", "docs/overview/scope.md": "Scope", "docs/overview/stakeholders.md": "Stakeholders", "docs/overview/glossary.md": "Glossary",
    "docs/planning/roadmap.md": "Roadmap", "docs/planning/milestones.md": "Milestones", "docs/planning/risks.md": "Risks", "docs/planning/dependencies.md": "Dependencies", "docs/planning/open-questions.md": "Open questions",
    "docs/delivery/implementation-plan.md": "Implementation plan", "docs/delivery/rollout-plan.md": "Rollout plan", "docs/delivery/test-plan.md": "Test plan", "docs/delivery/launch-checklist.md": "Launch checklist"
  }),
  architecture: docs({
    "docs/architecture/system-context.md": "System context", "docs/architecture/current-state.md": "Current state", "docs/architecture/target-state.md": "Target state", "docs/architecture/data-flows.md": "Data flows", "docs/architecture/integrations.md": "Integrations", "docs/architecture/security.md": "Security architecture"
  }),
  decisions: {
    "docs/decisions/README.md": "# Decision records\n\nStore one meaningful decision per file using the template under `.agentdocs/templates/decision.md`. Keep `decisions_log.md` as the chronological index.\n",
    ".agentdocs/templates/decision.md": "# Decision: <title>\n\n- **Status:** Proposed\n- **Date:** YYYY-MM-DD\n\n## Context\n\n## Decision\n\n## Why\n\n## Alternatives and tradeoffs\n\n## Consequences\n"
  },
  "stakeholder-reporting": {
    "docs/reporting/current-status.md": "# Current status\n\n## Summary\n\n## Progress\n\n## Risks and blockers\n\n## Decisions needed\n\n## Next steps\n",
    "docs/reporting/stakeholder-updates/README.md": "# Stakeholder updates\n\nStore dated updates under year directories using `YYYY-MM-DD.md`.\n",
    ".agentdocs/templates/stakeholder-update.md": "# Stakeholder update — YYYY-MM-DD\n\n## Executive summary\n\n## Progress\n\n## Risks and decisions\n\n## Next period\n"
  },
  operations: docs({
    "docs/operations/runbooks/README.md": "Runbooks", "docs/operations/support-model.md": "Support model", "docs/operations/monitoring.md": "Monitoring", "docs/operations/backup-and-restore.md": "Backup and restore", "docs/operations/disaster-recovery.md": "Disaster recovery"
  }),
  "team-core": docs({
    "docs/team/mission.md": "Team mission", "docs/team/members.md": "Team members", "docs/team/ownership.md": "Ownership", "docs/team/ways-of-working.md": "Ways of working", "docs/team/communication.md": "Communication", "docs/team/glossary.md": "Team glossary",
    "docs/processes/onboarding.md": "Onboarding", "docs/processes/release-process.md": "Release process", "docs/processes/incident-process.md": "Incident process", "docs/processes/definition-of-done.md": "Definition of done"
  }),
  "team-cadence": {
    "docs/planning/roadmap.md": "# Team roadmap\n\n## Outcomes\n\n## Current priorities\n\n## Later\n",
    "docs/planning/quarterly/README.md": "# Quarterly plans\n\nUse `YYYY-qN.md` for quarterly plans.\n",
    "docs/sprints/README.md": "# Sprints\n\nUse `YYYY/sprint-N/` with `plan.md`, dated standups, `review.md`, and `retrospective.md`.\n",
    "docs/meetings/README.md": "# Meeting notes\n\nPromote lasting knowledge into `team/`, `processes/`, or the decision log. Archive time-bound notes by year.\n",
    ".agentdocs/templates/sprint-plan.md": "# Sprint <number> plan\n\n## Goal\n\n## Planned work\n\n## Risks and dependencies\n",
    ".agentdocs/templates/standup.md": "# Standup — YYYY-MM-DD\n\n## Progress\n\n## Next\n\n## Blockers\n",
    ".agentdocs/templates/retrospective.md": "# Sprint <number> retrospective\n\n## What worked\n\n## What did not\n\n## Actions\n"
  },
  "individual-updates": {
    "docs/updates/individuals/README.md": "# Individual updates\n\nOptional and potentially sensitive. Define access, purpose, and retention before storing individual updates. Do not use this area for performance evaluation records.\n",
    "docs/updates/team/README.md": "# Team updates\n\nStore dated team updates by year.\n"
  },
  "technical-core": docs({
    "docs/tutorials/getting-started.md": "Getting started tutorial", "docs/how-to/installation.md": "Install the system", "docs/how-to/configuration.md": "Configure the system", "docs/how-to/deployment.md": "Deploy the system", "docs/how-to/troubleshooting.md": "Troubleshooting",
    "docs/reference/cli.md": "CLI reference", "docs/reference/configuration.md": "Configuration reference", "docs/reference/api/README.md": "API reference", "docs/reference/schemas/README.md": "Schema reference", "docs/reference/compatibility.md": "Compatibility",
    "docs/explanation/architecture.md": "Architecture", "docs/explanation/concepts.md": "Concepts", "docs/explanation/security-model.md": "Security model", "docs/explanation/data-model.md": "Data model", "docs/explanation/design-rationale.md": "Design rationale"
  }),
  contributing: docs({
    "docs/contributing/development.md": "Development", "docs/contributing/testing.md": "Testing", "docs/contributing/documentation.md": "Documentation contributions", "docs/contributing/releases.md": "Releases"
  })
};

export function availablePresets() { return Object.keys(presets) as ScaffoldPreset[]; }
export function availableModules() { return Object.keys(modules).sort(); }

export async function initializeScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  if (!(options.preset in presets)) throw new Error(`Unknown scaffold preset: ${options.preset}`);
  const target = resolve(options.target);
  const selected = Array.from(new Set([...presets[options.preset], ...(options.include ?? [])])).filter((name) => !(options.exclude ?? []).includes(name));
  const unknown = selected.filter((name) => !(name in modules));
  if (unknown.length) throw new Error(`Unknown scaffold module(s): ${unknown.join(", ")}. Available: ${availableModules().join(", ")}`);
  const moduleFiles: Files = {};
  for (const name of selected) Object.assign(moduleFiles, modules[name]);
  const files: Files = { ...sharedFiles(basename(target), options.preset, selected), ...moduleFiles };
  const conflicts: string[] = [];
  if (!options.force) for (const path of Object.keys(files)) try { await access(resolve(target, path)); conflicts.push(path); } catch { /* available */ }
  if (conflicts.length) throw new Error(`Refusing to overwrite existing files: ${conflicts.slice(0, 8).join(", ")}${conflicts.length > 8 ? ` (+${conflicts.length - 8} more)` : ""}. Use --force to replace scaffold-managed files.`);
  for (const [path, content] of Object.entries(files)) { const destination = resolve(target, path); await mkdir(resolve(destination, ".."), { recursive: true }); await writeFile(destination, content, "utf8"); }
  let gitInitialized = false;
  if (options.initializeGit !== false) {
    try { await access(resolve(target, ".git")); }
    catch { execFileSync("git", ["init", "-q", target]); gitInitialized = true; }
  }
  return { target, preset: options.preset, modules: selected, filesCreated: Object.keys(files).length, gitInitialized };
}

function sharedFiles(name: string, preset: ScaffoldPreset, selected: string[]): Files {
  const roots = ["README.md", "AGENTS.md", "SKILLS.md", "decisions_log.md", "docs", "skills", ".agents", ".claude", ".cursor", ".agentdocs", "archive"];
  return {
    "README.md": `# ${name}\n\n${title(preset)} documentation workspace scaffolded by AgentDocs.\n\nStart at [docs/index.md](docs/index.md). AI clients should read [AGENTS.md](AGENTS.md), [SKILLS.md](SKILLS.md), and the canonical repository skill before editing.\n`,
    "AGENTS.md": "# Repository instructions\n\n- Read `SKILLS.md` and `skills/agentdocs-repository/SKILL.md` before documentation work.\n- Keep `README.md` current for sizeable or user-relevant changes.\n- Record meaningful technical and architectural decisions in `decisions_log.md`, including why and tradeoffs.\n- Run `agentdocs validate` before publication and use `agentdocs publish` for automatic branch, rebase, commit, and push.\n",
    "SKILLS.md": "# Repository skills\n\nLoad the canonical [`agentdocs-repository` skill](skills/agentdocs-repository/SKILL.md) for onboarding, editing, validation, decisions, and publication.\n",
    "decisions_log.md": "# Decisions log\n\nAdd newest decisions first. Record status, decision, why, alternatives/tradeoffs, and consequences. Preserve superseded entries.\n\n## Decisions\n",
    "docs/index.md": `# Documentation index\n\nThis repository uses the **${preset}** scaffold. Keep durable knowledge in topic folders, chronological records in dated folders, and expired material under \`archive/\`.\n`,
    "archive/README.md": "# Archive\n\nMove expired chronological material here without rewriting history. Organize by year or quarter.\n",
    ".agentdocs/config.yml": `version: 1\ndocs_roots:\n${roots.map((root) => `  - ${root}`).join("\n")}\ndefault_write_mode: pull_request\nrendering:\n  flavor: gfm\n  mdx: true\nagents:\n  context_roots: []\n  external_web: false\npolicies:\n  require_evidence: true\n  max_files_per_change: 20\n  protected_paths: []\ntemplates:\n  decision: .agentdocs/templates/decision.md\n`,
    ".agentdocs/scaffold.yml": selected.length ? `version: 1\npreset: ${preset}\nmodules:\n${selected.map((module) => `  - ${module}`).join("\n")}\n` : `version: 1\npreset: ${preset}\nmodules: []\n`,
    ".agentdocs/templates/document.md": "---\ntitle: <title>\nstatus: draft\nowners: []\n---\n\n# <title>\n\n## Purpose\n",
    "skills/agentdocs-repository/SKILL.md": generatedSkill(preset),
    "skills/agentdocs-repository/agents/openai.yaml": `interface:\n  display_name: "AgentDocs Repository"\n  short_description: "Edit and publish Git-backed documentation"\n  default_prompt: "Use $agentdocs-repository to update this repository documentation safely."\n`,
    ".agents/skills/agentdocs-repository/SKILL.md": adapterSkill(),
    ".claude/skills/agentdocs-repository/SKILL.md": adapterSkill(),
    "CLAUDE.md": "@AGENTS.md\n@SKILLS.md\n\nLoad `skills/agentdocs-repository/SKILL.md` before documentation work.\n",
    ".cursor/rules/agentdocs.mdc": "---\ndescription: AgentDocs documentation workflow\nalwaysApply: true\n---\n\nRead `AGENTS.md`, `SKILLS.md`, and `skills/agentdocs-repository/SKILL.md` before documentation work.\n"
  };
}

function generatedSkill(preset: ScaffoldPreset) { return `---\nname: agentdocs-repository\ndescription: Work safely in this AgentDocs-backed ${preset} documentation repository. Use for first connection, Markdown/MDX edits, validation, decision logging, and Git publication.\n---\n\n# AgentDocs ${preset} repository\n\n1. Read \`AGENTS.md\`, \`SKILLS.md\`, \`.agentdocs/config.yml\`, \`README.md\`, and \`decisions_log.md\`.\n2. Keep durable knowledge separate from dated records and archive expired material without deleting history.\n3. Edit only configured documentation roots; preserve frontmatter, MDX, links, and repository conventions.\n4. Update the README for sizeable or user-relevant changes and log meaningful decisions with rationale and tradeoffs.\n5. Validate before publication. Use the AgentDocs CLI to create a branch, fetch, rebase, commit, and push; never force-push or discard unrelated work.\n6. Use the AgentDocs manual UI for simple edits that do not justify AI-client tokens.\n`;
}
function adapterSkill() { return "---\nname: agentdocs-repository\ndescription: Edit, validate, and publish this AgentDocs-backed documentation repository.\n---\n\nRead and follow `skills/agentdocs-repository/SKILL.md` from the repository root.\n"; }
function docs(entries: Record<string, string>): Files { return Object.fromEntries(Object.entries(entries).map(([path, heading]) => [path, `# ${heading}\n\n## Purpose\n\nDocument ${heading.toLowerCase()} here.\n`])); }
function title(preset: ScaffoldPreset) { return preset === "technical" ? "Technical" : preset[0].toUpperCase() + preset.slice(1); }
