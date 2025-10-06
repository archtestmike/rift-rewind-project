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
  const recentLink = document.getElementById('recentLink');

  // restore recent
  const recent = localStorage.getItem('recentRiotId');
  if (recent) {
    recentLink.textContent = recent;
    recentLink.style.display = 'inline';
    recentLink.onclick = () => {
      document.getElementById('riotId').value = recent;
    };
  }

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

    // remember
    localStorage.setItem('recentRiotId', riotId);
    recentLink.textContent = riotId;
    recentLink.style.display = 'inline';

    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Lambda expects the full Riot ID in "summonerName"
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      renderResult(resultsEl, data);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

function renderResult(container, data){
  // very simple visual render to keep your previous look
  const { summoner, topChampions = [] } = data || {};
  const champRows = topChampions.map((c) => {
    const points = (c.championPoints || 0).toLocaleString();
    const lvl = c.championLevel || 0;
    const id = c.championId || '—';
    const pct = Math.max(6, Math.min(100, Math.round((c.championPoints || 0) / 700000 * 100)));
    return `
      <div class="glass panel" style="margin:12px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div style="font-weight:800;font-size:18px">Champion ID ${id}</div>
          <div class="pill" style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);">Mastery Lv ${lvl}</div>
          <div style="color:#bcd0ff;font-weight:700">${points} pts</div>
        </div>
        <div style="height:10px;border-radius:999px;background:rgba(255,255,255,.08);margin-top:12px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--brand1),var(--brand2));"></div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="card panel" style="border-radius:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <h3 style="margin:0">Summoner: ${escapeHtml(summoner?.name || '—')}</h3>
        <span class="pill" style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);">Level ${summoner?.level ?? '—'}</span>
      </div>
      ${champRows || '<p class="tiny muted">No mastery data found.</p>'}
    </div>`;
}

// Simple HTML escape
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}