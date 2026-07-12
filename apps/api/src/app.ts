import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ProposalRuntime, type RunEvent } from "@agentdocs/agent-runtime";
import { changeProposalSchema, evidenceRefSchema, fileOperationSchema, type ChangePolicy } from "@agentdocs/change-model";
import { assertRepositoryAllowed, loadRepositoryConfig, type AppEnvironment } from "@agentdocs/config";
import { LocalGitProvider } from "@agentdocs/git-provider";
import type { GitProvider } from "@agentdocs/git-provider";
import { GitHubAppTokenProvider, GitHubGitProvider } from "@agentdocs/github-provider";
import { JsonWorkspaceStore, type StoredWorkspace } from "./store";

const workspaceRequest = z.object({ repositoryPath: z.string().min(1) });
const githubWorkspaceRequest = z.object({ owner: z.string().regex(/^[A-Za-z0-9-]+$/), repository: z.string().regex(/^[A-Za-z0-9._-]+$/), defaultBranch: z.string().default("main") });
const manualEditRequest = z.object({ intent: z.string().min(1).max(10_000).default("Manual documentation edit"), content: z.string().max(2_000_000) });
const proposalRequest = z.object({ intent: z.string().min(1).max(10_000), operations: z.array(fileOperationSchema).min(1), evidence: z.array(evidenceRefSchema).optional() });
const publishRequest = z.object({ proposalId: z.string().uuid(), message: z.string().min(1).max(300), branch: z.string().regex(/^[A-Za-z0-9._/-]+$/).refine((branch) => !branch.includes("..") && !branch.startsWith("/") && !branch.endsWith("/"), "Unsafe branch name"), autoPush: z.boolean().default(true), targetBranch: z.string().optional() });
const pullRequest = z.object({ proposalId: z.string().uuid(), title: z.string().min(1).max(256), body: z.string().max(20_000).default("") });

export interface AppOptions { environment: AppEnvironment; store?: JsonWorkspaceStore; }

export function createApp(options: AppOptions) {
  const app = express();
  const store = options.store ?? new JsonWorkspaceStore(options.environment.dataDir);
  const githubToken = createGitHubTokenProvider(options.environment);
  app.disable("x-powered-by");
  app.use(cors({ origin: options.environment.NODE_ENV === "production" ? false : true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", async (_request, response, next) => {
    try { await store.initialize(); response.json({ status: "ok" }); } catch (error) { next(error); }
  });

  app.get("/v1/workspaces", async (_request, response, next) => {
    try { response.json((await store.list()).map(workspaceSummary)); } catch (error) { next(error); }
  });

  app.post("/v1/workspaces", async (request, response, next) => {
    try {
      const input = workspaceRequest.parse(request.body);
      const repositoryPath = assertRepositoryAllowed(input.repositoryPath, options.environment.allowedRepositoryRoots);
      const git = new LocalGitProvider(repositoryPath);
      const baseSha = await git.head();
      const config = await loadRepositoryConfig(repositoryPath);
      const workspace: StoredWorkspace = { id: randomUUID(), repositoryPath, baseSha, createdAt: new Date().toISOString(), config, proposals: {} };
      await store.save(workspace);
      response.status(201).json(workspaceSummary(workspace));
    } catch (error) { next(error); }
  });

  app.post("/v1/github/workspaces", async (request, response, next) => {
    try {
      if (!githubToken) throw Object.assign(new Error("GitHub App integration is not configured"), { status: 503 });
      const input = githubWorkspaceRequest.parse(request.body);
      const git = new GitHubGitProvider({ ...input, token: () => githubToken.token() });
      const baseSha = await git.head(input.defaultBranch);
      let config;
      try { config = await loadRepositoryConfig("", (await git.readFile(".agentdocs/config.yml", baseSha)).content); }
      catch (error) { if (!(typeof error === "object" && error && "status" in error && error.status === 404)) throw error; config = await loadRepositoryConfig("", "version: 1\n"); }
      const workspace: StoredWorkspace = { id: randomUUID(), github: input, baseSha, createdAt: new Date().toISOString(), config, proposals: {} };
      await store.save(workspace);
      response.status(201).json(workspaceSummary(workspace));
    } catch (error) { next(error); }
  });

  app.get("/v1/workspaces/:id", async (request, response, next) => {
    try { response.json(workspaceSummary(await requiredWorkspace(store, request.params.id))); } catch (error) { next(error); }
  });

  app.get("/v1/workspaces/:id/tree", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const sha = String(request.query.ref ?? workspace.baseSha);
      const files = await providerFor(workspace, githubToken).listFiles(sha);
      response.json({ sha, files: files.filter((path) => /\.mdx?$/.test(path) && inDocsRoots(path, workspace.config.docs_roots)) });
    } catch (error) { next(error); }
  });

  app.get("/v1/workspaces/:id/files/*", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const sha = String(request.query.ref ?? workspace.baseSha);
      const path = (request.params as Record<string, string>)["0"];
      if (!inDocsRoots(path, workspace.config.docs_roots)) throw Object.assign(new Error("File is outside documentation roots"), { status: 403 });
      response.json(await providerFor(workspace, githubToken).readFile(path, sha));
    } catch (error) { next(error); }
  });

  app.get("/v1/workspaces/:id/proposals", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      response.json(Object.values(workspace.proposals).map(({ proposal, createdAt, published }) => ({ id: proposal.id, intent: proposal.intent, validation: proposal.validation, createdAt, published })));
    } catch (error) { next(error); }
  });

  app.get("/v1/workspaces/:id/proposals/:proposalId", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const record = workspace.proposals[request.params.proposalId];
      if (!record) throw Object.assign(new Error("Proposal not found"), { status: 404 });
      response.json(record);
    } catch (error) { next(error); }
  });

  app.put("/v1/workspaces/:id/files/*", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const input = manualEditRequest.parse(request.body);
      const path = (request.params as Record<string, string>)["0"];
      if (!inDocsRoots(path, workspace.config.docs_roots)) throw Object.assign(new Error("Target is outside documentation roots"), { status: 403 });
      const git = providerFor(workspace, githubToken);
      const events: RunEvent[] = [];
      const operation = (await git.listFiles(workspace.baseSha)).includes(path) ? { type: "modify" as const, path, content: input.content } : { type: "create" as const, path, content: input.content };
      const proposal = await new ProposalRuntime(git, toPolicy(workspace), workspace.baseSha).create({ intent: input.intent, operations: [operation] }, (event) => events.push(event));
      const diff = await git.diff(proposal);
      workspace.proposals[proposal.id] = { proposal, events, diff, createdAt: new Date().toISOString() };
      await store.save(workspace);
      response.status(201).json(workspace.proposals[proposal.id]);
    } catch (error) { next(error); }
  });

  app.post("/v1/workspaces/:id/proposals", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const input = proposalRequest.parse(request.body);
      const git = providerFor(workspace, githubToken);
      const events: RunEvent[] = [];
      const proposal = await new ProposalRuntime(git, toPolicy(workspace), workspace.baseSha).create(input, (event) => events.push(event));
      const diff = await git.diff(proposal);
      workspace.proposals[proposal.id] = { proposal, events, diff, createdAt: new Date().toISOString() };
      await store.save(workspace);
      response.status(201).json(workspace.proposals[proposal.id]);
    } catch (error) { next(error); }
  });

  app.post("/v1/workspaces/:id/publish", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const input = publishRequest.parse(request.body);
      const record = workspace.proposals[input.proposalId];
      if (!record) throw Object.assign(new Error("Proposal not found"), { status: 404 });
      if (record.published) throw Object.assign(new Error("Proposal has already been published"), { status: 409 });
      const proposal = changeProposalSchema.parse(record.proposal);
      if (Object.values(proposal.validation).includes("failed") || Object.values(proposal.validation).includes("pending")) throw Object.assign(new Error("All validations must pass before publishing"), { status: 409 });
      record.published = await providerFor(workspace, githubToken).publish(proposal, input.message, input.branch, { push: input.autoPush, targetBranch: input.targetBranch });
      await store.save(workspace);
      response.status(201).json(record.published);
    } catch (error) { next(error); }
  });

  app.post("/v1/workspaces/:id/pull-request", async (request, response, next) => {
    try {
      const workspace = await requiredWorkspace(store, request.params.id);
      const input = pullRequest.parse(request.body);
      const record = workspace.proposals[input.proposalId];
      if (!record?.published) throw Object.assign(new Error("Publish the proposal branch before opening a pull request"), { status: 409 });
      if (record.pullRequest) throw Object.assign(new Error("A pull request already exists for this proposal"), { status: 409 });
      const provider = providerFor(workspace, githubToken);
      if (!(provider instanceof GitHubGitProvider)) throw Object.assign(new Error("Pull-request creation is available only for GitHub workspaces"), { status: 400 });
      record.pullRequest = await provider.openPullRequest(record.published.branch, input.title, input.body, workspace.github?.defaultBranch);
      await store.save(workspace);
      response.status(201).json(record.pullRequest);
    } catch (error) { next(error); }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : error instanceof z.ZodError ? 400 : 500;
    if (options.environment.NODE_ENV !== "test" && status >= 500) console.error(error);
    response.status(status).json({ error: error instanceof Error ? error.message : String(error), details: error instanceof z.ZodError ? error.issues : undefined });
  });
  return app;
}

function createGitHubTokenProvider(environment: AppEnvironment): GitHubAppTokenProvider | undefined {
  return environment.GITHUB_APP_ID && environment.GITHUB_INSTALLATION_ID && environment.GITHUB_APP_PRIVATE_KEY
    ? new GitHubAppTokenProvider({ appId: environment.GITHUB_APP_ID, installationId: environment.GITHUB_INSTALLATION_ID, privateKey: environment.GITHUB_APP_PRIVATE_KEY })
    : undefined;
}

function providerFor(workspace: StoredWorkspace, githubToken?: GitHubAppTokenProvider): GitProvider {
  if (workspace.repositoryPath) return new LocalGitProvider(workspace.repositoryPath);
  if (workspace.github && githubToken) return new GitHubGitProvider({ ...workspace.github, token: () => githubToken.token() });
  throw Object.assign(new Error("Workspace provider is not configured"), { status: 503 });
}

async function requiredWorkspace(store: JsonWorkspaceStore, id: string): Promise<StoredWorkspace> {
  const workspace = await store.get(id);
  if (!workspace) throw Object.assign(new Error("Workspace not found"), { status: 404 });
  return workspace;
}

function workspaceSummary(workspace: StoredWorkspace) { return { id: workspace.id, kind: workspace.github ? "github" : "local", repositoryPath: workspace.repositoryPath, github: workspace.github, baseSha: workspace.baseSha, createdAt: workspace.createdAt, config: workspace.config, proposalCount: Object.keys(workspace.proposals).length }; }
function inDocsRoots(path: string, roots: string[]) { return !path.startsWith("/") && !path.split("/").includes("..") && roots.some((root) => root === "." || path === root || path.startsWith(`${root}/`)); }
function toPolicy(workspace: StoredWorkspace): ChangePolicy { return { docsRoots: workspace.config.docs_roots, maxFilesPerChange: workspace.config.policies.max_files_per_change, protectedPaths: workspace.config.policies.protected_paths, requireEvidence: workspace.config.policies.require_evidence }; }
