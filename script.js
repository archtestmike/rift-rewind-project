// === Config ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

const REGION_CODE = { 'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr','br1':'br1','la1':'la1','la2':'la2','oc1':'oc1','tr1':'tr1','ru':'ru','jp1':'jp1' };
const TAG_TO_PLATFORM = { 'NA1':'na1','EUW':'euw1','EUN':'eun1','KR1':'kr','BR1':'br1','LA1':'la1','LA2':'la2','OC1':'oc1','TR1':'tr1','RU':'ru','JP1':'jp1' };

// Champion meta cache
let CHAMP_META = { version: '', byKey: {} };

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const regionSel = document.getElementById('region');
  const riotInput = document.getElementById('riotId');
  const recentEl = document.getElementById('recent-lookups');
  if (!form || !resultsEl) return;

  // preload champ meta
  loadChampionMeta().catch(()=>{});
  renderRecent(recentEl);

  riotInput.addEventListener('blur', () => {
    const tag = getTagLine(riotInput.value);
    const auto = tag && TAG_TO_PLATFORM[tag.toUpperCase()];
    if (auto && regionSel.value !== auto) {
      regionSel.value = auto;
      showNote(resultsEl, `Detected region from tag <b>#${escapeHtml(tag)}</b> → set to <b>${auto.toUpperCase()}</b>.`);
    }
  });

  recentEl.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-riotid]');
    if (!a) return; e.preventDefault();
    riotInput.value = a.getAttribute('data-riotid'); riotInput.focus();
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

    const tag = getTagLine(riotId);
    const inferred = tag && TAG_TO_PLATFORM[tag.toUpperCase()];
    if (inferred && inferred !== platform) {
      platform = inferred; regionSel.value = inferred;
      showNote(resultsEl, `Using region inferred from tag <b>#${escapeHtml(tag)}</b> → <b>${inferred.toUpperCase()}</b>.`);
    }

    try {
      const t0 = performance.now();
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

      try { await loadChampionMeta(); } catch {}
      resultsEl.innerHTML = renderResult(data, Math.round(t1 - t0));
      requestAnimationFrame(() => {
        document.querySelectorAll('.bar > i').forEach(el => {
          const w = el.getAttribute('data-w') || '0';
          el.style.width = w + '%';
        });
      });

      saveRecent(riotId); renderRecent(recentEl);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

/* -------- Champion meta (Data Dragon) -------- */
async function loadChampionMeta(){
  if (CHAMP_META.version && Object.keys(CHAMP_META.byKey).length) return CHAMP_META;
  try {
    const cached = JSON.parse(localStorage.getItem('champMeta') || 'null');
    if (cached && cached.expires && Date.now() < cached.expires) {
      CHAMP_META = { version: cached.version, byKey: cached.byKey || {} };
      return CHAMP_META;
    }
  } catch {}

  let version = '14.20.1';
  try {
    const vr = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { cache: 'no-store' });
    const arr = await vr.json(); if (Array.isArray(arr) && arr[0]) version = arr[0];
  } catch {}

  let byKey = {};
  try {
    const cr = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`, { cache: 'force-cache' });
    const data = await cr.json();
    Object.values(data.data).forEach(ch => { byKey[ch.key] = { id: ch.id, name: ch.name, title: ch.title, tags: ch.tags || [] }; });
  } catch {}

  CHAMP_META = { version, byKey };
  try { localStorage.setItem('champMeta', JSON.stringify({ version, byKey, expires: Date.now() + 24*60*60*1000 })); } catch {}
  return CHAMP_META;
}

/* -------- Rendering -------- */
function renderResult(data, ms=0){
  const name = (data?.summoner?.name ?? 'Unknown');
  const level = (data?.summoner?.level ?? '—');
  const champs = Array.isArray(data?.topChampions) ? data.topChampions.slice(0,3) : [];
  const totalPts = champs.reduce((a,c)=>a + (Number(c.championPoints)||0), 0);
  const avgLvl = champs.length ? (champs.reduce((a,c)=>a + (Number(c.championLevel)||0), 0) / champs.length).toFixed(1) : '—';
  const maxPts = Math.max(1, ...champs.map(c => Number(c.championPoints||0)));

  const champRows = champs.map(c => {
    const key = String(c.championId ?? '');
    const meta = CHAMP_META.byKey[key];
    const displayName = meta?.name || `Champion ID ${key}`;
    const iconUrl = meta ? `https://ddragon.leagueoflegends.com/cdn/${CHAMP_META.version}/img/champion/${meta.id}.png` : '';
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
          <div class="bar"><i data-w="${pct}"></i></div>
        </div>
        <div class="meta">${formatNumber(pts)} pts</div>
      </div>
    `;
  }).join('') || `<p class="tiny muted">No champion mastery data found.</p>`;

  const awsRegion = getAwsRegionFromUrl(RIOT_LAMBDA_URL) || 'AWS';
  const edge = detectEdgeCDN();
  const latencyChip = ms ? `<span class="chip tooltip">Fetched in ${ms} ms via AWS Lambda (${awsRegion})<span class="tip">Path: Browser → ${edge} → Lambda (${awsRegion}) → Riot API → back.</span></span>` : '';
  const edgeChip = edge ? `<span class="chip">Edge: ${edge}</span>` : '';

  return `
    <div class="result-card">
      <div class="result-header">
        <div class="result-title">Summoner: <strong>${escapeHtml(name)}</strong></div>
        <span class="badge">Level ${escapeHtml(String(level))}</span>
      </div>
      <div class="summary">
        <span class="chip">Total Points: ${formatNumber(totalPts)}</span>
        <span class="chip">Avg Mastery Lv: ${escapeHtml(String(avgLvl))}</span>
        ${latencyChip}${edgeChip}
      </div>
      <div class="champ-list">${champRows}</div>
    </div>
  `;
}

/* -------- Recent lookups -------- */
function getRecent(){ try { return JSON.parse(localStorage.getItem('recentRiotIds')||'[]'); } catch { return []; } }
function saveRecent(riotId){ const arr = getRecent(); arr.unshift(riotId); const unique = [...new Set(arr)].slice(0,3); try { localStorage.setItem('recentRiotIds', JSON.stringify(unique)); } catch {} }
function renderRecent(container){ if (!container) return; const items = getRecent(); container.innerHTML = items.length ? `Recent: ${items.map(r => `<a href="#" data-riotid="${escapeHtml(r)}">${escapeHtml(r)}</a>`).join(' • ')}` : ''; }

/* -------- Insights (CloudWatch) -------- */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggle-insights');
  const panel = document.getElementById('insights');
  const body = document.getElementById('insights-body');
  if (!btn || !panel || !body) return;

  let open = false;
  btn.addEventListener('click', async () => {
    open = !open;
    btn.textContent = open ? 'Hide Serverless Insights' : 'Show Serverless Insights';
    panel.style.display = open ? 'block' : 'none';
    if (!open) return;

    body.innerHTML = '<p class="tiny muted">Querying CloudWatch…</p>';
    try {
      const r = await fetch(`${RIOT_LAMBDA_URL}?op=metrics`, { method: 'GET' });
      if (!r.ok) {
        const t = await r.text();
        body.innerHTML = `<p class="tiny" style="color:#ff9b9b">Metrics error (${r.status}): ${escapeHtml(t)}</p>`;
        return;
      }
      const data = await r.json();
      body.innerHTML = renderInsights(data);
    } catch(e){
      body.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(e.message)}</p>`;
    }
  });
});

function renderInsights(m){
  const inv24 = (m?.window24h?.invocations ?? 0);
  const err24 = (m?.window24h?.errors ?? 0);
  const thr24 = (m?.window24h?.throttles ?? 0);
  const dur24 = (m?.window24h?.avgDurationMs ?? 0);
  const inv7d = (m?.window7d?.invocations ?? 0);
  const daily = Array.isArray(m?.window7d?.daily) ? m.window7d.daily : [];
  const spark = sparkline(daily.map(d => d.v));

  return `
    <div class="insights-grid">
      <div class="stat"><h4>Invocations (24h)</h4><div class="big">${formatNumber(inv24)}</div><div class="spark">${spark}</div></div>
      <div class="stat"><h4>Average Duration (24h)</h4><div class="big">${dur24.toLocaleString()} ms</div><p class="tiny muted">Lower is better — cold starts amortized by CloudFront.</p></div>
      <div class="stat"><h4>Errors (24h)</h4><div class="big">${formatNumber(err24)}</div></div>
      <div class="stat"><h4>Throttles (24h)</h4><div class="big">${formatNumber(thr24)}</div></div>
      <div class="stat"><h4>Invocations (7d)</h4><div class="big">${formatNumber(inv7d)}</div><div class="spark">${spark}</div></div>
    </div>
    <div class="powered">Powered by AWS CloudWatch &amp; Lambda</div>
  `;
}

/* -------- Helpers -------- */
function sparkline(values){
  if (!values || !values.length) return '<svg></svg>';
  const w = 220, h = 26, pad = 2;
  const max = Math.max(...values, 1);
  const step = (w - pad*2) / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = pad + i*step;
    const y = pad + (h - pad*2) * (1 - (v / max));
    return `${x},${y}`;
  }).join(' ');
  return `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="url(#g)" stroke-width="2"/>
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#00e0b8"/><stop offset="1" stop-color="#5b8aff"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}
function smartTitle(t){ return String(t||'').slice(0,1).toUpperCase()+String(t||'').slice(1); }
function getTagLine(riotId){ const i = String(riotId).indexOf('#'); return i>-1 ? riotId.slice(i+1).trim() : ''; }
function showNote(container, html){ container.innerHTML = `<p class="note">${html}</p>`; }
function formatNumber(n){ return (Number(n)||0).toLocaleString(); }
function escapeHtml(s){ return String(s).replace(/[&<>"'`=\/]/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'}[c])); }
function getAwsRegionFromUrl(url){ const m = String(url).match(/lambda-url\.([a-z0-9-]+)\.on\.aws/i); return m ? m[1] : ''; }
function detectEdgeCDN(){ const h = (location.hostname||'').toLowerCase(); if (/cloudfront|amplifyapp\.com/.test(h)) return 'CloudFront'; return 'CloudFront'; }