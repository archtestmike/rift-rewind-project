// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  na1:'na1', euw1:'euw1', eun1:'eun1', kr:'kr',
  br1:'br1', la1:'la1', la2:'la2', oc1:'oc1',
  tr1:'tr1', ru:'ru', jp1:'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  if (!form || !resultsEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    try {
      const t0 = performance.now();
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });
      const latency = Math.round(performance.now() - t0);

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      renderResult(data, latency);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });

  function renderResult(data, latency) {
    const { summoner, topChampions = [] } = data || {};
    const champs = topChampions.slice(0,3);
    const total = champs.reduce((a,c)=>a+(c.championPoints||0),0);
    const avgLvl = champs.length ? (champs.reduce((a,c)=>a+(c.championLevel||0),0)/champs.length).toFixed(1) : '—';

    const pill = (label)=>`<span class="tiny muted" style="padding:.4rem .7rem;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);margin-right:.5rem;display:inline-block">${label}</span>`;

    const rows = champs.map(c=>{
      const points = c.championPoints||0;
      const lvl = c.championLevel||0;
      const p = Math.min(100, Math.round((points/800000)*100));
      return `
      <div class="glass" style="padding:14px 16px;margin:10px 0;border-radius:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="tiny muted" style="padding:8px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)">Champion ID ${c.championId}</span>
          </div>
          ${pill('Mastery Lv '+lvl)} <span class="tiny muted">${points.toLocaleString()} pts</span>
        </div>
        <div style="height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden">
          <div style="height:100%;width:${p}%;background:linear-gradient(90deg,var(--brand1),var(--brand2));border-radius:999px"></div>
        </div>
      </div>`;
    }).join('');

    resultsEl.innerHTML = `
      <div class="glass" style="padding:18px;border-radius:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 style="margin:0">Summoner: ${escapeHtml(summoner?.name||'')}</h3>
          ${pill('Level '+(summoner?.level??'—'))}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${pill('Total Points: '+total.toLocaleString())}
          ${pill('Avg Mastery Lv: '+avgLvl)}
          ${pill('Fetched in '+latency+' ms via AWS Lambda (us-east-1)')}
        </div>
        ${rows || '<p class="tiny muted">No mastery data.</p>'}
      </div>
    `;
  }
});

// Simple HTML escape for <pre> or inline output
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}