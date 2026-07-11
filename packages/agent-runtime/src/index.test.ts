import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { OpenAIResponsesModelProvider } from ".";

describe("OpenAI Responses provider", () => {
  let server: Server;
  let baseUrl: string;
  let received: any;
  before(async () => {
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => { received = JSON.parse(body); response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ output_text: JSON.stringify({ content: "# Updated\n" }) })); });
    }).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected TCP address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

  it("requests strict structured output and returns a typed operation", async () => {
    const provider = new OpenAIResponsesModelProvider({ apiKey: "test", model: "test-model", baseUrl });
    const operations = await provider.propose({ intent: "Update it", targetPath: "README.md", instruction: "Be concise" }, { baseSha: "abcdef123", path: "README.md", content: "# Before\n" });
    assert.deepEqual(operations, [{ type: "modify", path: "README.md", content: "# Updated\n" }]);
    assert.equal(received.model, "test-model");
    assert.equal(received.text.format.type, "json_schema");
    assert.equal(received.text.format.strict, true);
  });
});
