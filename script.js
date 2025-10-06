// Riot API Lambda integration (unchanged)
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

const REGION_CODE = {
  'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr',
  'br1':'br1','la1':'la1','la2':'la2','oc1':'oc1',
  'tr1':'tr1','ru':'ru','jp1':'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentSlot = document.getElementById('recentSlot');

  // recent helper
  const lastKey = 'lastRiotId';
  const last = localStorage.getItem(lastKey);
  if (last) {
    recentSlot.innerHTML = `Recent: <a href="#" id="lastLink">${escapeHtml(last)}</a>`;
    recentSlot.querySelector('#lastLink').addEventListener('click', (e) => {
      e.preventDefault();
      form.riotId.value = last;
    });
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

    // save recent
    localStorage.setItem(lastKey, riotId);

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
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);

      // pretty render (fallback simple)
      const name = data?.summoner?.name || riotId;
      const level = data?.summoner?.level ?? '—';
      const champs = Array.isArray(data?.topChampions) ? data.topChampions : [];

      resultsEl.innerHTML = `
        <div class="card panel" style="background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015)); border:1px solid rgba(255,255,255,.08);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h3 style="margin:0">Summoner: ${escapeHtml(name)}</h3>
            <span class="tiny muted" style="border:1px solid rgba(255,255,255,.12);padding:6px 10px;border-radius:12px;">Level ${escapeHtml(String(level))}</span>
          </div>
          <p class="tiny muted" style="margin:0 0 12px;">Fetched in ${latency} ms via AWS Lambda (us-east-1)</p>

          ${champs.map(ch => {
            const pts = (ch.championPoints ?? 0).toLocaleString();
            const lvl = ch.championLevel ?? '—';
            const prog = Math.min(100, Math.round(((ch.championPointsSinceLastLevel ?? 0) / Math.max(1,(ch.championPointsUntilNextLevel ?? 1))) * 100));
            return `
              <div class="glass panel" style="margin:10px 0;">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <h3 style="margin:0">Champion ID ${escapeHtml(String(ch.championId))}</h3>
                  <span class="tiny muted" style="border:1px solid rgba(255,255,255,.12);padding:6px 10px;border-radius:12px;">Mastery Lv ${escapeHtml(String(lvl))}</span>
                </div>
                <div style="height:8px;border-radius:6px;background:rgba(255,255,255,.06);margin:10px 0;overflow:hidden">
                  <div style="height:100%;width:${prog}%;background:linear-gradient(90deg,var(--brand1),var(--brand2));"></div>
                </div>
                <div class="tiny muted" style="text-align:right">${pts} pts</div>
              </div>`;
          }).join('')}
        </div>
      `;
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}