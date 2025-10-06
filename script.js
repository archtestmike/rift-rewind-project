// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const riotInput = document.getElementById('riotId');
  const recentLink = document.getElementById('recent-link');

  // Load last used Riot ID
  const RECENT_KEY = 'recentRiotId';
  const recent = localStorage.getItem(RECENT_KEY) || '';
  if (recent) {
    recentLink.textContent = recent;
    recentLink.onclick = (e) => {
      e.preventDefault();
      riotInput.value = recent;
      riotInput.focus();
    };
  } else {
    recentLink.textContent = '';
  }

  if (!form || !resultsEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (riotInput.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    // Save recent
    localStorage.setItem(RECENT_KEY, riotId);
    if (recentLink) recentLink.textContent = riotId;

    const t0 = performance.now();
    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      const ms = Math.max(1, Math.round(performance.now() - t0));

      resultsEl.innerHTML = renderSummary(data, ms);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

// Render summary
function renderSummary(data, ms){
  const { summoner = {}, topChampions = [] } = data || {};
  const chip = (txt) => `<span style="display:inline-block;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);margin-right:6px;">${escapeHtml(txt)}</span>`;

  const champs = topChampions.map(c => {
    const lvl = c.championLevel ?? 0;
    const pts = c.championPoints ?? 0;
    const id  = c.championId ?? '?';
    const w = Math.min(100, Math.round((lvl/60)*100));
    return `
      <div style="padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03);margin:12px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="font-weight:700">Champion ID ${id}</div>
          ${chip('Mastery Lv ' + lvl)}
          <div class="muted" style="min-width:120px;text-align:right">${pts.toLocaleString()} pts</div>
        </div>
        <div style="height:8px;border-radius:999px;background:rgba(255,255,255,.06);margin-top:10px;overflow:hidden;">
          <div style="height:100%;width:${w}%;background:linear-gradient(90deg,var(--brand1),var(--brand2));"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:14px;background:rgba(255,255,255,.02);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div style="font-weight:800">Summoner: ${escapeHtml(summoner.name || '—')}</div>
        ${chip('Level ' + (summoner.level ?? '—'))}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        ${chip('Fetched in ' + ms + ' ms via AWS Lambda (us-east-1)')}
      </div>
      ${champs || '<p class="tiny muted">No mastery data returned.</p>'}
    </div>
  `;
}

// HTML escape
function escapeHtml(s=''){
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}