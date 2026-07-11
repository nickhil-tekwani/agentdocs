# Configuration

AgentDocs reads local settings from environment variables and repository policy from `.agentdocs/config.yml`. Copy `.env.example` to `.env`; never commit `.env` or real credentials.

## Local settings

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOST` | No | Bind address; defaults to `127.0.0.1`. |
| `PORT` | No | HTTP port; defaults to `4100`. |
| `AGENTDOCS_DATA_DIR` | No | Persistent workspace and proposal metadata; defaults to `./data`. |
| `AGENTDOCS_ALLOWED_REPOSITORY_ROOTS` | Recommended | Comma-separated absolute roots the server may open. Defaults to the server's working directory. |
| `AGENTDOCS_GIT_AUTHOR_NAME` | No | Author/committer name for published local commits. |
| `AGENTDOCS_GIT_AUTHOR_EMAIL` | No | Author/committer email for published local commits. |
| `AGENTDOCS_SESSION_SECRET` | Hosted only | Reserved for authenticated multi-user sessions. Generate at least 32 random bytes before exposing the service. |

## OpenAI provider

Set both variables to replace the deterministic development provider with the Responses API provider:

| Variable | Required together | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Server-side API credential. Never expose it to the browser or commit it. |
| `OPENAI_MODEL` | Yes | Explicit model ID selected by the operator. No model is silently chosen by AgentDocs. |
| `OPENAI_BASE_URL` | No | Responses-compatible API base; defaults to `https://api.openai.com/v1`. |

The provider requests strict JSON-schema output containing the complete replacement Markdown. Repository content is placed in user input and explicitly treated as untrusted reference data. The API key remains in the server process.

## GitHub App

The `@agentdocs/github-provider` package implements App JWT signing, installation-token exchange, pinned repository reads, Git Data branch publication, and pull-request creation. Create a remote workspace with `POST /v1/github/workspaces` after configuring the App values.

| Variable | Required together | Purpose |
| --- | --- | --- |
| `GITHUB_APP_ID` | Yes | GitHub App numeric ID. |
| `GITHUB_INSTALLATION_ID` | Yes | Installation ID for the selected account/repository scope. |
| `GITHUB_APP_PRIVATE_KEY` | Yes | PEM private key; escaped `\n` sequences are accepted. |
| `GITHUB_CLIENT_ID` | Pair | Optional OAuth client identifier reserved for user attribution. |
| `GITHUB_CLIENT_SECRET` | Pair | Optional OAuth client secret. |
| `GITHUB_WEBHOOK_SECRET` | No | Secret reserved for webhook signature validation. |

Recommended GitHub App repository permissions are Contents: read/write, Pull requests: read/write, Metadata: read, and Issues: read when issue grounding is enabled. Subscribe to push, pull request, and installation events when webhook indexing is added.

## Repository policy

`.agentdocs/config.yml` controls documentation roots, context scope, protected paths, evidence requirements, rendering mode, templates, and default publication behavior. Invalid configuration prevents workspace creation. If the file is absent, conservative defaults are used.

## Docker

Set `AGENTDOCS_REPOSITORIES_PATH` to the host directory containing repositories, then run:

```bash
docker compose up --build
```

That directory is mounted read/write at `/repositories`; the service refuses paths outside it. Workspace metadata uses the `agentdocs-data` volume. Treat the mount as privileged: only mount repositories the service is allowed to branch and commit to.
