import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { describe, it } from "node:test";
import { createAppJwt } from ".";

describe("GitHub App authentication", () => {
  it("creates a signed, short-lived app JWT", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const token = createAppJwt("12345", privateKey, 1_700_000_000);
    const [header, payload, signature] = token.split(".");
    assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url").toString()), { iat: 1_699_999_940, exp: 1_700_000_540, iss: "12345" });
    assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")), true);
  });
});
