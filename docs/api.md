# HTTP API

The API is versioned under `/v1`. JSON errors use `{ "error": "message" }`; schema failures also include `details`.

## Local workspace

```http
POST /v1/workspaces
Content-Type: application/json

{"repositoryPath":"/absolute/path/to/repository"}
```

The path must be inside `AGENTDOCS_ALLOWED_REPOSITORY_ROOTS`. Workspace creation pins the current `HEAD` and loads `.agentdocs/config.yml`.

## GitHub workspace

```http
POST /v1/github/workspaces
Content-Type: application/json

{"owner":"example","repository":"docs","defaultBranch":"main"}
```

This route requires configured GitHub App credentials. The selected installation must have access to the repository.

## Browse

```text
GET /v1/workspaces
GET /v1/workspaces/{id}
GET /v1/workspaces/{id}/tree
GET /v1/workspaces/{id}/files/{path}
```

Only Markdown/MDX files within configured documentation roots appear in the tree.

## Edit or propose

```http
PUT /v1/workspaces/{id}/files/README.md
Content-Type: application/json

{
  "intent": "Explain local installation",
  "content": "# Complete replacement Markdown"
}
```

The manual UI uses this route. External AI clients can instead submit one or more typed create/modify/delete operations with optional evidence:

```http
POST /v1/workspaces/{id}/proposals
Content-Type: application/json

{"intent":"Update the guide","operations":[{"type":"modify","path":"README.md","content":"# Updated"}]}
```

Responses contain the typed proposal, validation results, warnings, and unified diff. Proposals are persisted but do not mutate Git.

```text
GET /v1/workspaces/{id}/proposals
GET /v1/workspaces/{id}/proposals/{proposalId}
```

## Publish

```http
POST /v1/workspaces/{id}/publish
Content-Type: application/json

{
  "proposalId": "<uuid>",
  "message": "Document local installation",
  "branch": "agentdocs/local-installation",
  "autoPush": true,
  "targetBranch": "main"
}
```

Every validation must pass. Local publication creates an isolated worktree, commits, fetches, rebases onto the remote target, and pushes the new branch. Non-overlapping GitHub API proposals are automatically replayed onto the latest target SHA; overlapping files return a conflict for explicit resolution. AgentDocs never force-pushes.

For GitHub workspaces only:

```http
POST /v1/workspaces/{id}/pull-request
Content-Type: application/json

{
  "proposalId": "<uuid>",
  "title": "Document local installation",
  "body": "AgentDocs proposal with evidence and validation."
}
```

## Operations

`GET /health` checks persistent storage. Workspace JSON files are created with owner-only permissions under `AGENTDOCS_DATA_DIR`.
