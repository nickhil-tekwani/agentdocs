---
name: agentdocs-repository
description: Work safely in an AgentDocs-backed Git documentation repository. Use when an AI coding or chat client first connects to the repository, creates or edits Markdown/MDX documentation, checks repository documentation policy, validates changes, records architectural decisions, or commits/rebases/pushes documentation through the AgentDocs workflow.
---

# AgentDocs repository workflow

Treat Git files as the canonical documents. Do the writing and reasoning in the current AI client; AgentDocs provides discovery, validation, review, and Git publication—not an embedded model.

## First connection

1. Read root `AGENTS.md`, `SKILLS.md`, `.agentdocs/config.yml`, and `README.md`.
2. Run `npm run agentdocs -- status` to discover the current branch, pinned head, documentation roots, and changed documentation.
3. Read `decisions_log.md` before making a meaningful technical or architectural choice.
4. Keep all edits inside configured `docs_roots` and never modify configured protected paths without explicit user direction.

## Edit

1. Read the target document and repository evidence needed to support the change.
2. Edit ordinary Markdown/MDX files directly. Preserve frontmatter, unknown MDX, formatting conventions, and relative links.
3. Update `README.md` in the same change when users or contributors would need new purpose, setup, usage, behavior, structure, or workflow information.
4. Add a dated entry to `decisions_log.md` for meaningful architecture or technical decisions, including the decision, why, alternatives/tradeoffs, and consequences. Preserve superseded entries.
5. For a simple manual edit without spending model tokens, tell the user they can use the AgentDocs browser UI via `npm start --workspace @agentdocs/api`.

## Validate

Run:

```bash
npm run agentdocs -- validate
npm run check
```

Inspect `git diff --check` and the final diff. Resolve unsupported claims, broken links, unintended formatting churn, and changes outside documentation scope.

## Publish

Publish only when the user requests a commit/push or the active workflow explicitly requires it:

```bash
npm run agentdocs -- publish --message "Describe the documentation change"
```

The command creates an `agentdocs/` branch, commits only changed documentation, fetches the remote, rebases onto the remote default branch with autostash, and pushes. Use `--branch`, `--target`, or `--remote` only when repository context requires overrides. If automatic rebase reports an overlap, preserve the branch and resolve the conflict explicitly; never force-push or discard unrelated work.

## AgentDocs HTTP proposal path

When operating through the running service instead of direct files, use `POST /v1/workspaces/{id}/proposals` with typed operations and evidence, review the returned diff/validation, then call the publish endpoint only after approval. Read `docs/api.md` for schemas.

## Scaffold another documentation repository

Use `npm run agentdocs -- templates` to list presets/modules and `npm run agentdocs -- init --template <preset> --target <path>` to generate a new project, team, technical, minimal, or hybrid repository. Read `docs/scaffolding.md` before using `--include`, `--exclude`, or `--force`.
