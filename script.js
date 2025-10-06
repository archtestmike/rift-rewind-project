// === Lambda URLs ===
// Riot API proxy (your working function)
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
// Metrics function (returns last-60m stats for your Riot function)
const METRICS_URL = 'https://tfapgtyrz75ve4lrye32a3zzfe0zgaft.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Riot Lambda expects
const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  wireRiotForm();
  bootInsights();
});

/* --------------------------- Riot Lookup --------------------------- */
function wireRiotForm(){
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentLink = document.getElementById('recent-id');
  if (!form || !resultsEl) return;

  // Restore recent
  const last = localStorage.getItem('recentRiotId');
  if (last){
    recentLink.textContent = last;
    recentLink.style.display = 'inline';
    recentLink.addEventListener('click', (e) => {
      e.preventDefault();
      form.riotId.value = last;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    // Save recent
    localStorage.setItem('recentRiotId', riotId);
    recentLink.textContent = riotId;
    recentLink.style.display = 'inline';

    try {
      const t0 = performance.now();
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });
      const t1 = performance.now();

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      renderSummoner(resultsEl, data, Math.round(t1 - t0), form.region.value);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
}

function renderSummoner(root, data, ms, platform){
  const lvl = data?.summoner?.level ?? '—';
  const name = data?.summoner?.name ?? '—';
  const champs = Array.isArray(data?.topChampions) ? data.topChampions : [];

  const items = champs.map((c, idx) => {
    const pts = Number(c.championPoints || 0).toLocaleString();
    const lv = c.championLevel ?? '—';
    const id = c.championId ?? '—';
    const pct = Math.max(4, Math.min(100, Math.round((c.championPoints % 250000) / 250000 * 100)));
    // If you already added champion icon/name mapping elsewhere, this will gracefully show IDs.
    return `
      <div class="champ-card">
        <div class="champ-row">
          <div class="champ-title">Champion ID ${id}</div>
          <div class="pill">Mastery Lv ${lv}</div>
          <div class="big-num">${pts} pts</div>
        </div>
        <div class="bar">
          <span class="fill" style="width:${pct}%"></span>
          <span class="track"></span>
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="summary-head">
      <div class="left">
        <div class="sum-title">Summoner: ${escapeHtml(name)}</div>
      </div>
      <div class="right"><span class="pill ghost">Level ${lvl}</span></div>
    </div>

    <div class="meta">
      <span class="chip">Fetched in ${ms} ms via AWS Lambda (${escapeHtml(platform)})</span>
    </div>

    <div class="champs">
      ${items || '<p class="tiny muted">No champion mastery data.</p>'}
    </div>
  `;
}

/* ------------------------ Serverless Insights ---------------------- */
function bootInsights(){
  const inv = byId('m-inv'), err = byId('m-err'), thr = byId('m-thr'),
        avg = byId('m-avg'), ts = byId('m-ts');

  const load = async () => {
    try{
      const r = await fetch(METRICS_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const m = j?.metrics || {};

      inv.textContent = (m.invocations ?? 0).toLocaleString();
      err.textContent = (m.errors ?? 0).toLocaleString();
      thr.textContent = (m.throttles ?? 0).toLocaleString();

      const d = Number(m.avgDurationMs ?? 0);
      avg.textContent = d >= 1000 ? `${(d/1000).toFixed(2)} s` : `${d.toFixed(0)} ms`;

      ts.textContent = new Date(j?.timestamp || Date.now()).toLocaleString();
    }catch(e){
      ts.textContent = `Metrics fetch failed: ${e.message}`;
    }
  };

  load();
  setInterval(load, 60_000);
}

/* utils */
function byId(id){ return document.getElementById(id); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}