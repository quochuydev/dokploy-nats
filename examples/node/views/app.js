import { connect, JSONCodec } from "https://esm.sh/nats.ws@1.29.2";

const $ = (id) => document.getElementById(id);
const jc = JSONCodec();
let nc = null;
const rowsById = new Map();

const idsParam = new URLSearchParams(location.search).get("ids");
const watchIds = idsParam
  ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const subjects = watchIds ? watchIds.map((id) => `executions.${id}.>`) : ["executions.>"];
const submitPrefix = watchIds?.[0] ?? "default";

const setStatus = (text, cls = "") => {
  const el = $("status");
  el.textContent = text;
  el.className = cls;
};

const upsertRow = (e) => {
  let tr = rowsById.get(e.executionId);
  if (!tr) {
    tr = document.createElement("tr");
    rowsById.set(e.executionId, tr);
    $("rows").prepend(tr);
  }
  tr.className = e.status;
  tr.innerHTML = `
    <td>${new Date(e.at).toLocaleTimeString()}</td>
    <td>${e.prefix ?? ""}</td>
    <td>${e.executionId}</td>
    <td>${e.seq}</td>
    <td class="status">${e.status}</td>
    <td>${e.message ?? ""}</td>
  `;
};

const consume = async (subject) => {
  const sub = nc.subscribe(subject);
  for await (const m of sub) {
    try { upsertRow(jc.decode(m.data)); } catch (err) { console.error(err); }
  }
};

const doConnect = async () => {
  const servers = $("url").value.trim();
  const token = $("token").value.trim() || undefined;
  try {
    nc = await connect({ servers, token });
    const mode = watchIds ? `ids=${watchIds.join(",")}` : "all";
    setStatus(`connected to ${nc.getServer()} (${mode})`, "ok");
    $("submit").disabled = false;
    subjects.forEach(consume);
    nc.closed().then((err) => {
      setStatus(`disconnected${err ? ": " + err.message : ""}`, err ? "err" : "");
      $("submit").disabled = true;
      nc = null;
      rowsById.clear();
    });
  } catch (err) {
    setStatus(`connect failed: ${err.message}`, "err");
  }
};

$("connect").onclick = doConnect;

$("submit").onclick = async () => {
  if (!nc) return;
  let payload;
  try { payload = JSON.parse($("payload").value || "{}"); }
  catch { setStatus("payload is not valid JSON", "err"); return; }

  const body = { name: $("name").value.trim(), payload, prefix: submitPrefix };
  try {
    const res = await fetch($("api").value.trim(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { executionId, error, detail } = await res.json();
    if (!executionId) throw new Error(error ? `${error}: ${detail ?? ""}` : "no executionId");
    setStatus(`accepted ${executionId}`, "ok");
  } catch (err) {
    setStatus(`request failed: ${err.message}`, "err");
  }
};

doConnect();
