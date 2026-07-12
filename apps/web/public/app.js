let workspaceId = "";
let targetPath = "";
let proposalId = "";
const byId = (id) => document.getElementById(id);

byId("connect").addEventListener("click", async () => {
  try {
    clearError();
    const created = await request("/v1/workspaces", { repositoryPath: byId("repository").value });
    workspaceId = created.id;
    const tree = await fetch(`/v1/workspaces/${workspaceId}/tree`).then(check);
    targetPath = tree.files[0] || "README.md";
    byId("files").replaceChildren(...tree.files.map(fileButton));
    byId("workspace").classList.remove("hidden");
    await loadFile(targetPath);
  } catch (error) { showError(error); }
});

byId("save").addEventListener("click", async () => {
  try {
    clearError();
    const result = await request(`/v1/workspaces/${workspaceId}/files/${encodePath(targetPath)}`, { intent: byId("intent").value, content: byId("content").value }, "PUT");
    proposalId = result.proposal.id;
    byId("events").replaceChildren(...result.events.map((event) => { const line = document.createElement("p"); line.textContent = `${event.stage} · ${event.message}`; return line; }));
    const evidence = result.proposal.evidence[0];
    byId("evidence").textContent = `Evidence: ${evidence.source}@${result.proposal.baseSha.slice(0, 8)}`;
    byId("warning").textContent = result.proposal.warnings.join(" ");
    byId("validation").textContent = Object.entries(result.proposal.validation).map(([name, status]) => `${name}: ${status}`).join(" · ");
    byId("published").textContent = "";
    byId("diff").textContent = result.diff;
    byId("review").classList.remove("hidden");
  } catch (error) { showError(error); }
});

byId("publish").addEventListener("click", async () => {
  if (!confirm("Publish this exact proposal to a new local Git branch?")) return;
  try {
    clearError();
    const result = await request(`/v1/workspaces/${workspaceId}/publish`, { proposalId, branch: byId("branch").value, message: byId("message").value, autoPush: byId("auto-push").checked });
    byId("published").textContent = `${result.pushed ? "Pushed" : "Committed"} ${result.commitSha.slice(0, 8)} on ${result.branch}${result.rebasedOnto ? ` after rebasing onto ${result.rebasedOnto}` : ""}`;
    byId("publish").disabled = true;
  } catch (error) { showError(error); }
});

function fileButton(path) { const button = document.createElement("button"); button.className = "file"; button.textContent = path; button.addEventListener("click", async () => { targetPath = path; document.querySelectorAll(".file").forEach((item) => item.classList.toggle("active", item === button)); await loadFile(path); }); return button; }
async function loadFile(path) { const file = await fetch(`/v1/workspaces/${workspaceId}/files/${encodePath(path)}`).then(check); byId("content").value = file.content; }
function encodePath(path) { return path.split("/").map(encodeURIComponent).join("/"); }
async function request(path, body, method = "POST") { return fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(check); }
async function check(response) { const body = await response.json(); if (!response.ok) throw new Error(body.error || response.statusText); return body; }
function clearError() { byId("error").textContent = ""; }
function showError(error) { byId("error").textContent = String(error); }
