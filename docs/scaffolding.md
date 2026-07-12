# Documentation repository scaffolds

AgentDocs can create a new Git-backed documentation repository or add a controlled scaffold to an existing empty directory. Scaffolds are ordinary Markdown, YAML, and AI-client instruction files; they do not introduce a proprietary document format.

## Quick start

From the AgentDocs repository:

```bash
npm install
npm run agentdocs -- init \
  --template project \
  --target ../my-project-docs
```

The command initializes Git when the target has no `.git` directory. It refuses to overwrite any scaffold-managed file unless `--force` is provided.

List available presets and composable modules:

```bash
npm run agentdocs -- templates
```

## Presets

| Preset | Intended use | Included modules |
| --- | --- | --- |
| `minimal` | A small documentation repository with only shared conventions | Shared core only |
| `project` | A bounded initiative, launch, migration, or internal program | Project core, architecture, decisions, stakeholder reporting, operations |
| `team` | A persistent product, engineering, operations, or cross-functional team | Team core, team cadence, individual updates, decisions |
| `technical` | Product, service, API, platform, or library documentation | Diátaxis-oriented technical core, operations, decisions, contributing |
| `hybrid` | A combined product/project/team knowledge space | Project, team, technical, architecture, reporting, operations, decisions, contributing |

Every preset includes:

- `README.md`, `docs/index.md`, `decisions_log.md`, and `archive/`;
- `.agentdocs/config.yml` and `.agentdocs/scaffold.yml`;
- document and preset-specific templates;
- root `AGENTS.md` and `SKILLS.md`;
- a canonical `skills/agentdocs-repository/SKILL.md`;
- discovery adapters for Codex-compatible clients, Claude, and Cursor.

## Compose a scaffold

Add or remove named modules without maintaining a separate template:

```bash
npm run agentdocs -- init \
  --template team \
  --include operations,technical-core \
  --exclude individual-updates \
  --target ../platform-team-docs
```

Available modules:

- `project-core`
- `architecture`
- `decisions`
- `stakeholder-reporting`
- `operations`
- `team-core`
- `team-cadence`
- `individual-updates`
- `technical-core`
- `contributing`

The selected preset and modules are recorded in `.agentdocs/scaffold.yml` for later inspection and migration tooling.

## Structure principles

All scaffolds separate:

1. **Durable knowledge** — architecture, policies, processes, explanations, and reference material.
2. **Chronological records** — sprint notes, standups, meeting notes, and stakeholder updates organized by date.
3. **Decisions** — append-only records containing rationale, alternatives, and consequences.
4. **Archive** — expired operational material retained without cluttering current documentation.

The technical preset organizes user documentation into tutorials, how-to guides, reference, and explanation. Project and team presets keep lasting knowledge out of dated reporting folders.

## Individual updates

The `team` preset includes an `individual-updates` module, but its generated README marks the area as optional and potentially sensitive. Define access, retention, and purpose before using it. Exclude it when unnecessary:

```bash
npm run agentdocs -- init --template team --exclude individual-updates --target ../team-docs
```

## Existing directories

Initialization performs a complete conflict check before writing. If any managed destination already exists, no scaffold files are written and the command lists conflicts.

Use `--force` only after reviewing existing files:

```bash
npm run agentdocs -- init --template technical --target ./existing-docs --force
```

`--force` replaces scaffold-managed files but does not delete unrelated content. Use `--no-git` to suppress `git init` when another system manages repository creation.

## After initialization

1. Review the generated README and `.agentdocs/config.yml`.
2. Remove unused placeholder documents or modules.
3. Configure the Git remote.
4. Open the repository in Codex, Claude, Cursor, or another AI client.
5. Ask the client to read `AGENTS.md`, `SKILLS.md`, and the canonical skill.
6. Validate and publish through the AgentDocs CLI or connect the repository to the AgentDocs manual UI.
