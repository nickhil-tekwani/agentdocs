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
