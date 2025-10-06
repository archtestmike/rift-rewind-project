// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1','euw1':'euw1','eun1':'eun1','kr':'kr',
  'br1':'br1','la1':'la1','la2':'la2','oc1':'oc1',
  'tr1':'tr1','ru':'ru','jp1':'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentLink = document.getElementById('recent-link');

  if (!form || !resultsEl) return;

  // Recent helper (prefill)
  recentLink.addEventListener('click', (e) => {
    e.preventDefault();
    form.riotId.value = 'Hide on bush#KR1';
    form.region.value = 'kr';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

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

      const text = await resp.text();
      if (!resp.ok) {
        resultsEl.innerHTML = `<div class="panel result-block"><p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p></div>`;
        return;
      }
      const data = JSON.parse(text);
      const t1 = performance.now();
      const ms = Math.round(t1 - t0);

      renderSummary(resultsEl, data, ms);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

function renderSummary(root, data, ms) {
  const { summoner, topChampions = [] } = data || {};
  const name = summoner?.name || 'Unknown';
  const level = summoner?.level ?? '—';

  const cards = topChampions.map(ch => {
    const champId = ch.championId ?? '—';
    const pts = ch.championPoints?.toLocaleString?.() ?? '—';
    const lvl = ch.championLevel ?? '—';
    const pct = Math.max(6, Math.min(100, Math.round((ch.championPoints % 100000) / 1000))); // fake-ish bar width

    return `
      <div class="card panel" style="margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div>
            <div style="font-weight:800; font-size:18px;">Champion ID ${champId}</div>
            <div class="muted" style="margin-top:6px;">
              <span class="pill lite">Mastery Lv ${lvl}</span>
              <span style="margin-left:14px; font-weight:700; color:#a9c8ff">${pts} pts</span>
            </div>
          </div>
        </div>
        <div style="margin-top:12px; height:10px; border-radius:999px; background:rgba(255,255,255,.06); overflow:hidden;">
          <div style="height:10px; width:${pct}%; background:linear-gradient(90deg,var(--brand1),var(--brand2));"></div>
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="card panel" style="border-radius:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Summoner: ${escapeHtml(name)}</h3>
        <span class="pill lite">Level ${escapeHtml(String(level))}</span>
      </div>

      <div class="pill lite" style="margin-top:12px;">Fetched in ${ms} ms via AWS Lambda (us-east-1)</div>

      ${cards || '<p class="tiny muted" style="margin-top:12px;">No mastery data.</p>'}
    </div>
  `;
}

// small pill variant
const style = document.createElement('style');
style.textContent = `.pill.lite{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 12px; border-radius:999px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  font-weight:700; color:#dfe7ff; font-size:14px;
}`;
document.head.appendChild(style);

// escape HTML
function escapeHtml(s) {
  return (s || '').replace(/[&<>"'`=\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'
  }[c]));
}