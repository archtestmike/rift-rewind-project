// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

// Tagline → platform auto-detect (uppercased keys)
const TAG_TO_PLATFORM = {
  'NA1': 'na1', 'EUW': 'euw1', 'EUN': 'eun1', 'KR1': 'kr',
  'BR1': 'br1', 'LA1': 'la1', 'LA2': 'la2', 'OC1': 'oc1',
  'TR1': 'tr1', 'RU': 'ru', 'JP1': 'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const regionSel = document.getElementById('region');
  const riotInput = document.getElementById('riotId');
  if (!form || !resultsEl) return;

  // If user types a tag that implies a shard, nudge the selector
  riotInput.addEventListener('blur', () => {
    const tag = getTagLine(riotInput.value);
    const auto = tag && TAG_TO_PLATFORM[tag.toUpperCase()];
    if (auto && regionSel.value !== auto) {
      regionSel.value = auto;
      showNote(resultsEl, `Detected region from tag <b>#${escapeHtml(tag)}</b> → set to <b>${auto.toUpperCase()}</b>.`);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (riotInput.value || '').trim();
    let platform = REGION_CODE[regionSel.value];

    // Expect Riot ID as GameName#TAG (send EXACTLY this to Lambda)
    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    // Auto-correct platform from tag if available
    const tag = getTagLine(riotId);
    const inferred = tag && TAG_TO_PLATFORM[tag.toUpperCase()];
    if (inferred && inferred !== platform) {
      platform = inferred;
      showNote(resultsEl, `Using region inferred from tag <b>#${escapeHtml(tag)}</b> → <b>${inferred.toUpperCase()}</b>.`);
    }

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
      resultsEl.innerHTML = renderResult(data);
      requestAnimationFrame(() => {
        document.querySelectorAll('.bar > i').forEach(el => {
          const w = el.getAttribute('data-w') || '0';
          el.style.width = w + '%';
        });
      });
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

function getTagLine(riotId){
  const idx = String(riotId).indexOf('#');
  return idx > -1 ? riotId.slice(idx+1).trim() : '';
}

function showNote(container, html){
  container.innerHTML = `<p class="note">${html}</p>`;
}

function renderResult(data){
  const name = (data?.summoner?.name ?? 'Unknown');
  const level = (data?.summoner?.level ?? '—');
  const champs = Array.isArray(data?.topChampions) ? data.topChampions.slice(0,3) : [];

  const maxPts = Math.max(1, ...champs.map(c => Number(c.championPoints||0)));

  const champRows = champs.map(c => {
    const id = c.championId ?? '—';
    const pts = Number(c.championPoints||0);
    const lvl = c.championLevel ?? '—';
    const pct = Math.max(6, Math.round((pts / maxPts) * 100));
    return `
      <div class="champ">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <strong>Champion ID ${id}</strong>
            <span class="badge">Mastery Lv ${lvl}</span>
          </div>
          <div class="bar" aria-label="mastery progress">
            <i data-w="${pct}"></i>
          </div>
        </div>
        <div class="meta">${formatNumber(pts)} pts</div>
      </div>
    `;
  }).join('') || `<p class="tiny muted">No champion mastery data found.</p>`;

  return `
    <div class="result-card">
      <div class="result-header">
        <div class="result-title">Summoner: <strong>${escapeHtml(name)}</strong></div>
        <span class="badge">Level ${escapeHtml(String(level))}</span>
      </div>
      <div class="champ-list">
        ${champRows}
      </div>
    </div>
  `;
}

// helpers
function formatNumber(n){ return (Number(n)||0).toLocaleString(); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}