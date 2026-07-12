# Repository skills

AI clients working in this repository should load the canonical [`agentdocs-repository` skill](skills/agentdocs-repository/SKILL.md).

The skill covers first-time repository discovery, documentation editing, evidence and decision logging, validation, manual UI usage, and safe commit/rebase/push publication. Git files remain canonical, and the user's chosen AI client performs all reasoning and writing.

Client discovery adapters are provided under `.agents/skills`, `.claude/skills`, and `.cursor/rules`. If a client does not auto-discover them, explicitly ask it to read `AGENTS.md`, `SKILLS.md`, and `skills/agentdocs-repository/SKILL.md` before working.
