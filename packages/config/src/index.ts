import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const optionalString = z.string().trim().optional().transform((value) => value || undefined);
const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  AGENTDOCS_DATA_DIR: z.string().default("./data"),
  AGENTDOCS_ALLOWED_REPOSITORY_ROOTS: optionalString,
  AGENTDOCS_SESSION_SECRET: optionalString,
  AGENTDOCS_GIT_AUTHOR_NAME: z.string().default("AgentDocs"),
  AGENTDOCS_GIT_AUTHOR_EMAIL: z.string().email().default("agentdocs@example.invalid"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  GITHUB_APP_ID: optionalString,
  GITHUB_INSTALLATION_ID: optionalString,
  GITHUB_APP_PRIVATE_KEY: optionalString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  GITHUB_WEBHOOK_SECRET: optionalString
}).superRefine((env, context) => {
  if (Boolean(env.OPENAI_API_KEY) !== Boolean(env.OPENAI_MODEL)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "OPENAI_API_KEY and OPENAI_MODEL must be set together" });
  }
  const githubAppValues = [env.GITHUB_APP_ID, env.GITHUB_INSTALLATION_ID, env.GITHUB_APP_PRIVATE_KEY];
  if (githubAppValues.some(Boolean) && !githubAppValues.every(Boolean)) context.addIssue({ code: z.ZodIssueCode.custom, message: "GITHUB_APP_ID, GITHUB_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY must be set together" });
  if (Boolean(env.GITHUB_CLIENT_ID) !== Boolean(env.GITHUB_CLIENT_SECRET)) context.addIssue({ code: z.ZodIssueCode.custom, message: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together" });
});

const repositoryConfigSchema = z.object({
  version: z.literal(1),
  docs_roots: z.array(z.string().min(1)).min(1).default(["."]),
  default_write_mode: z.enum(["suggest", "branch", "pull_request", "direct_commit"]).default("pull_request"),
  rendering: z.object({ flavor: z.enum(["commonmark", "gfm"]).default("gfm"), mdx: z.boolean().default(false) }).default({}),
  agents: z.object({ context_roots: z.array(z.string()).default([]), external_web: z.boolean().default(false) }).default({}),
  policies: z.object({ require_evidence: z.boolean().default(true), max_files_per_change: z.number().int().positive().max(100).default(20), protected_paths: z.array(z.string()).default([]) }).default({}),
  templates: z.record(z.string()).default({})
});

export type AppEnvironment = z.infer<typeof environmentSchema> & { dataDir: string; allowedRepositoryRoots: string[]; };
export type RepositoryConfig = z.infer<typeof repositoryConfigSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env, envFile?: string): AppEnvironment {
  if (source === process.env) loadDotEnv(envFile ? { path: envFile } : undefined);
  const parsed = environmentSchema.parse(source);
  const roots = parsed.AGENTDOCS_ALLOWED_REPOSITORY_ROOTS?.split(",").map((root) => resolve(root.trim())).filter(Boolean) ?? [process.cwd()];
  return { ...parsed, dataDir: resolve(parsed.AGENTDOCS_DATA_DIR), allowedRepositoryRoots: roots };
}

export async function loadRepositoryConfig(repositoryPath: string, refContent?: string): Promise<RepositoryConfig> {
  try {
    const content = refContent ?? await readFile(resolve(repositoryPath, ".agentdocs/config.yml"), "utf8");
    return repositoryConfigSchema.parse(parseYaml(content));
  } catch (error) {
    if (refContent !== undefined || !(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    return repositoryConfigSchema.parse({ version: 1 });
  }
}

export function assertRepositoryAllowed(repositoryPath: string, allowedRoots: string[]): string {
  const normalized = resolve(repositoryPath);
  const allowed = allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
  if (!allowed) throw Object.assign(new Error(`Repository path is outside allowed roots: ${normalized}`), { status: 403 });
  return normalized;
}
