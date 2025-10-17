const LAMBDA_URL = window.__LAMBDA_URL || "";

document.addEventListener("DOMContentLoaded", () => {
  checkLambdaConnection();
  initRiotLookup();
});

async function checkLambdaConnection() {
  const status = document.getElementById("lambda-status");
  if (!status) return;
  try {
    const resp = await fetch(LAMBDA_URL, { method: "OPTIONS" });
    if (resp.ok) {
      status.textContent = "✅ Connected to AWS Lambda";
      status.style.color = "#00e0b8";
    } else {
      status.textContent = `⚠️ Lambda reachable (${resp.status})`;
      status.style.color = "#ffcc66";
    }
  } catch {
    status.textContent = "❌ Cannot reach Lambda endpoint – check CORS or URL.";
    status.style.color = "#ff6666";
  }
}

function initRiotLookup() {
  const form = document.getElementById("riot-form");
  const results = document.getElementById("riot-results");
  if (!form || !results) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const riotId = form.querySelector("#riotId").value.trim();
    const region = form.querySelector("#region").value;

    if (!riotId.includes("#")) {
      results.innerHTML =
        `<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>`;
      return;
    }

    results.innerHTML = "<p class='tiny muted'>Fetching data…</p>";

    try {
      const resp = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summonerName: riotId, region })
      });
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!resp.ok) {
        results.innerHTML =
          `<p class="tiny" style="color:#ff9b9b">Error ${resp.status}: ${text}</p>`;
        return;
      }

      renderResult(results, data);
    } catch (err) {
      results.innerHTML =
        `<p class="tiny" style="color:#ff9b9b">Network error: ${err.message}</p>`;
    }
  });
}

function renderResult(container, data) {
  const summoner = data.summoner || {};
  const champs = data.topChampions || [];
  const cards = champs.map(c => {
    const name = c.championName || `Champion ${c.championId}`;
    const lvl = c.championLevel ?? 0;
    const pts = (c.championPoints ?? 0).toLocaleString();
    return `
      <div class="panel" style="margin:10px 0;padding:10px;border-radius:10px;background:rgba(255,255,255,.03);">
        <b>${name}</b><br>
        <span class="tiny muted">Mastery Lv ${lvl} — ${pts} pts</span>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="panel" style="border:1px solid rgba(255,255,255,.08);padding:16px;border-radius:12px;">
      <h3>${summoner.name || "Unknown"}</h3>
      <p class="tiny muted">Level ${summoner.level || "?"} | ${champs.length} champions found</p>
      ${cards || "<p class='tiny muted'>No champion data available.</p>"}
    </div>`;
}