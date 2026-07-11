# agentdocs

AgentDocs is an agent-first, Git-native documentation workspace. The current Phase-0 implementation opens Markdown from a local Git repository at a pinned commit, produces evidence-linked change proposals, validates repository policy, previews unified diffs, and publishes approved proposals to an isolated branch.

The product direction and phased roadmap live in [`agent_docs_spec.md`](agent_docs_spec.md).

## What works

- Local Git repository workspaces pinned to a base commit SHA.
- Markdown/MDX discovery and byte-preserving no-op round trips.
- Provider-neutral agent runtime with visible understand, retrieve, plan, propose, and validate stages, plus an optional OpenAI Responses API provider.
- Typed create, modify, and delete operations with evidence references.
- Path traversal, documentation-root, protected-path, evidence, and file-count policy checks.
- Persistent workspace/proposal audit records, relative-link checks, unified diff review, and a lightweight browser interface.
- Publication to a new branch through an isolated temporary Git worktree, with stale-SHA and dirty-worktree protection.
- A GitHub Git Data adapter with App installation-token exchange and pull-request creation primitives.

The included deterministic model provider generates clearly marked placeholder prose for local development. Remote GitHub onboarding, webhook indexing, rich-text editing, collaborative review, and production authentication remain roadmap work.

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

Open [http://localhost:4100](http://localhost:4100), enter an absolute path to a clean local Git repository, choose a Markdown file, and request a proposal. The development server does not publish until the `/v1/workspaces/{id}/publish` endpoint is explicitly called.

Copy `.env.example` to `.env` to configure repository roots and optional model/GitHub credentials. See [configuration](docs/configuration.md) and [security guidance](SECURITY.md). Real credentials must never be committed.

The complete request/response workflow is documented in the [HTTP API guide](docs/api.md).

For a containerized setup, set `AGENTDOCS_REPOSITORIES_PATH` and run `docker compose up --build`.

For backend development, run `npm run dev`. Rebuild the static client with `npm run build --workspace @agentdocs/web` after UI changes.

## Repository layout

```text
apps/
  api/             Local workspace and proposal HTTP API
  web/             Zero-build review client
packages/
  agent-runtime/   Staged agent orchestration and provider interface
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
- `POST /v1/workspaces/{id}/agent-runs`
- `POST /v1/workspaces/{id}/publish`
- `POST /v1/workspaces/{id}/pull-request`
- `GET /health`

Workspace and proposal audit state is persisted as owner-readable JSON under `AGENTDOCS_DATA_DIR`; canonical document content remains in Git.

Pull requests and pushes run the same type-check, test, build, environment-validation, and dependency-audit checks through GitHub Actions. Dependabot checks npm and workflow dependencies weekly.

## Working in this repository

- Read [`AGENTS.md`](AGENTS.md) before making changes. It defines when repository documentation must be updated.
- Keep this README aligned with sizeable changes and with changes that introduce information users or contributors need.
- Record meaningful technical and architectural decisions, including those made during human–LLM sessions, in [`decisions_log.md`](decisions_log.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
