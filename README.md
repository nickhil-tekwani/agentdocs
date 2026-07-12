# agentdocs

AgentDocs is an AI-client-agnostic, Git-native documentation workspace. Authors can write with Claude, ChatGPT/Codex, Cursor, any other AI tool, or the built-in manual editor. AgentDocs supplies repository onboarding instructions, validation, review, versioning, automatic rebasing, commits, and pushes; it does not embed or call an LLM.

The product direction and phased roadmap live in [`agent_docs_spec.md`](agent_docs_spec.md).

## What works

- Local Git repository workspaces pinned to a base commit SHA.
- Markdown/MDX discovery and byte-preserving no-op round trips.
- Portable repository skills and discovery adapters for Codex, Claude, Cursor, and other clients that read repository instructions.
- Typed create, modify, and delete operations with evidence references.
- Path traversal, documentation-root, protected-path, evidence, and file-count policy checks.
- Persistent workspace/proposal audit records, relative-link checks, unified diff review, and a lightweight browser interface.
- Manual Markdown editing in the browser without consuming AI-client tokens.
- Publication to a new branch through an isolated temporary Git worktree, with automatic fetch, rebase, commit, and push.
- A GitHub Git Data adapter with App installation-token exchange and pull-request creation primitives.

Remote GitHub onboarding, webhook indexing, rich-text editing, collaborative review, and production authentication remain roadmap work.

## Requirements

- Node.js 20 or newer
- Git

## Get started

```bash
npm install
npm run env:check
npm run check
npm run build
npm start --workspace @agentdocs/api
```

Open [http://localhost:4100](http://localhost:4100), enter an allowed local Git repository path, choose a Markdown file, edit it, review the validated diff, and publish. Publication creates a branch and, by default, fetches, rebases, commits, and pushes automatically.

Copy `.env.example` to `.env` to configure repository roots and optional GitHub credentials. No AI-provider key is needed or supported. See [configuration](docs/configuration.md) and [security guidance](SECURITY.md). Real credentials must never be committed.

The complete request/response workflow is documented in the [HTTP API guide](docs/api.md).

For a containerized setup, set `AGENTDOCS_REPOSITORIES_PATH` and run `docker compose up --build`.

For backend development, run `npm run dev`. Rebuild the static client with `npm run build --workspace @agentdocs/web` after UI changes.

## Scaffold a documentation repository

Create an opinionated project, team, technical, minimal, or hybrid documentation repository:

```bash
npm run agentdocs -- init --template project --target ../my-project-docs
npm run agentdocs -- init --template team --target ../my-team-docs
npm run agentdocs -- init --template technical --target ../my-technical-docs
```

Presets are composed from reusable modules, so they can be extended or reduced:

```bash
npm run agentdocs -- init \
  --template team \
  --include operations,technical-core \
  --exclude individual-updates \
  --target ../platform-team-docs
```

See the complete [scaffolding guide](docs/scaffolding.md) for structures, modules, overwrite protection, and next steps.

## Repository layout

```text
apps/
  api/             Local workspace and proposal HTTP API
  cli/             AI-client-friendly status, validation, and publication commands
  web/             Zero-build review client
packages/
  agent-runtime/   Client-neutral proposal validation
  change-model/    Proposal schemas and policy enforcement
  config/          Environment and repository configuration validation
  git-provider/    Pinned reads, diffs, and isolated branch publication
  github-provider/ GitHub App auth, Git Data publication, and PR primitives
  markdown-core/   Source-preserving parsing and validation primitives
```

## API slice

- `POST /v1/workspaces`
- `POST /v1/github/workspaces`
- `GET /v1/workspaces/{id}/tree`
- `GET /v1/workspaces/{id}/files/{path}`
- `PUT /v1/workspaces/{id}/files/{path}`
- `POST /v1/workspaces/{id}/proposals`
- `POST /v1/workspaces/{id}/publish`
- `POST /v1/workspaces/{id}/pull-request`
- `GET /health`

Workspace and proposal audit state is persisted as owner-readable JSON under `AGENTDOCS_DATA_DIR`; canonical document content remains in Git.

Pull requests and pushes run the same type-check, test, build, environment-validation, and dependency-audit checks through GitHub Actions. Dependabot checks npm and workflow dependencies weekly.

## Working in this repository

- Read [`AGENTS.md`](AGENTS.md), [`SKILLS.md`](SKILLS.md), and the canonical [`agentdocs-repository` skill](skills/agentdocs-repository/SKILL.md) before documentation work.
- Keep this README aligned with sizeable changes and with changes that introduce information users or contributors need.
- Record meaningful technical and architectural decisions, including those made during human–LLM sessions, in [`decisions_log.md`](decisions_log.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
