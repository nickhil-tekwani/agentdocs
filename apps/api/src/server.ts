import { createApp } from "./app";
import express from "express";
import { resolve } from "node:path";
import { loadEnvironment } from "@agentdocs/config";

const environment = loadEnvironment(process.env, resolve(__dirname, "../../../.env"));
process.env.GIT_AUTHOR_NAME ??= environment.AGENTDOCS_GIT_AUTHOR_NAME;
process.env.GIT_AUTHOR_EMAIL ??= environment.AGENTDOCS_GIT_AUTHOR_EMAIL;
process.env.GIT_COMMITTER_NAME ??= environment.AGENTDOCS_GIT_AUTHOR_NAME;
process.env.GIT_COMMITTER_EMAIL ??= environment.AGENTDOCS_GIT_AUTHOR_EMAIL;
const app = createApp({ environment });
const webRoot = resolve(__dirname, "../../web/dist");
app.use(express.static(webRoot));
app.get("*", (_request, response) => response.sendFile(resolve(webRoot, "index.html")));
app.listen(environment.PORT, environment.HOST, () => console.log(`AgentDocs listening on http://${environment.HOST}:${environment.PORT}`));
