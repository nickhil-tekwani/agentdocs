const { cp, mkdir, rm } = require("node:fs/promises");
const { join } = require("node:path");

async function build() {
  const output = join(__dirname, "dist");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(join(__dirname, "public"), output, { recursive: true });
  console.log("Built static AgentDocs client");
}

build().catch((error) => { console.error(error); process.exitCode = 1; });
