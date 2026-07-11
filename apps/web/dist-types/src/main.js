import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
const api = "http://localhost:4100";
function App() {
    const [repositoryPath, setRepositoryPath] = useState("");
    const [workspaceId, setWorkspaceId] = useState("");
    const [files, setFiles] = useState([]);
    const [targetPath, setTargetPath] = useState("README.md");
    const [intent, setIntent] = useState("Improve the project overview");
    const [instruction, setInstruction] = useState("Proposed update");
    const [result, setResult] = useState();
    const [error, setError] = useState("");
    async function connect() {
        try {
            setError("");
            const created = await request("/v1/workspaces", { repositoryPath });
            setWorkspaceId(created.id);
            const tree = await fetch(`${api}/v1/workspaces/${created.id}/tree`).then(check);
            setFiles(tree.files);
            setTargetPath(tree.files[0] ?? "README.md");
        }
        catch (cause) {
            setError(String(cause));
        }
    }
    async function propose() {
        try {
            setError("");
            setResult(await request(`/v1/workspaces/${workspaceId}/agent-runs`, { intent, targetPath, instruction }));
        }
        catch (cause) {
            setError(String(cause));
        }
    }
    return _jsxs("main", { children: [_jsxs("header", { children: [_jsx("span", { className: "eyebrow", children: "Git-native documentation" }), _jsx("h1", { children: "AgentDocs" }), _jsx("p", { children: "Ground an intent in repository evidence, then review the exact patch before anything changes." })] }), _jsxs("section", { className: "card connect", children: [_jsxs("label", { children: ["Local repository path", _jsx("input", { value: repositoryPath, onChange: (event) => setRepositoryPath(event.target.value), placeholder: "/path/to/repository" })] }), _jsx("button", { onClick: connect, children: "Connect repository" })] }), workspaceId && _jsxs("div", { className: "workspace", children: [_jsxs("aside", { className: "card", children: [_jsx("h2", { children: "Documents" }), files.map((file) => _jsx("button", { className: targetPath === file ? "file active" : "file", onClick: () => setTargetPath(file), children: file }, file))] }), _jsxs("section", { className: "card composer", children: [_jsx("h2", { children: "Propose a change" }), _jsxs("label", { children: ["Intent", _jsx("textarea", { value: intent, onChange: (event) => setIntent(event.target.value) })] }), _jsxs("label", { children: ["Section heading", _jsx("input", { value: instruction, onChange: (event) => setInstruction(event.target.value) })] }), _jsx("button", { onClick: propose, children: "Run agent" })] })] }), result && _jsxs("section", { className: "card review", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: "Ready for review" }), _jsx("h2", { children: "Evidence and run" }), result.events.map((event) => _jsxs("p", { children: [_jsx("strong", { children: event.stage }), " \u00B7 ", event.message] }, event.stage)), _jsxs("p", { children: ["Evidence: ", _jsxs("code", { children: [result.proposal.evidence[0]?.source, "@", result.proposal.baseSha.slice(0, 8)] })] }), result.proposal.warnings.map((warning) => _jsx("p", { className: "warning", children: warning }, warning))] }), _jsxs("div", { children: [_jsx("h2", { children: "Unified diff" }), _jsx("pre", { children: result.diff })] })] }), error && _jsx("p", { className: "error", children: error })] });
}
async function request(path, body) { return fetch(`${api}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(check); }
async function check(response) { const body = await response.json(); if (!response.ok)
    throw new Error(body.error ?? response.statusText); return body; }
createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map