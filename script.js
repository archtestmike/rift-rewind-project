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

// Champion metadata cache (in-memory)
let CHAMP_META = { version: '', byKey: {} };

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const regionSel = document.getElementById('region');
  const riotInput = document.getElementById('riotId');
  if (!form || !resultsEl) return;

  // Preload champion meta in the background (non-blocking)
  loadChampionMeta().catch(()=>{});

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

      // Ensure champ metadata is ready before rendering
      try { await loadChampionMeta(); } catch {}

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

/* ---------- Champion metadata (Data Dragon) ---------- */
// Loads and caches champion metadata (version + byKey map) for 24h
async function loadChampionMeta(){
  if (CHAMP_META.version && Object.keys(CHAMP_META.byKey).length) return CHAMP_META;

  // localStorage cache
  try {
    const cached = JSON.parse(localStorage.getItem('champMeta') || 'null');
    if (cached && cached.expires && Date.now() < cached.expires) {
      CHAMP_META = { version: cached.version, byKey: cached.byKey || {} };
      return CHAMP_META;
    }
  } catch {}

  // 1) latest version
  let version = '14.20.1'; // fallback
  try {
    const vr = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { cache: 'no-store' });
    const arr = await vr.json();
    if (Array.isArray(arr) && arr[0]) version = arr[0];
  } catch {}

  // 2) champion.json for that version
  let byKey = {};
  try {
    const cr = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`, { cache: 'force-cache' });
    const data = await cr.json();
    // Map numeric "key" (string) → { id, name, title, tags[] }
    Object.values(data.data).forEach(ch => {
      byKey[ch.key] = { id: ch.id, name: ch.name, title: ch.title, tags: ch.tags || [] };
    });
  } catch {}

  CHAMP_META = { version, byKey };
  try {
    localStorage.setItem('champMeta', JSON.stringify({
      version, byKey, expires: Date.now() + 24*60*60*1000
    }));
  } catch {}
  return CHAMP_META;
}

/* ---------- Rendering ---------- */
function renderResult(data){
  const name = (data?.summoner?.name ?? 'Unknown');
  const level = (data?.summoner?.level ?? '—');
  const champs = Array.isArray(data?.topChampions) ? data.topChampions.slice(0,3) : [];

  const maxPts = Math.max(1, ...champs.map(c => Number(c.championPoints||0)));

  const champRows = champs.map(c => {
    const key = String(c.championId ?? '');
    const meta = CHAMP_META.byKey[key];
    const displayName = meta?.name || `Champion ID ${key}`;
    const iconUrl = meta
      ? `https://ddragon.leagueoflegends.com/cdn/${CHAMP_META.version}/img/champion/${meta.id}.png`
      : '';
    const title = meta?.title ? smartTitle(meta.title) : '';
    const tags = Array.isArray(meta?.tags) ? meta.tags : [];

    const pts = Number(c.championPoints||0);
    const lvl = c.championLevel ?? '—';
    const pct = Math.max(6, Math.round((pts / maxPts) * 100));

    const tagChips = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

    return `
      <div class="champ">
        <div>
          <div class="champ-title" style="justify-content:space-between;">
            <div class="champ-title tooltip" aria-label="${escapeHtml(displayName)} ${title ? `– ${escapeHtml(title)}` : ''}">
              <span class="champ-icon">${iconUrl ? `<img src="${iconUrl}" alt="${escapeHtml(displayName)} icon" loading="lazy">` : ''}</span>
              <strong>${escapeHtml(displayName)}</strong>
              ${title ? `<span class="tip">${escapeHtml(displayName)} — ${escapeHtml(title)}</span>` : ''}
            </div>
            <span class="badge">Mastery Lv ${lvl}</span>
          </div>
          <div class="role-tags">${tagChips}</div>
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

/* ---------- helpers ---------- */
function smartTitle(t){ 
  // Capitalize first letter if Data Dragon gives lowercased titles
  return String(t || '').slice(0,1).toUpperCase() + String(t || '').slice(1);
}
function getTagLine(riotId){
  const idx = String(riotId).indexOf('#');
  return idx > -1 ? riotId.slice(idx+1).trim() : '';
}
function showNote(container, html){ container.innerHTML = `<p class="note">${html}</p>`; }
function formatNumber(n){ return (Number(n)||0).toLocaleString(); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}