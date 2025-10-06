// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI region codes -> platform routing (unchanged)
const REGION_CODE = {
  'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr',
  'br1':'br1','la1':'la1','la2':'la2','oc1':'oc1',
  'tr1':'tr1','ru':'ru','jp1':'jp1'
};

const LS_KEYS = {
  LAST_ID: 'rr:lastId',
  SAVED: 'rr:savedIds',
  LAT: 'rr:latencies' // store last 10 numbers
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentDatalist = document.getElementById('recentIds');
  const lastSeen = document.getElementById('lastSeen');

  hydrateRecent(recentDatalist, lastSeen);
  renderSaved();
  renderSpark();

  if (!form || !resultsEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>`;
      return;
    }

    const t0 = performance.now();
    resultsEl.innerHTML = `<p class="tiny muted">Fetching…</p>`;

    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      const t1 = performance.now();
      const ms = Math.round(t1 - t0);
      trackLatency(ms);
      renderSpark();

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      localStorage.setItem(LS_KEYS.LAST_ID, riotId);
      hydrateRecent(recentDatalist, lastSeen);

      resultsEl.innerHTML = renderSummonerCard(data, ms);
      wireSaveButton(riotId);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });

  lastSeen.addEventListener('click', (e) => {
    e.preventDefault();
    const id = localStorage.getItem(LS_KEYS.LAST_ID);
    if (id) {
      document.getElementById('riotId').value = id;
    }
  });
});

/* ---- Renderers ---- */

function renderSummonerCard(data, ms){
  const { summoner, topChampions } = data || {};
  const totalPoints = (topChampions || []).reduce((a,c)=>a+(c.championPoints||0),0);
  const avgLevel = (topChampions && topChampions.length)
    ? (topChampions.reduce((a,c)=>a+(c.championLevel||0),0)/topChampions.length).toFixed(1)
    : '—';

  const champs = (topChampions||[]).map(c => {
    const pct = Math.max(6, Math.min(100, Math.round((c.championPoints/700000)*100)));
    return `
      <div class="champ">
        <div class="row" style="justify-content:space-between">
          <div class="row">
            ${championIcon(c.championId)}
            <strong style="font-size:18px">${championName(c.championId)}</strong>
          </div>
          <span class="badge">Mastery Lv ${c.championLevel||0}</span>
        </div>
        <div class="row muted tiny" style="justify-content:space-between;margin:6px 0 10px">
          <div class="row" style="gap:8px">${classBadges(c.championId)}</div>
          <div><b>${fmt(c.championPoints||0)}</b> pts</div>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join('');

  return `
  <div class="panel" style="border-radius:16px; border:1px solid rgba(255,255,255,.1); background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01));">
    <div class="row" style="justify-content:space-between; align-items:center;">
      <h3>Summoner: ${escapeHtml(safe(summoner,'name')||'')}</h3>
      <span class="badge">Level ${safe(summoner,'level')||'—'}</span>
    </div>

    <div class="row muted tiny" style="gap:10px; margin:8px 0 12px;">
      <span class="badge">Total Points: ${fmt(totalPoints)}</span>
      <span class="badge">Avg Mastery Lv: ${avgLevel}</span>
      <span class="badge">Fetched in ${ms} ms via AWS Lambda (us-east-1)</span>
      <button class="btn-xs" id="save-id">★ Save</button>
    </div>

    ${champs || '<p class="tiny muted">No mastery data.</p>'}
  </div>`;
}

function championIcon(id){
  // Use Riot Data Dragon if you later map ID->image; for now glass avatar placeholder
  return `<img src="https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/${championName(id)}.png"
             onerror="this.style.display='none'"
             alt="" style="width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);margin-right:8px">`;
}
function championName(id){
  // minimal mapping (IDs from your screenshots). Fallback to "Champion ID X"
  const map={7:'Leblanc',268:'Azir',517:'Sylas'};
  return map[id] || `Champion ID ${id}`;
}
function classBadges(id){
  const map={
    7:['Assassin','Mage'],
    268:['Mage','Marksman'],
    517:['Mage','Assassin']
  };
  return (map[id]||[]).map(x=>`<span class="badge">${x}</span>`).join('');
}

/* ---- Saved list + localStorage ---- */
function wireSaveButton(riotId){
  const btn = document.getElementById('save-id');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const arr = getSaved();
    if(!arr.includes(riotId)){
      arr.unshift(riotId);
      localStorage.setItem(LS_KEYS.SAVED, JSON.stringify(arr.slice(0,10)));
      renderSaved();
    }
  });
}

function getSaved(){
  try{ return JSON.parse(localStorage.getItem(LS_KEYS.SAVED)||'[]'); }
  catch{ return []; }
}

function renderSaved(){
  const c = document.getElementById('saved-list');
  if(!c) return;
  const arr = getSaved();
  if(arr.length===0){
    c.innerHTML = `<p class="tiny muted">Nothing saved yet. After a lookup, click <b>★ Save</b>.</p>`;
    return;
  }
  c.innerHTML = arr.map(id => `
    <div class="saved-item">
      <span>${escapeHtml(id)}</span>
      <div class="actions">
        <button class="btn-xs" data-run="${escapeHtml(id)}">Run</button>
        <button class="btn-xs" data-del="${escapeHtml(id)}">Remove</button>
      </div>
    </div>`).join('');

  c.querySelectorAll('[data-run]').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.getElementById('riotId').value = b.dataset.run;
      document.getElementById('riot-form').requestSubmit();
    });
  });
  c.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const next = getSaved().filter(x=>x!==b.dataset.del);
      localStorage.setItem(LS_KEYS.SAVED, JSON.stringify(next));
      renderSaved();
    });
  });
}

/* ---- Recent & datalist ---- */
function hydrateRecent(datalist, anchor){
  const last = localStorage.getItem(LS_KEYS.LAST_ID);
  if (anchor){
    if(last){ anchor.style.display='inline'; anchor.textContent=last; }
    else { anchor.style.display='none'; }
  }
  if (!datalist) return;
  const saved = getSaved();
  datalist.innerHTML = [last, ...saved].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)
    .map(v=>`<option value="${escapeHtml(v)}">`).join('');
}

/* ---- Latency sparkline (last 10) ---- */
function trackLatency(ms){
  const arr = getLatencies();
  arr.push(Number(ms)||0);
  const last10 = arr.slice(-10);
  localStorage.setItem(LS_KEYS.LAT, JSON.stringify(last10));
}
function getLatencies(){
  try{ return JSON.parse(localStorage.getItem(LS_KEYS.LAT)||'[]'); }
  catch{ return []; }
}
function renderSpark(){
  const canvas = document.getElementById('latencySpark');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const