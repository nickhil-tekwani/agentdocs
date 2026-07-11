# Security

The current release is a local/private-development foundation, not an internet-ready multi-user service.

- Bind to `127.0.0.1` unless an authenticated reverse proxy and network policy protect the service.
- Restrict `AGENTDOCS_ALLOWED_REPOSITORY_ROOTS` to dedicated repository directories.
- Keep `.env`, OpenAI keys, GitHub private keys, OAuth secrets, installation tokens, and webhook secrets out of Git.
- Mount only repositories that AgentDocs is allowed to read and create branches in.
- Review every proposal and diff. The deterministic provider is placeholder-only, and model output remains untrusted.
- The server enforces base-SHA pinning, protected paths, documentation roots, evidence, validation, clean local worktrees, and one-time publication.

Before hosted use, implement user authentication/session enforcement, per-user repository authorization, webhook signature verification, CSRF protection, rate limits, secret scanning, encrypted credential storage, audit retention controls, and renderer sandboxing.

Report vulnerabilities privately to the repository owner rather than opening a public issue containing exploit details.
