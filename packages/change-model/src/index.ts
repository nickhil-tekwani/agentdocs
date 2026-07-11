import { z } from "zod";

export const evidenceRefSchema = z.object({
  claimId: z.string().min(1),
  source: z.string().min(1),
  commitSha: z.string().min(7),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional()
});

export const fileOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), path: z.string().min(1), content: z.string() }),
  z.object({ type: z.literal("modify"), path: z.string().min(1), content: z.string() }),
  z.object({ type: z.literal("delete"), path: z.string().min(1) })
]);

export const changeProposalSchema = z.object({
  id: z.string().uuid(),
  baseSha: z.string().min(7),
  intent: z.string().min(1),
  operations: z.array(fileOperationSchema).min(1),
  evidence: z.array(evidenceRefSchema).default([]),
  warnings: z.array(z.string()).default([]),
  validation: z.object({
    markdown: z.enum(["pending", "passed", "failed"]),
    links: z.enum(["pending", "passed", "failed"]),
    policy: z.enum(["pending", "passed", "failed"])
  })
});

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type FileOperation = z.infer<typeof fileOperationSchema>;
export type ChangeProposal = z.infer<typeof changeProposalSchema>;

export interface ChangePolicy {
  docsRoots: string[];
  maxFilesPerChange: number;
  protectedPaths: string[];
  requireEvidence: boolean;
}

export function assertProposalPolicy(proposal: ChangeProposal, policy: ChangePolicy): void {
  if (proposal.operations.length > policy.maxFilesPerChange) {
    throw new Error(`Proposal exceeds the ${policy.maxFilesPerChange}-file limit`);
  }
  const paths = new Set<string>();
  for (const operation of proposal.operations) {
    const path = operation.path.replace(/^\.\//, "");
    if (path.startsWith("/") || path.split("/").includes("..")) throw new Error(`Unsafe path: ${path}`);
    if (paths.has(path)) throw new Error(`Duplicate operation for ${path}`);
    paths.add(path);
    if (!policy.docsRoots.some((root) => root === "." || path === root || path.startsWith(`${root}/`))) {
      throw new Error(`Path is outside configured documentation roots: ${path}`);
    }
    if (policy.protectedPaths.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`))) {
      throw new Error(`Path is protected: ${path}`);
    }
  }
  if (policy.requireEvidence && proposal.evidence.length === 0) {
    throw new Error("Repository policy requires at least one evidence reference");
  }
}
