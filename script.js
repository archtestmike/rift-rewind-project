// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  na1: 'na1', euw1: 'euw1', eun1: 'eun1', kr: 'kr',
  br1: 'br1', la1: 'la1', la2: 'la2', oc1: 'oc1',
  tr1: 'tr1', ru: 'ru', jp1: 'jp1'
};

const DD_VERSION = '14.18.1'; // Data Dragon version used for champion metadata/icons
const DD_BASE = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`;
const CHAMP_ICON = (id) => `${DD_BASE}/img/champion/${id}.png`;

let champMeta = null; // loaded once

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentLink = document.getElementById('recent-link');
  if (!form || !resultsEl) return;

  // show last Riot ID if present
  const last = localStorage.getItem('lastRiotId');
  if (last) {
    recentLink.textContent = last;
    recentLink.style.display = 'inline';
    recentLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('riotId').value = last;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    // Save recent
    localStorage.setItem('lastRiotId', riotId);
    recentLink.textContent = riotId;
    recentLink.style.display = 'inline';

    const t0 = performance.now();
    try {
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

      // lazy-load champion metadata to map IDs -> names/icons/roles
      if (!champMeta) { champMeta = await loadChampionMeta(); }

      resultsEl.innerHTML = renderSummonerCard(data, latency);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

// Map Riot champion ID -> nice name used by DDragon
async function loadChampionMeta(){
  const res = await fetch(`${DD_BASE}/data/en_US/champion.json`);
  const json = await res.json();
  const byKey = {};
  Object.values(json.data).forEach(ch => { byKey[ch.key] = ch; });
  return byKey;
}

function renderSummonerCard(data, latencyMs){
  const s = data.summoner;
  const champs = data.topChampions || [];
  const header =
    `<div class="glass panel" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3>Summoner: ${escapeHtml(s.name)}</h3>
        <span class="tiny muted" style="padding:6px 10px;border:1px solid rgba(255,255,255,.14);border-radius:999px;">Level ${s.level}</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <span class="tiny muted" style="padding:8px 10px;border:1px solid rgba(255,255,255,.10);border-radius:999px;">Fetched in ${latencyMs} ms via AWS Lambda (us-east-1)</span>
      </div>
    </div>`;

  const items = champs.map(entry => {
    const meta = champMeta?.[String(entry.championId)] || null;
    const name = meta?.name || `Champion ID ${entry.championId}`;
    const icon = meta ? CHAMP_ICON(meta.image.full.replace('.png','')) : null;
    const tags = meta?.tags || [];

    return `
      <div class="glass panel" style="margin-top:14px">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            ${icon ? `<img src="${icon}" alt="${escapeHtml(name)} icon" width="36" height="36" style="border-radius:10px">` : ''}
            <h3 style="margin:0">${escapeHtml(name)}</h3>
          </div>
          <span class="tiny muted" style="padding:8px 12px;border:1px solid rgba(255,255,255,.14);border-radius:999px;">Mastery Lv ${entry.championLevel}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
          ${tags.map(t => `<span class="tiny muted" style="padding:6px 10px;border:1px solid rgba(255,255,255,.10);border-radius:999px;">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1;height:8px;border-radius:8px;background:rgba(255,255,255,.08);overflow:hidden">
            <div style="height:8px;width:${Math.min(100, Math.round(entry.championPoints/700000*100))}%;background:linear-gradient(90deg, var(--brand1), var(--brand2));"></div>
          </div>
          <div class="tiny muted" style="min-width:120px;text-align:right">${entry.championPoints.toLocaleString()} pts</div>
        </div>
      </div>`;
  }).join('');

  return header + items;
}

// HTML escape
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}