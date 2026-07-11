# Decisions log

This file records meaningful technical and architectural decisions made by humans, agents, or human–LLM sessions. Add new entries at the top using the template below.

## Entry template

### YYYY-MM-DD — Short decision title

- **Status:** Accepted, proposed, superseded, or rejected
- **Decision:** What was decided.
- **Why:** The context and reasoning behind the decision.
- **Alternatives and tradeoffs:** Other options considered and why they were not chosen.
- **Consequences:** Important follow-up work, constraints, or effects.

## Decisions

### 2026-07-11 — Enforce the local verification suite in CI

- **Status:** Accepted
- **Decision:** Run environment validation, type-checking, unit/integration tests, all workspace builds, and `npm audit` on pushes and pull requests using Node.js 20. Enable weekly Dependabot updates for npm and GitHub Actions.
- **Why:** The repository now spans security-sensitive Git, provider, configuration, and API boundaries. Reusing the same `npm run check` command locally and in CI keeps the quality gate reproducible and prevents drift.
- **Alternatives and tradeoffs:** A larger matrix across operating systems and Node versions would catch more portability issues but adds cost before the supported runtime surface expands. Dependency scanning beyond npm audit remains future hardening.
- **Consequences:** Changes cannot be considered complete unless the single documented verification path passes. CI remains read-only except for Dependabot-authored update branches.

### 2026-07-11 — Keep secrets in validated environment configuration

- **Status:** Accepted
- **Decision:** Commit only `.env.example`, ignore `.env`, and validate OpenAI and GitHub credentials as complete groups at startup. Select the deterministic provider when no OpenAI credentials are present, and require operators to choose an explicit model ID when enabling OpenAI.
- **Why:** Credentials must remain outside Git and browser code. Group validation catches partial auth configuration early, while an explicit model avoids silently changing behavior as provider defaults evolve.
- **Alternatives and tradeoffs:** A secrets manager is preferable for hosted production but would make the local reference setup depend on external infrastructure. Choosing a built-in model default would reduce setup friction but create an unstable behavioral dependency.
- **Consequences:** Local setup needs no secrets. Hosted operators can inject environment variables from their secret manager. The application will fail startup on incomplete provider configuration.

### 2026-07-11 — Persist audit state while keeping documents in Git

- **Status:** Accepted
- **Decision:** Store workspace metadata, proposals, evidence, validation, run events, diffs, and publication results as atomic owner-readable JSON files under a configurable data directory. Keep document content canonical in Git and reconstruct Git adapters from stored repository bindings.
- **Why:** Restart-safe proposal review is necessary for a complete local workflow, but adding Postgres before multi-user/query requirements emerge would obscure the core Git invariants. Atomic files provide inspectable, disposable operational state without becoming a second document store.
- **Alternatives and tradeoffs:** Process memory was simpler but lost the audit trail on restart. SQLite would improve concurrent querying, and Postgres is still the intended hosted store; the JSON store is single-process and not appropriate for horizontally scaled deployments.
- **Consequences:** Local runs survive restarts and retain attribution. A future database adapter can implement the same store boundary without migrating canonical documents.

### 2026-07-11 — Provide local and GitHub Git publication adapters

- **Status:** Accepted
- **Decision:** Retain isolated local-worktree publication and add a GitHub Git Data adapter that uses short-lived installation tokens, creates blobs/trees/commits, creates a new branch without force-updating an existing ref, and can open a pull request.
- **Why:** Local-first development and hosted GitHub operation need different mechanics but must share pinned reads, proposal diffs, and publish results. Short-lived App installation tokens preserve least privilege and stay outside model context.
- **Alternatives and tradeoffs:** Cloning every hosted repository would simplify advanced merges but increase storage, credential, and cleanup complexity. The Git Data API is efficient for small MVP changes but rejects truncated large trees and does not yet implement three-way reconciliation.
- **Consequences:** Large repositories and complex merges must fall back to the clone-backed adapter later. Remote onboarding still needs user-facing installation and repository selection routes.

### 2026-07-11 — Implement Phase 0 as a local Git vertical slice

- **Status:** Accepted
- **Decision:** Begin with a TypeScript monorepo whose first runnable path uses local Git repositories, process-local workspace state, a provider-neutral agent runtime, a deterministic development provider, typed proposals, and an isolated-worktree publisher. Serve the initial review interface as static browser assets from the API.
- **Why:** The repository began with only a product specification. A thin end-to-end path proves the most important invariants—Git as canonical storage, base-SHA pinning, propose-before-mutate, evidence, policy checks, inspectable diffs, and isolated publication—without pretending that GitHub App infrastructure or a production model integration already exists. Static assets avoid a bundler dependency for an interface that does not yet need rich editor state.
- **Alternatives and tradeoffs:** Building the full React/ProseMirror, GitHub App, database, worker, and index architecture immediately would match the eventual product shape but leave more unverified integration surface. Using a hosted model in the first slice would demonstrate generation quality but require credentials and weaken deterministic tests. The local adapter is not yet suitable for multi-user hosting, and the static client will need replacement or expansion for rich editing.
- **Consequences:** The core package boundaries mirror the target architecture and can accept GitHub, persistent session, and model-provider adapters later. Node.js 20 is the minimum runtime. The current API must only be exposed in a trusted local environment because it accepts local repository paths and has no authentication layer.

### 2026-07-11 — License the repository under Apache 2.0

- **Status:** Accepted
- **Decision:** Replace the GNU Affero General Public License v3 with the Apache License 2.0.
- **Why:** Apache 2.0 permits broad use, modification, and distribution while retaining attribution, license-notice, and patent-grant protections.
- **Alternatives and tradeoffs:** Keeping AGPLv3 would preserve strong copyleft requirements, including source-sharing obligations for modified software offered over a network, but would be more restrictive for downstream adopters.
- **Consequences:** Future distributions must comply with Apache 2.0. The repository no longer imposes AGPLv3 copyleft requirements on new distributions under the updated license.

### 2026-07-11 — Maintain repository documentation alongside substantial changes

- **Status:** Accepted
- **Decision:** Use root-level `AGENTS.md` instructions to require README maintenance for sizeable or documentation-relevant changes and decision-log entries for meaningful technical or architectural decisions.
- **Why:** Keeping these expectations in repository-scoped agent instructions makes them automatically available to agents working here, while the decisions log preserves context that would otherwise be lost between human and LLM sessions.
- **Alternatives and tradeoffs:** Relying on contributors to remember these practices would add less process, but would be inconsistent across sessions. A more formal ADR directory was unnecessary for this small repository.
- **Consequences:** Changes may include small documentation updates alongside implementation work. Routine edits and trivial implementation choices do not need log entries.
