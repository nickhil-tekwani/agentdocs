import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertProposalPolicy, type ChangeProposal } from ".";

const proposal: ChangeProposal = {
  id: "e7631f44-c416-4db2-a506-ecf65bebe39d",
  baseSha: "abcdef123",
  intent: "Update docs",
  operations: [{ type: "modify", path: "docs/guide.md", content: "# Guide\n" }],
  evidence: [{ claimId: "claim-1", source: "src/app.ts", commitSha: "abcdef123" }],
  warnings: [],
  validation: { markdown: "pending", links: "pending", policy: "pending" }
};

describe("assertProposalPolicy", () => {
  it("accepts scoped and evidenced proposals", () => {
    assert.doesNotThrow(() => assertProposalPolicy(proposal, { docsRoots: ["docs"], maxFilesPerChange: 2, protectedPaths: [], requireEvidence: true }));
  });

  it("blocks traversal and protected paths", () => {
    assert.throws(() => assertProposalPolicy({ ...proposal, operations: [{ type: "delete", path: "../README.md" }] }, { docsRoots: ["."], maxFilesPerChange: 2, protectedPaths: [], requireEvidence: true }), /Unsafe path/);
    assert.throws(() => assertProposalPolicy({ ...proposal, operations: [{ type: "modify", path: "docs/security/keys.md", content: "x" }] }, { docsRoots: ["docs"], maxFilesPerChange: 2, protectedPaths: ["docs/security"], requireEvidence: true }), /protected/);
  });
});
