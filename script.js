/* =========================
   Riot API (your existing)
   ========================= */
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
const REGION_CODE = {'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr','br1':'br1','la1':'la1','la2':'la2','oc1':'oc1','tr1':'tr1','ru':'ru','jp1':'jp1'};
const CHAMPION_MAP = {7:'LeBlanc',268:'Azir',517:'Sylas',1:'Annie',103:'Ahri',64:'Lee Sin',11:'Master Yi',81:'Ezreal',157:'Yasuo',84:'Akali',222:'Jinx'};
const DDRAGON_FILE = {'LeBlanc':'Leblanc',"Cho'Gath":'Chogath',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Vel'Koz":'Velkoz',"Kog'Maw":'KogMaw',"Rek'Sai":'RekSai',"Bel'Veth":'Belveth','Nunu & Willump':'Nunu','Jarvan IV':'JarvanIV','Wukong':'MonkeyKing','Renata Glasc':'Renata','Dr. Mundo':'DrMundo','Tahm Kench':'TahmKench'};

function ddragonFileFromName(name){ if(!name) return ''; if(DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean=name.replace(/['’.&]/g,'').replace(/\s+/g,' ').trim().split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(''); return `${clean}.png`; }

/* =========================
   Latency Race config
   ========================= */
const LAMBDA_RACE_URL = 'https://tfapgtyrz75ve4lrye32a3zzfe0zgaft.lambda-url.us-east-1.on.aws/'; // ← OPTIONAL: put your second Lambda Function URL here (or paste in the UI input)
const EDGE_DEFAULT_PATH = '/styles.css';

document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initLatencyRace();
});

/* ===== Riot Lookup (unchanged) ===== */
function initRiotLookup(){
  const form=document.getElementById('riot-form'); const resultsEl=document.getElementById('riot-results'); const recentEl=document.getElementById('recentId');
  if(!form||!resultsEl) return;
  const recent=localStorage.getItem('recentRiotId');
  if(recent&&recentEl){ recentEl.textContent=recent; recentEl.style.display='inline'; recentEl.addEventListener('click',e=>{e.preventDefault(); document.getElementById('riotId').value=recent;}); }
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); resultsEl.innerHTML='<p class="tiny muted">Fetching…</p>';
    const riotId=(form.riotId.value||'').trim(); const platform=REGION_CODE[form.region.value];
    if(!riotId.includes('#')){ resultsEl.innerHTML='<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>'; return; }
    localStorage.setItem('recentRiotId', riotId); if(recentEl){ recentEl.textContent=riotId; recentEl.style.display='inline'; }
    try{
      const t0=performance.now();
      const resp=await fetch(RIOT_LAMBDA_URL,{method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({summonerName:riotId, region:platform})});
      const t1=performance.now();
      if(!resp.ok){ const text=await resp.text(); resultsEl.innerHTML=`<div class="panel" style="background:rgba(40,0,0,.25);border:1px solid rgba(255,120,120,.25);border-radius:12px;padding:12px;">
        <span style="color:#ff9b9b">Lambda error (${resp.status}):</span><pre style="white-space:pre-wrap;margin:6px 0 0">${escapeHtml(text||'Request failed')}</pre></div>`; return; }
      const data=await resp.json(); renderResult(resultsEl,data,Math.round(t1-t0),platform);
    }catch(err){ resultsEl.innerHTML=`<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`; }
  });
}

function renderResult(root, data, ms, region){
  const lvl=data?.summoner?.level ?? '?'; const name=data?.summoner?.name ?? 'Unknown'; const champs=Array.isArray(data?.topChampions)?data.topChampions:[];
  const rows=champs.map(ch=>{
    const pts=(ch.championPoints ?? 0).toLocaleString(); const masteryLvl=ch.championLevel ?? 0;
    const progress=Math.max(6, Math.min(100, Math.round((ch.championPoints ?? 0)/700000*100)));
    const champName=ch.championName || CHAMPION_MAP[ch.championId] || `Champion ${ch.championId}`;
    const file=ddragonFileFromName(champName);
    const champImg=`https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${file}`;
    return `<div class="panel" style="margin:12px 0; background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:10px; min-width:220px;">
          <img src="${champImg}" alt="${champName}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex:0 0 42px">
          <div style="font-weight:800; font-size:18px; white-space:nowrap;">${escapeHtml(champName)}</div>
        </div>
        <div class="pill small" style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px;">Mastery Lv ${masteryLvl}</div>
        <div style="color:#aecdff; font-weight:800; margin-left:auto;">${pts} pts</div>
      </div>
      <div style="height:10px; border-radius:999px; background:rgba(255,255,255,.08); margin-top:10px; overflow:hidden;">
        <div style="height:100%; width:${progress}%; background:linear-gradient(90deg, var(--brand1), var(--brand2));"></div>
      </div></div>`;
  }).join('');
  root.innerHTML=`<div class="panel" style="background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:16px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
      <h3 style="margin:0">Summoner: ${escapeHtml(name)}</h3>
      <div class="pill small" style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px;">Level ${lvl}</div>
    </div>
    <div class="pill small" style="display:inline-flex; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:6px 10px; margin:6px 0 14px;">
      Fetched in ${ms} ms via AWS Lambda (${escapeHtml(region)})
    </div>
    ${rows || '<p class="tiny muted">No mastery data</p>'}</div>`;
}

function escapeHtml(s=''){ return s.replace(/[&<>"'`=\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'}[c])); }

/* =========================
   Latency Race
   ========================= */
function initLatencyRace(){
  const panel = document.getElementById('race-panel'); if(!panel) return;

  const edgeSel = document.getElementById('race-edge-path');
  const lambdaIn = document.getElementById('race-lambda');
  const primeBtn = document.getElementById('race-prime');
  const runBtn   = document.getElementById('race-run');

  const kEdgeTTFB  = document.getElementById('k-edge-ttfb');
  const kEdgeTotal = document.getElementById('k-edge-total');
  const kLamTTFB   = document.getElementById('k-l-ttfb');
  const kLamTotal  = document.getElementById('k-l-total');

  const resultsEl = document.getElementById('race-results');
  const statusEl  = document.getElementById('race-status');

  // Prefill inputs
  edgeSel.value = EDGE_DEFAULT_PATH;
  const savedLambda = localStorage.getItem('raceLambda');
  lambdaIn.value = savedLambda || LAMBDA_RACE_URL || '';

  lambdaIn.addEventListener('change', ()=> {
    localStorage.setItem('raceLambda', lambdaIn.value.trim());
  });

  primeBtn.addEventListener('click', async ()=>{
    statusEl.textContent = 'Priming CloudFront cache…';
    try{
      await fetch(edgeUrl(), { cache: 'reload' }); // one warm-up fetch
      statusEl.textContent = 'Primed. Run the test!';
    }catch(e){
      statusEl.textContent = `Prime failed: ${e.message}`;
    }
  });

  runBtn.addEventListener('click', async ()=>{
    const lurl = (lambdaIn.value || '').trim();
    if (!lurl) { statusEl.textContent = 'Enter a Lambda Function URL first.'; return; }
    statusEl.textContent = 'Running…';
    runBtn.disabled = true; primeBtn.disabled = true;

    // Clear previous
    resultsEl.innerHTML = '';
    [kEdgeTTFB,kEdgeTotal,kLamTTFB,kLamTotal].forEach(el=>el.textContent='—');

    try{
      // Measure Edge
      const edgeRes = await measure(edgeUrl(), { readBody: true, label: 'CloudFront' });

      // Measure Lambda (GET, no body) — we measure headers arrival (TTFB) + body read as total
      const lamRes = await measure(lurl, { method: 'GET', readBody: true, label: 'Lambda URL' });

      // KPIs
      kEdgeTTFB.textContent = edgeRes.ttfb + ' ms';
      kEdgeTotal.textContent = edgeRes.total + ' ms';
      kLamTTFB.textContent = lamRes.ttfb + ' ms';
      kLamTotal.textContent = lamRes.total + ' ms';

      renderBars(resultsEl, edgeRes, lamRes);
      statusEl.textContent = `Done • Edge ${edgeRes.status} • Lambda ${lamRes.status}`;
    }catch(e){
      statusEl.textContent = `Error: ${e.message}`;
    }finally{
      runBtn.disabled = false; primeBtn.disabled = false;
    }
  });

  function edgeUrl(){ return new URL(edgeSel.value, location.origin).href; }
}

async function measure(url, { method='GET', readBody=true, label='' }={}){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 10000); // 10s safety
  const t0 = performance.now();
  let res, ttfb, total;

  try{
    // TTFB = time until headers are available (fetch promise resolves)
    const p0 = performance.now();
    res = await fetch(url, { method, cache: 'no-cache', signal: controller.signal, mode: 'cors' });
    ttfb = Math.max(0, performance.now() - p0);

    // Total = full body read (small resources so OK)
    if (readBody){
      await res.arrayBuffer();
    }
    total = Math.max(0, performance.now() - p0);
  } finally {
    clearTimeout(timeout);
  }

  const headers = {};
  if (res && res.headers) {
    // Read a few helpful headers (same-origin gives you more)
    ['x-cache','age','content-encoding','content-type','etag','server-timing'].forEach(h=>{
      const v = res.headers.get(h);
      if (v) headers[h] = v;
    });
  }

  // Try to get protocol for same-origin resource timing
  let protocol = '';
  try{
    const entries = performance.getEntriesByName(url, 'resource');
    if (entries && entries.length){
      protocol = entries[entries.length - 1].nextHopProtocol || '';
    }
  }catch{}

  return {
    url, label,
    status: res ? res.status : 'ERR',
    ttfb: Math.round(ttfb),
    total: Math.round(total),
    headers, protocol
  };
}

function renderBars(root, edge, lam){
  const max = Math.max(edge.total, lam.total, 1);
  const bar = (ms) => Math.min(100, Math.round(ms / max * 100));

  root.innerHTML = [
    row('CloudFront (Edge)', edge, [
      chip('TTFB', edge.ttfb+'ms'),
      chip('Total', edge.total+'ms'),
      edge.protocol ? chip('Protocol', edge.protocol) : '',
      edge.headers['x-cache'] ? chip('X-Cache', edge.headers['x-cache']) : '',
      edge.headers['age'] ? chip('Age', edge.headers['age']+'s') : '',
      edge.headers['content-encoding'] ? chip('Encoding', edge.headers['content-encoding']) : ''
    ]),
    row('Lambda URL', lam, [
      chip('TTFB', lam.ttfb+'ms'),
      chip('Total', lam.total+'ms'),
      lam.protocol ? chip('Protocol', lam.protocol) : ''
    ])
  ].join('');

  function row(title, r, chips){
    return `<div class="race-row">
      <div class="race-head">
        <div class="race-title">${escapeHtml(title)}</div>
        <div class="race-chips">${chips.filter(Boolean).join('')}</div>
      </div>
      <div class="race-bars">
        <div class="bar-wrap" aria-label="TTFB ${r.ttfb} ms">
          <div class="bar" style="width:${bar(r.ttfb)}%"></div>
        </div>
        <div class="bar-label"><span>TTFB</span><b>${r.ttfb} ms</b></div>

        <div class="bar-wrap" aria-label="Total ${r.total} ms">
          <div class="bar" style="width:${bar(r.total)}%"></div>
        </div>
        <div class="bar-label"><span>Total time</span><b>${r.total} ms</b></div>
      </div>
    </div>`;
  }
  function chip(k,v){ return `<span class="chip"><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</span>`; }
}