// === Config ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// Champion id → metadata (enough for top cards)
const CHAMP_INDEX = {
  7:   { key: "Leblanc",  name: "LeBlanc",  tags:["Assassin","Mage"] },
  268: { key: "Azir",     name: "Azir",     tags:["Mage","Marksman"] },
  517: { key: "Sylas",    name: "Sylas",    tags:["Mage","Assassin"] },
};

async function getDdragonVersion(){
  try{
    const c = localStorage.getItem('dd_ver'); if (c) return c;
    const r = await fetch('https://ddragon.leagueoflegends.com/api/versions.json',{cache:'no-store'});
    const j = await r.json(); const v = Array.isArray(j)&&j.length? j[0] : '14.18.1';
    localStorage.setItem('dd_ver', v); return v;
  }catch{ return '14.18.1'; }
}
const champIconUrl = (k,v)=>`https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${k}.png`;

function setRecent(id){ try{ localStorage.setItem('recentRiotId', id);}catch{} }
function getRecent(){ try{ return localStorage.getItem('recentRiotId')||'';}catch{ return ''; } }
const escapeHtml = s => String(s).replace(/[&<>"'`=\/]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'}[c]));

const REGION_CODE = { na1:'na1', euw1:'euw1', eun1:'eun1', kr:'kr', br1:'br1', la1:'la1', la2:'la2', oc1:'oc1', tr1:'tr1', ru:'ru', jp1:'jp1' };

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentEl = document.getElementById('recent');
  const riotInput = document.getElementById('riotId');

  // recent link
  const recent = getRecent();
  if (recent){
    recentEl.innerHTML = `Recent: <a href="#" id="recentLink">${escapeHtml(recent)}</a>`;
    recentEl.querySelector('#recentLink').addEventListener('click',(e)=>{
      e.preventDefault(); riotInput.value = recent;
    });
  }

  // keep consistent field look
  riotInput.addEventListener('focus', ()=>riotInput.classList.add('field'));
  riotInput.addEventListener('blur',  ()=>riotInput.classList.add('field'));

  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value||'').trim();
    const platform = REGION_CODE[form.region.value];

    if (!riotId.includes('#')){
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    const t0 = performance.now();
    try{
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      if (!resp.ok){
        const text = await resp.text();
        resultsEl.innerHTML = `<div class="result-card"><p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text||'Request failed')}</p></div>`;
        return;
      }

      const data = await resp.json();
      const elapsed = Math.max(1, Math.round(performance.now()-t0));
      setRecent(riotId);
      renderResults(resultsEl, data, elapsed);
    }catch(err){
      resultsEl.innerHTML = `<div class="result-card"><p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p></div>`;
    }
  });
});

async function renderResults(container, data, elapsedMs){
  const ver = await getDdragonVersion();

  const name = data?.summoner?.name || 'Unknown';
  const level = data?.summoner?.level ?? '—';
  const champs = Array.isArray(data?.topChampions) ? data.topChampions : [];

  let html = `
    <div class="result-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <h3>Summoner: ${escapeHtml(name)}</h3>
        <span class="badge">Level ${escapeHtml(level)}</span>
      </div>
      <div style="margin:10px 0 6px;">
        <span class="badge">Fetched in ${elapsedMs} ms via AWS Lambda (us-east-1)</span>
      </div>
    </div>
  `;

  if (!champs.length){
    html += `<div class="result-card"><p class="tiny muted">No mastery data returned.</p></div>`;
  } else {
    for (const m of champs){
      const meta = CHAMP_INDEX[m.championId] || null;
      const title = meta ? meta.name : `Champion ID ${m.championId}`;
      const tags  = meta ? meta.tags : [];
      const icon  = meta ? champIconUrl(meta.key, ver) : '';

      const lvl = m.championLevel ?? 0;
      const pts = m.championPoints ?? 0;
      const pct = Math.max(8, Math.min(100, Math.round(Math.min(1, (pts/800000)) * 100)));

      html += `
        <div class="result-card">
          <div class="champ-row">
            <div class="champ-left">
              <span class="champ-ic">
                ${icon ? `<img src="${icon}" alt="${escapeHtml(title)}" onerror="this.remove()">` : ''}
              </span>
              <div>
                <div style="font-weight:800;letter-spacing:.3px">${escapeHtml(title)}</div>
                ${tags.map(t=>`<span class="badge" style="margin-right:6px">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span class="badge">Mastery Lv ${escapeHtml(lvl)}</span>
              <div style="min-width:110px;text-align:right;color:#bfcfff;font-weight:700">${pts.toLocaleString()} pts</div>
            </div>
          </div>
          <div class="progress" style="margin-top:12px"><span style="width:${pct}%"></span></div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}