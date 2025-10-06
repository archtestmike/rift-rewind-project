/* =========================
   Riot API (existing)
   ========================= */
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
const REGION_CODE = {
  'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr','br1':'br1','la1':'la1','la2':'la2','oc1':'oc1','tr1':'tr1','ru':'ru','jp1':'jp1'
};
const CHAMPION_MAP = {
  7:'LeBlanc',268:'Azir',517:'Sylas',1:'Annie',103:'Ahri',64:'Lee Sin',11:'Master Yi',
  81:'Ezreal',157:'Yasuo',84:'Akali',222:'Jinx'
};
const DDRAGON_FILE = {
  'LeBlanc':'Leblanc',"Cho'Gath":'Chogath',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',
  "Vel'Koz":'Velkoz',"Kog'Maw":'KogMaw',"Rek'Sai":'RekSai',"Bel'Veth":'Belveth',
  'Nunu & Willump':'Nunu','Jarvan IV':'JarvanIV','Wukong':'MonkeyKing',
  'Renata Glasc':'Renata','Dr. Mundo':'DrMundo','Tahm Kench':'TahmKench'
};
function ddragonFileFromName(name){
  if(!name) return '';
  if(DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean = name.replace(/['’.&]/g,'').replace(/\s+/g,' ').trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return `${clean}.png`;
}

/* =========================
   Boot
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initEdgeSnapshot();
});

/* ===== Riot Lookup ===== */
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
      const input = document.getElementById('riotId');
      if (input) input.value = recent;
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

/* Helpers */
function escapeHtml(s='') {
  return s.replace(/[&<>"'`=\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'
  }[c]));
}

/* =========================
   Edge & Cost Snapshot
   ========================= */
function initEdgeSnapshot(){
  const panel = document.getElementById('edge-panel');
  if(!panel) return;

  const chipPOP   = document.getElementById('chip-pop');
  const chipProto = document.getElementById('chip-proto');
  const chipXc    = document.getElementById('chip-xcache');
  const chipAge   = document.getElementById('chip-age');

  const warmthBar   = document.getElementById('warmth-bar');
  const warmthLabel = document.getElementById('warmth-label');
  const ttlLabel    = document.getId('ttl-label'); // <- fixed below with safe getter
}

function document_getId(id){ return document.getElementById(id); }

/* Rebuild with correct getters */
(function(){
  const chipPOP   = document_getId('chip-pop');
  const chipProto = document_getId('chip-proto');
  const chipXc    = document_getId('chip-xcache');
  const chipAge   = document_getId('chip-age');

  const warmthBar   = document_getId('warmth-bar');
  const warmthLabel = document_getId('warmth-label');
  const ttlLabel    = document_getId('ttl-label');
  const refreshBtn  = document_getId('edge-refresh');

  const visitsRange = document_getId('cost-visits');
  const mbRange     = document_getId('cost-mb');
  const visitsOut   = document_getId('visits-out');
  const mbOut       = document_getId('mb-out');

  const kData   = document_getId('k-data');
  const kReq    = document_getId('k-req');
  const kLambda = document_getId('k-lambda');
  const kResult = document_getId('k-result');
  const costBar = document_getId('cost-bar');
  const costLbl = document_getId('cost-label');

  if (!chipPOP) return; // panel not present

  // Defaults for sliders
  visitsRange.value = 400; // nice safe defaults
  mbRange.value = 0.5;
  visitsOut.textContent = visitsRange.value;
  mbOut.textContent = mbRange.value;

  // Events
  visitsRange.addEventListener('input', updateCost);
  mbRange.addEventListener('input', updateCost);
  refreshBtn.addEventListener('click', measureEdge);

  // Initial runs
  measureEdge();
  updateCost();

  async function measureEdge(){
    // Same-origin asset
    const url = new URL('/styles.css', location.origin).href;

    // Clear previous
    warmthBar.style.width = '0%';
    warmthLabel.textContent = '—';
    ttlLabel.textContent = 'TTL —';
    chipPOP.innerHTML = '<b>POP</b>: —';
    chipProto.innerHTML = '<b>Protocol</b>: —';
    chipXc.innerHTML = '<b>X-Cache</b>: —';
    chipAge.innerHTML = '<b>Age</b>: —';

    try{
      // Use no-cache to allow revalidation but still go through CF
      const t0 = performance.now();
      const res = await fetch(url, { cache:'no-cache' });
      await res.arrayBuffer(); // ensure full body so timing entry is populated
      const t1 = performance.now();

      // Headers
      const age = toInt(res.headers.get('age'));
      const cacheCtl = res.headers.get('cache-control') || '';
      const maxAge = parseMaxAge(cacheCtl) ?? 300;
      const xc = res.headers.get('x-cache') || '—';
      const pop = res.headers.get('x-amz-cf-pop') || '—';

      // Protocol from ResourceTiming
      let proto = '';
      try{
        const entries = performance.getEntriesByName(url, 'resource');
        if (entries && entries.length){
          proto = entries[entries.length-1].nextHopProtocol || '';
        }
      }catch{}

      // Chips
      chipPOP.innerHTML   = `<b>POP</b>: ${escapeHtml(pop)}`;
      chipProto.innerHTML = `<b>Protocol</b>: ${proto || '—'}`;
      chipXc.innerHTML    = `<b>X-Cache</b>: ${escapeHtml(xc)}`;
      chipAge.innerHTML   = `<b>Age</b>: ${Number.isFinite(age) ? age+'s' : '—'}`;

      // Warmth
      const warmth = Math.max(0, Math.min(1, (Number.isFinite(age) ? age : 0) / maxAge));
      warmthBar.style.width = Math.round(warmth * 100) + '%';
      warmthLabel.textContent = `${Math.round(warmth*100)}% warm`;
      ttlLabel.textContent = `TTL ${maxAge}s`;

    }catch(err){
      warmthLabel.textContent = 'Unavailable';
      chipProto.innerHTML = `<b>Protocol</b>: —`;
      chipXc.innerHTML = `<b>X-Cache</b>: —`;
      chipAge.innerHTML = `<b>Age</b>: —`;
      console.warn('Edge measure error:', err);
    }
  }

  function updateCost(){
    const visitsPerDay = toInt(visitsRange.value);
    const mbPerVisit   = Number(mbRange.value);
    visitsOut.textContent = visitsPerDay.toLocaleString();
    mbOut.textContent = mbPerVisit.toFixed(1);

    // Simple assumptions: 10 requests/visit, Lambda 0.1 per visit (some pages call Lambda sometimes)
    const reqPerVisit = 10;
    const lambdaPerVisit = 0.1;

    const days = 30;
    const monthlyVisits = visitsPerDay * days;
    const dataGB = (monthlyVisits * mbPerVisit) / 1024;     // MB -> GB
    const dataTB = dataGB / 1024;

    const requests = monthlyVisits * reqPerVisit;
    const lambdas  = Math.round(monthlyVisits * lambdaPerVisit);

    // Free tiers: CF 1 TB / 10M req; Lambda 1M req (ignoring GB-s for simplicity)
    const pctData = clamp01(dataTB / 1.0);      // vs 1 TB
    const pctReq  = clamp01(requests / 10_000_000);
    const pctLam  = clamp01(lambdas / 1_000_000);

    kData.textContent   = `${fmtNumber(dataTB,2)} TB`;
    kReq.textContent    = `${fmtNumber(requests)} req`;
    kLambda.textContent = `${fmtNumber(lambdas)} inv`;

    // Result + bar (take worst utilization)
    const worst = Math.max(pctData, pctReq, pctLam);
    costBar.style.width = Math.round(worst*100) + '%';

    const allWithin = (pctData <= 1 && pctReq <= 1 && pctLam <= 1);
    kResult.textContent = allWithin ? 'Likely $0 (Free Tier)' : 'May exceed Free Tier';
    costLbl.textContent = `${Math.round(worst*100)}% of Free Tier`;

  }

  function toInt(v){ const n = parseInt(v,10); return Number.isFinite(n) ? n : 0; }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function fmtNumber(n, decimals=0){
    if (decimals > 0) return Number(n).toFixed(decimals);
    return Number(n).toLocaleString();
  }
  function parseMaxAge(cacheControl){
    // parse max-age or s-maxage
    const m = /(?:s-maxage|max-age)=(\d+)/i.exec(cacheControl);
    return m ? parseInt(m[1],10) : null;
  }
})();