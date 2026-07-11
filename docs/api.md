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

## Propose

```http
POST /v1/workspaces/{id}/agent-runs
Content-Type: application/json

{
  "intent": "Explain local installation",
  "targetPath": "README.md",
  "instruction": "Add a concise installation section"
}
```

The response contains the typed proposal, staged run events, evidence, validation results, warnings, and unified diff. Proposals are persisted but do not mutate Git.

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
  "branch": "agentdocs/local-installation"
}
```

Every validation must pass. Publication rejects stale base SHAs, duplicate publication, unsafe branch names, and dirty local worktrees. It always creates a new branch and never force-pushes.

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

`GET /health` checks persistent storage and reports the active model-provider kind. Workspace JSON files are created with owner-only permissions under `AGENTDOCS_DATA_DIR`.
