// === Riot API Lambda integration (unchanged) ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1','euw1':'euw1','eun1':'eun1','kr':'kr',
  'br1':'br1','la1':'la1','la2':'la2','oc1':'oc1',
  'tr1':'tr1','ru':'ru','jp1':'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const riotIdInput = document.getElementById('riotId');
  const regionSelect = document.getElementById('region');
  const resultsEl = document.getElementById('riot-results');
  const recentLink = document.getElementById('recent-link');

  // restore last Riot ID if present
  const recent = localStorage.getItem('recentRiotId');
  if (recent) {
    recentLink.textContent = recent;
    recentLink.style.display = 'inline';
    recentLink.addEventListener('click', (e) => {
      e.preventDefault();
      riotIdInput.value = recent;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (riotIdInput.value || '').trim();
    const platform = REGION_CODE[regionSelect.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    const t0 = performance.now();
    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      const elapsed = Math.round(performance.now() - t0);

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();

      // keep a small convenience recent link
      localStorage.setItem('recentRiotId', riotId);
      recentLink.textContent = riotId;
      recentLink.style.display = 'inline';

      renderResults(data, elapsed);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

// simple, steady renderer (no external assets needed)
function renderResults(data, elapsedMs) {
  const resultsEl = document.getElementById('riot-results');
  const summ = data?.summoner || {};
  const champs = Array.isArray(data?.topChampions) ? data.topChampions : [];

  const rows = champs.map(c => {
    const pct = Math.max(6, Math.min(100, Math.round((c.championPoints % 300000) / 300000 * 100)));
    return `
      <div class="glass" style="padding:16px;margin-top:12px;border-radius:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="font-weight:800;">Champion ID <span style="opacity:.85">${c.championId}</span></div>
          <div class="pill" style="padding:8px 12px;">Mastery Lv ${c.championLevel}</div>
          <div style="color:#a7b7ff;font-weight:700;">${Number(c.championPoints||0).toLocaleString()} pts</div>
        </div>
        <div style="height:8px;border-radius:999px;background:rgba(255,255,255,.08);margin-top:10px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#00e0b8,#5b8aff);"></div>
        </div>
      </div>
    `;
  }).join('');

  resultsEl.innerHTML = `
    <div class="glass" style="border-radius:16px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0">Summoner: ${escapeHtml(summ.name || '—')}</h3>
        <div class="pill" style="padding:8px 12px;">Level ${summ.summonerLevel || '—'}</div>
      </div>

      <div class="pill" style="margin-top:12px;display:inline-flex;padding:8px 12px;">
        Fetched in ${elapsedMs} ms via AWS Lambda (us-east-1)
      </div>

      ${rows || '<p class="tiny muted" style="margin-top:12px">No mastery data.</p>'}
    </div>
  `;
}

// safe HTML for strings
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}