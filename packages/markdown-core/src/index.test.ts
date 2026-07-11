import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMarkdown, serializeMarkdown, validateMarkdown } from ".";

describe("markdown core", () => {
  it("round-trips source without diff churn", () => {
    const source = "---\ntitle: Demo\n---\n\n# Hello\n\n| a | b |\n| - | - |\n| 1 | 2 |\n";
    assert.equal(serializeMarkdown(parseMarkdown(source)), source);
  });

  it("extracts links during validation", () => {
    assert.deepEqual(validateMarkdown("See [guide](docs/guide.md).\n").links, ["docs/guide.md"]);
  });
});
