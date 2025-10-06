// ========= Riot API Lookup =========
const lookupBtn = document.getElementById('lookupBtn');
const regionSel = document.getElementById('region');
const summonerInput = document.getElementById('summoner');
const resultBox = document.getElementById('result');
const recent = document.getElementById('recent');

const LAMBDA_URL = "https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/";

lookupBtn?.addEventListener("click", async () => {
  const summonerName = summonerInput.value.trim();
  const region = regionSel.value;
  if (!summonerName) {
    resultBox.innerHTML = `<p class="muted">Please enter a Riot ID in GameName#TAG format.</p>`;
    return;
  }

  recent.innerHTML = `Recent: <a href="#">${summonerName}</a>`;
  resultBox.innerHTML = `<p class="muted">Fetching data...</p>`;

  const start = performance.now();
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summonerName, region }),
    });
    const latency = Math.round(performance.now() - start);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Error fetching summoner data");

    const champs = data.topChampions.map(c => `
      <div class="champ-card">
        <p><strong>Champion ID ${c.championId}</strong></p>
        <p>Mastery Lv ${c.championLevel}</p>
        <p>${c.championPoints.toLocaleString()} pts</p>
      </div>
    `).join("");

    resultBox.innerHTML = `
      <p><strong>Summoner:</strong> ${data.summoner.name}</p>
      <p>Level ${data.summoner.level}</p>
      <p>Fetched in ${latency} ms via AWS Lambda (${region})</p>
      ${champs}
    `;
  } catch (err) {
    resultBox.innerHTML = `<p class="muted">Lambda error: ${err.message}</p>`;
  }
});

// ===== Serverless Insights (2nd Lambda) =====
// Update if your 2nd function URL is different:
const INSIGHTS_LAMBDA_URL = 'https://tfapgtyrz75ve4lrye32a3zzfe0zgaft.lambda-url.us-east-1.on.aws/';

(function initInsights(){
  const root = document.getElementById('serverless-insights');
  if (!root) return; // badge not on page

  const invEl = document.getElementById('ins-inv');
  const durEl = document.getElementById('ins-dur');
  const foot = document.getElementById('ins-foot');

  const fmt = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number(n).toLocaleString();
  };

  const set = (inv, durMs, extraNote) => {
    invEl.textContent = fmt(inv);
    durEl.textContent = durMs === '—' ? '—' : `${fmt(Math.round(durMs))} ms`;
    foot.textContent = extraNote || 'Powered by AWS Lambda • CloudWatch Metrics';
  };

  const load = async () => {
    try {
      // GET keeps it simple (no CORS preflight). Ensure your Function URL CORS allows GET + your domain.
      const res = await fetch(INSIGHTS_LAMBDA_URL, { method: 'GET' });
      if (!res.ok) {
        set('—', '—', `Error ${res.status}: ${await res.text().catch(()=> 'Request failed')}`);
        return;
      }
      const data = await res.json();

      // Be resilient to different response shapes:
      const m = data.metrics || data;

      const inv = m.invocationsLast60m ?? m.invocations ?? m.count ?? 0;
      const dur =
        m.avgDurationMs ??
        m.averageDurationMs ??
        m.durationMs ??
        (Array.isArray(m.datapoints) ? averageDurationFrom(m.datapoints) : 0);

      set(inv, dur, (m.region && m.functionName)
        ? `${m.functionName} • ${m.region}`
        : 'AWS Lambda • CloudWatch Metrics');
    } catch (e) {
      set('—', '—', `Network error: ${e.message}`);
    }
  };

  const averageDurationFrom = (points) => {
    const durations = points
      .map(p => Number(p.Average ?? p.avg ?? p.value ?? p.Duration ?? NaN))
      .filter(n => Number.isFinite(n));
    if (!durations.length) return 0;
    return durations.reduce((a,b)=>a+b,0) / durations.length;
  };

  // load on mount and refresh every 60s (cheap/free-tier friendly)
  load();
  const t = setInterval(load, 60_000);
  // optional cleanup if you ever remove the node dynamically:
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      clearInterval(t);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList:true, subtree:true });
})();