/* =========================
   Riot API (existing)
   ========================= */
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
const REGION_CODE = {'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr','br1':'br1','la1':'la1','la2':'la2','oc1':'oc1','tr1':'tr1','ru':'ru','jp1':'jp1'};
const CHAMPION_MAP = {7:'LeBlanc',268:'Azir',517:'Sylas',1:'Annie',103:'Ahri',64:'Lee Sin',11:'Master Yi',81:'Ezreal',157:'Yasuo',84:'Akali',222:'Jinx'};
const DDRAGON_FILE = {'LeBlanc':'Leblanc',"Cho'Gath":'Chogath',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Vel'Koz":'Velkoz',"Kog'Maw":'KogMaw',"Rek'Sai":'RekSai',"Bel'Veth":'Belveth','Nunu & Willump':'Nunu','Jarvan IV':'JarvanIV','Wukong':'MonkeyKing','Renata Glasc':'Renata','Dr. Mundo':'DrMundo','Tahm Kench':'TahmKench'};

function ddragonFileFromName(name){ if(!name) return ''; if(DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean=name.replace(/['’.&]/g,'').replace(/\s+/g,' ').trim().split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(''); return `${clean}.png`; }

/* =========================
   Boot
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initMissHitRace();
});

/* ===== Riot Lookup ===== */
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
   MISS→HIT Micro Race
   ========================= */
function initMissHitRace(){
  const panel = document.getElementById('race-panel'); if(!panel) return;

  const assetSel = document.getElementById('race-asset');
  const runBtn   = document.getElementById('race-run');

  const barTTFBCold  = document.getElementById('bar-ttfb-cold');
  const barTTFBWarm  = document.getElementById('bar-ttfb-warm');
  const barTotalCold = document.getElementById('bar-total-cold');
  const barTotalWarm = document.getElementById('bar-total-warm');

  const lblTTFBCold  = document.getElementById('lbl-ttfb-cold');
  const lblTTFBWarm  = document.getElementById('lbl-ttfb-warm');
  const lblTotalCold = document.getElementById('lbl-total-cold');
  const lblTotalWarm = document.getElementById('lbl-total-warm');

  const chipPOP   = document.getElementById('chip-pop');
  const chipProto = document.getElementById('chip-proto');
  const chipXC1   = document.getElementById('chip-xc1');
  const chipXC2   = document.getElementById('chip-xc2');
  const chipAge   = document.getElementById('chip-age');

  const statusEl  = document.getElementById('race-status');

  runBtn.addEventListener('click', async ()=>{
    runBtn.disabled = true; statusEl.textContent='Running…';

    // reset UI
    [barTTFBCold,barTTFBWarm,barTotalCold,barTotalWarm].forEach(b=>b.style.width='0%');
    [lblTTFBCold,lblTTFBWarm,lblTotalCold,lblTotalWarm].forEach(l=>l.textContent = l.id.includes('warm')?'Warm —':'Cold —');
    [chipPOP,chipProto,chipXC1,chipXC2,chipAge].forEach(c=>c.innerHTML=c.innerHTML.replace(/:.*/,': —'));

    try{
      const basePath = assetSel.value || '/styles.css';
      const stamp = Date.now();
      const testURL = new URL(`${basePath}?race=${stamp}`, location.origin).href;

      // 1) COLD (unique URL => likely MISS at CloudFront)
      const cold = await measure(testURL, { cache: 'no-store' });

      // 2) WARM (same URL again => HIT at CloudFront)
      const warm = await measure(testURL, { cache: 'no-store' });

      // protocol/POP/age from last response (warm)
      chipPOP.innerHTML   = `<b>POP</b>: ${escapeHtml(warm.headers['x-amz-cf-pop'] || '—')}`;
      chipProto.innerHTML = `<b>Protocol</b>: ${warm.protocol || '—'}`;
      chipXC1.innerHTML   = `<b>Cold</b>: ${escapeHtml(cold.headers['x-cache'] || '—')}`;
      chipXC2.innerHTML   = `<b>Warm</b>: ${escapeHtml(warm.headers['x-cache'] || '—')}`;
      chipAge.innerHTML   = `<b>Age</b>: ${warm.headers['age'] ? warm.headers['age']+'s' : '—'}`;

      // Bars
      const maxTTFB  = Math.max(cold.ttfb, warm.ttfb, 1);
      const maxTotal = Math.max(cold.total, warm.total, 1);

      barTTFBCold.style.width  = Math.round(cold.ttfb / maxTTFB * 100) + '%';
      barTTFBWarm.style.width  = Math.round(warm.ttfb / maxTTFB * 100) + '%';
      barTotalCold.style.width = Math.round(cold.total / maxTotal * 100) + '%';
      barTotalWarm.style.width = Math.round(warm.total / maxTotal * 100) + '%';

      lblTTFBCold.textContent  = `Cold ${cold.ttfb} ms`;
      lblTTFBWarm.textContent  = `Warm ${warm.ttfb} ms`;
      lblTotalCold.textContent = `Cold ${cold.total} ms`;
      lblTotalWarm.textContent = `Warm ${warm.total} ms`;

      statusEl.textContent = `Done • Cold ${cold.status}, Warm ${warm.status}`;
    }catch(e){
      statusEl.textContent = `Error: ${e.message}`;
    }finally{
      runBtn.disabled = false;
    }
  });
}

async function measure(url, { cache='no-store' }={}){
  const t0 = performance.now();
  // time to headers (TTFB)
  const pStart = performance.now();
  const res = await fetch(url, { cache, mode:'cors' });
  const ttfb = Math.max(0, performance.now() - pStart);

  // read body to complete
  await res.arrayBuffer();
  const total = Math.max(0, performance.now() - pStart);

  // collect headers
  const headers = {};
  for (const h of ['x-cache','age','x-amz-cf-pop','content-encoding','content-length']) {
    const v = res.headers.get(h);
    if (v) headers[h] = v;
  }

  // protocol from resource timing
  let protocol = '';
  try{
    const entries = performance.getEntriesByName(url, 'resource');
    if (entries && entries.length) protocol = entries[entries.length-1].nextHopProtocol || '';
  }catch{}

  return { status: res.status, ttfb: Math.round(ttfb), total: Math.round(total), headers, protocol };
}