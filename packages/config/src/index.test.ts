import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertRepositoryAllowed, loadEnvironment } from ".";

describe("configuration", () => {
  it("enforces allowed repository roots", () => {
    assert.equal(assertRepositoryAllowed("/srv/docs/repo", ["/srv/docs"]), "/srv/docs/repo");
    assert.throws(() => assertRepositoryAllowed("/private/repo", ["/srv/docs"]), /outside allowed roots/);
  });
});
