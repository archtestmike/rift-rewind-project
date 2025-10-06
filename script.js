// === Riot API Lambda integration (unchanged) ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

const CHAMPION_MAP = {
  7: 'LeBlanc', 268: 'Azir', 517: 'Sylas', 1: 'Annie', 103: 'Ahri',
  64: 'Lee Sin', 11: 'Master Yi', 81: 'Ezreal', 157: 'Yasuo', 84: 'Akali', 222: 'Jinx',
};

const DDRAGON_FILE = {
  'LeBlanc': 'Leblanc', "Cho'Gath": 'Chogath', "Kai'Sa": 'Kaisa', "Kha'Zix": 'Khazix',
  "Vel'Koz": 'Velkoz', "Kog'Maw": 'KogMaw', "Rek'Sai": 'RekSai', "Bel'Veth": 'Belveth',
  'Nunu & Willump': 'Nunu', 'Jarvan IV': 'JarvanIV', 'Wukong': 'MonkeyKing',
  'Renata Glasc': 'Renata', 'Dr. Mundo': 'DrMundo', 'Tahm Kench': 'TahmKench',
};

function ddragonFileFromName(name) {
  if (!name) return '';
  if (DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean = name
    .replace(/['’.&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return `${clean}.png`;
}

document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initEdgeDiagnostics(); // NEW
});

// === Riot Lookup UI ===
function initRiotLookup(){
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentEl = document.getElementById('recentId');
  if (!form || !resultsEl) return;

  const recent = localStorage.getItem('recentRiotId');
  if (recent && recentEl) {
    recentEl.textContent = recent;
    recentEl.style.display = 'inline';
    recentEl.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('riotId').value = recent;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    localStorage.setItem('recentRiotId', riotId);
    if (recentEl) { recentEl.textContent = riotId; recentEl.style.display = 'inline'; }

    try {
      const t0 = performance.now();
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });
      const t1 = performance.now();

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML =
          `<div class="panel" style="background:rgba(40,0,0,.25);border:1px solid rgba(255,120,120,.25);border-radius:12px;padding:12px;">
            <span style="color:#ff9b9b">Lambda error (${resp.status}):</span>
            <pre style="white-space:pre-wrap;margin:6px 0 0">${escapeHtml(text || 'Request failed')}</pre>
          </div>`;
        return;
      }

      const data = await resp.json();
      renderResult(resultsEl, data, Math.round(t1 - t0), platform);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
}

function renderResult(root, data, ms, region) {
  const lvl = data?.summoner?.level ?? '?';
  const name = data?.summoner?.name ?? 'Unknown';
  const champs = Array.isArray(data?.topChampions) ? data.topChampions : [];

  const rows = champs.map(ch => {
    const pts = (ch.championPoints ?? 0).toLocaleString();
    const masteryLvl = ch.championLevel ?? 0;
    const progress = Math.max(6, Math.min(100, Math.round((ch.championPoints ?? 0) / 700000 * 100)));

    const champName = ch.championName || CHAMPION_MAP[ch.championId] || `Champion ${ch.championId}`;
    const file = ddragonFileFromName(champName);
    const champImg = `https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${file}`;

    return `
      <div class="panel" style="margin:12px 0; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px; min-width:220px;">
            <img src="${champImg}" alt="${champName}"
                 style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex:0 0 42px">
            <div style="font-weight:800; font-size:18px; white-space:nowrap;">${escapeHtml(champName)}</div>
          </div>
          <div class="pill small" style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px;">
            Mastery Lv ${masteryLvl}
          </div>
          <div style="color:#aecdff; font-weight:800; margin-left:auto;">${pts} pts</div>
        </div>
        <div style="height:10px; border-radius:999px; background:rgba(255,255,255,.08); margin-top:10px; overflow:hidden;">
          <div style="height:100%; width:${progress}%; background:linear-gradient(90deg, var(--brand1), var(--brand2));"></div>
        </div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="panel" style="background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
        <h3 style="margin:0">Summoner: ${escapeHtml(name)}</h3>
        <div class="pill small" style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px;">Level ${lvl}</div>
      </div>

      <div class="pill small" style="display:inline-flex; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px; margin:6px 0 14px;">
        Fetched in ${ms} ms via AWS Lambda (${escapeHtml(region)})
      </div>

      ${rows || '<p class="tiny muted">No mastery data</p>'}
    </div>`;
}

function escapeHtml(s='') {
  return s.replace(/[&<>"'`=\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'
  }[c]));
}

/* ────────────────────────────────────────────────────────────────────────────
   CloudFront Edge Diagnostics (POP, country, protocol, X-Cache, TTFB)
   ──────────────────────────────────────────────────────────────────────────── */
function initEdgeDiagnostics(){
  const panel = document.getElementById('edge-panel');
  if (!panel) return;

  const kPop = document.getElementById('k-pop');
  const kCountry = document.getElementById('k-country');
  const kProto = document.getElementById('k-proto');
  const kXcache = document.getElementById('k-xcache');
  const bar1 = document.getElementById('bar1');
  const bar2 = document.getElementById('bar2');
  const ttfb1El = document.getElementById('ttfb1');
  const ttfb2El = document.getElementById('ttfb2');
  const btn = document.getElementById('edge-refresh');

  // Use a cacheable, same-origin asset. styles.css is ideal.
  async function run(){
    resetUI();

    const cacheId = Math.random().toString(36).slice(2);
    const target = `styles.css?cf_demo=${cacheId}`; // same query twice → Miss then Hit (often)

    const r1 = await measureTTFB(target);
    // slight delay so CF writes to cache
    await sleep(250);
    const r2 = await measureTTFB(target);

    // Headers (prefer second)
    const popHeader = r2.headers.get('x-amz-cf-pop') || r1.headers.get('x-amz-cf-pop') || '';
    const popCode = (popHeader.match(/^[A-Z]{3}/)?.[0]) || (popHeader.slice(0,3)) || '—';
    kPop.textContent = popHeader ? `${popCode}` : '—';

    const country = r2.headers.get('x-viewer-country') || r1.headers.get('x-viewer-country') || '—';
    kCountry.textContent = country || '—';

    const proto = (r2.protocol || r1.protocol || '').toUpperCase();
    kProto.textContent = proto ? proto.replace('HTTP/2.0','H2').replace('H2','HTTP/2').replace('H3','HTTP/3') : '—';

    const xcache = r2.headers.get('x-cache') || r1.headers.get('x-cache') || '—';
    kXcache.textContent = xcache;

    // Bars
    const a = r1.ttfbMs, b = r2.ttfbMs;
    const max = Math.max(a, b, 1);
    bar1.style.width = Math.max(6, Math.round((a/max)*100)) + '%';
    bar2.style.width = Math.max(6, Math.round((b/max)*100)) + '%';
    ttfb1El.textContent = isFinite(a) ? `${Math.round(a)} ms` : '—';
    ttfb2El.textContent = isFinite(b) ? `${Math.round(b)} ms` : '—';
  }

  btn?.addEventListener('click', run);
  run();
}

async function measureTTFB(url){
  // Start timer
  const t0 = performance.now();
  const resp = await fetch(url, { cache: 'no-store' }); // bypass browser cache; CF still applies
  let ttfbMs = NaN;

  try{
    if (resp.body && resp.body.getReader) {
      const reader = resp.body.getReader();
      await reader.read(); // first chunk
      ttfbMs = performance.now() - t0;
      reader.cancel().catch(()=>{});
    } else {
      // Fallback: just use response availability time
      ttfbMs = performance.now() - t0;
    }
  }catch{
    ttfbMs = performance.now() - t0;
  }

  // Try to read protocol from ResourceTiming (same-origin → no TAO needed)
  let protocol = '';
  try{
    const entries = performance.getEntriesByName(new URL(url, location.href).toString());
    if (entries && entries.length) {
      const last = entries[entries.length - 1];
      protocol = last.nextHopProtocol || '';
      if (protocol === 'h2') protocol = 'HTTP/2';
      if (protocol === 'h3') protocol = 'HTTP/3';
    }
  }catch{ /* ignore */ }

  return { ttfbMs, headers: resp.headers, protocol };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));