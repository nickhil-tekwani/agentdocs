import { randomUUID } from "node:crypto";
import { posix } from "node:path";
import { assertProposalPolicy, changeProposalSchema, type ChangePolicy, type ChangeProposal, type EvidenceRef, type FileOperation } from "@agentdocs/change-model";
import type { GitProvider } from "@agentdocs/git-provider";
import { validateMarkdown, validateRelativeLinks } from "@agentdocs/markdown-core";

export type RunStage = "read" | "validate" | "ready";
export interface RunEvent { stage: RunStage; message: string; }
export interface ProposalRequest { intent: string; operations: FileOperation[]; evidence?: EvidenceRef[]; }

export class ProposalRuntime {
  constructor(private readonly git: GitProvider, private readonly policy: ChangePolicy, private readonly pinnedBaseSha: string) {}

  async create(request: ProposalRequest, onEvent: (event: RunEvent) => void = () => undefined): Promise<ChangeProposal> {
    onEvent({ stage: "read", message: `Using repository state at ${this.pinnedBaseSha.slice(0, 8)}` });
    const repositoryPaths = new Set(await this.git.listFiles(this.pinnedBaseSha));
    let hasChange = false;
    for (const operation of request.operations) {
      const exists = repositoryPaths.has(operation.path);
      if (operation.type === "create" && exists) throw Object.assign(new Error(`Cannot create existing file: ${operation.path}`), { status: 400 });
      if ((operation.type === "modify" || operation.type === "delete") && !exists) throw Object.assign(new Error(`Cannot ${operation.type} missing file: ${operation.path}`), { status: 400 });
      if (operation.type === "delete" || operation.type === "create") hasChange = true;
      else if ((await this.git.readFile(operation.path, this.pinnedBaseSha)).content !== operation.content) hasChange = true;
    }
    if (!hasChange) throw Object.assign(new Error("Proposal does not change any files"), { status: 400 });
    const markdownPassed = request.operations.every((operation) => operation.type === "delete" || validateMarkdown(operation.content).valid);
    const knownPaths = new Set(repositoryPaths);
    request.operations.forEach((operation) => operation.type === "delete" ? knownPaths.delete(operation.path) : knownPaths.add(operation.path));
    const brokenLinks = request.operations.flatMap((operation) => {
      if (operation.type === "delete") return [];
      const directory = posix.dirname(operation.path);
      const relativeKnown = new Set(Array.from(knownPaths, (path) => posix.relative(directory, path)));
      return validateRelativeLinks(operation.content, relativeKnown).map((link) => `${operation.path}: ${link}`);
    });
    onEvent({ stage: "validate", message: `Validated ${request.operations.length} operation(s)` });
    const proposal = changeProposalSchema.parse({
      id: randomUUID(), baseSha: this.pinnedBaseSha, intent: request.intent, operations: request.operations,
      evidence: request.evidence ?? request.operations.map((operation, index) => ({ claimId: `edited-file-${index + 1}`, source: operation.path, commitSha: this.pinnedBaseSha })),
      warnings: brokenLinks.map((link) => `Unresolved relative link: ${link}`),
      validation: { markdown: markdownPassed ? "passed" : "failed", links: brokenLinks.length ? "failed" : "passed", policy: "pending" }
    });
    assertProposalPolicy(proposal, this.policy);
    proposal.validation.policy = "passed";
    onEvent({ stage: "ready", message: "Proposal is ready for review" });
    return proposal;
  }
}
