/* =========================
   Riot Lookup (unchanged)
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
  const clean = name.replace(/['’.&]/g,'').replace(/\s+/g,' ').trim()
    .split(' ').map(w => w[0].toUpperCase()+w.slice(1)).join('');
  return `${clean}.png`;
}

document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initNexusParallax();
  wireIconFallbacks();
});

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

function escapeHtml(s=''){
  return s.replace(/[&<>"'`=\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'
  }[c]));
}

/* =========================
   Nexus parallax
   ========================= */
function initNexusParallax(){
  const card = document.getElementById('nexus-card');
  if(!card) return;
  const nexus = card.querySelector('.nexus');
  const core  = card.querySelector('.nexus-core');
  const nodes = card.querySelectorAll('.nexus-node');

  const onMove = (e)=>{
    const r = nexus.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = (e.clientX - cx)/r.width;
    const dy = (e.clientY - cy)/r.height;
    core.style.transform = `translate(-50%,-50%) translate(${dx*6}px,${dy*6}px)`;
    nodes.forEach((n,i)=>{
      const s = 1 + (i%2?0.01:-0.01);
      n.style.transform = `translateZ(0) translate(${dx*8}px,${dy*8}px) scale(${s})`;
    });
  };
  const reset = ()=>{
    core.style.transform = 'translate(-50%,-50%)';
    nodes.forEach(n=> n.style.transform = 'translateZ(0)');
  };

  nexus.addEventListener('mousemove', onMove);
  nexus.addEventListener('mouseleave', reset);
}

/* =========================
   Icon fallbacks (local SVG)
   ========================= */
function wireIconFallbacks(){
  document.querySelectorAll('img.node-ic[data-fallback]').forEach(img=>{
    img.addEventListener('error', ()=> {
      const t = img.getAttribute('data-fallback');
      const svg = createFallbackIcon(t);
      svg.classList.add('node-ic');
      img.replaceWith(svg);
    }, { once:true });
  });
}

function createFallbackIcon(type){
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 32 32');
  svg.setAttribute('aria-hidden','true');

  const defs = document.createElementNS(NS,'defs');
  const grad = document.createElementNS(NS,'linearGradient');
  grad.setAttribute('id','g'); grad.setAttribute('x1','0'); grad.setAttribute('y1','0'); grad.setAttribute('x2','1'); grad.setAttribute('y2','0');
  const s1 = document.createElementNS(NS,'stop'); s1.setAttribute('offset','0'); s1.setAttribute('stop-color','var(--brand1)');
  const s2 = document.createElementNS(NS,'stop'); s2.setAttribute('offset','1'); s2.setAttribute('stop-color','var(--brand2)');
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

  function path(d, fill='url(#g)'){
    const p = document.createElementNS(NS,'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', fill);
    p.setAttribute('stroke', 'rgba(255,255,255,.25)');
    p.setAttribute('stroke-width', '0.6');
    p.setAttribute('vector-effect','non-scaling-stroke');
    return p;
  }

  switch (type) {
    case 'amplify': // stylized 'A'
      svg.appendChild(path('M16 4 L28 26 H22.5 L16 14 L9.5 26 H4z'));
      break;
    case 's3': // bucket shape
      svg.appendChild(path('M7 10 h18 v10 H7z'));
      svg.appendChild(path('M9 8 h14 v4 H9z'));
      break;
    case 'lambda': // λ
      svg.appendChild(path('M10 26 L16 6 L22 26 H18.3 L16.6 20 H13.4 L11.7 26z'));
      break;
    default: // cloudfront-ish hex + node
      svg.appendChild(path('M16 6 l9 5 v10 l-9 5 -9-5 V11z'));
      svg.appendChild(path('M16 12 a4 4 0 1 0 0.01 0z'));
  }
  return svg;
}