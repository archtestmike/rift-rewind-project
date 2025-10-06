// ====== URLs ======
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
// Your second Lambda (metrics) remains in your account; no front-end change needed here.

// UI regions → platform
const REGION_CODE = {
  na1:'na1', euw1:'euw1', eun1:'eun1', kr:'kr',
  br1:'br1', la1:'la1', la2:'la2', oc1:'oc1',
  tr1:'tr1', ru:'ru', jp1:'jp1'
};

// ---------- Data Dragon (champion icons) ----------
let ddragon = { version:null, champMap:null };

async function getLatestVersion(){
  if (ddragon.version) return ddragon.version;
  const r = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const arr = await r.json();
  ddragon.version = arr[0];
  return ddragon.version;
}
async function getChampionMap(){
  if (ddragon.champMap) return ddragon.champMap;
  const v = await getLatestVersion();
  const r = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`);
  const data = await r.json();
  const map = {};
  Object.values(data.data).forEach(ch => {
    map[Number(ch.key)] = {
      name: ch.name,
      imgUrl: `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${ch.image.full}`
    };
  });
  ddragon.champMap = map;
  return map;
}

// ---------- App ----------
const fmt = new Intl.NumberFormat('en-US');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentEl = document.getElementById('recent-riot');

  // restore recent
  const last = localStorage.getItem('recentRiotId');
  if (last) {
    recentEl.textContent = last;
    recentEl.href = '#';
    recentEl.addEventListener('click', (e)=>{
      e.preventDefault();
      document.getElementById('riotId').value = last;
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

    const t0 = performance.now();
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
      const ms = Math.round(performance.now() - t0);

      // save recent
      localStorage.setItem('recentRiotId', riotId);
      recentEl.textContent = riotId;

      await renderSummoner(resultsEl, data, ms, platform);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

async function renderSummoner(container, payload, ms, platform){
  const map = await getChampionMap();
  const { summoner, topChampions } = payload;

  const rows = topChampions.map(ch => {
    const info = map[ch.championId] || { name:`Champion ID ${ch.championId}`, imgUrl:'' };
    const need = (ch.championPointsUntilNextLevel ?? 0);
    const pct = Math.max(0, Math.min(100, need>0 ? Math.round((ch.championPoints/(ch.championPoints+need))*100) : 100));
    return `
      <div class="row">
        <img class="champ-icon" src="${info.imgUrl}" alt="${escapeHtml(info.name)} icon" loading="lazy">
        <div style="flex:1;min-width:0">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between">
            <div style="font-weight:800">${escapeHtml(info.name)}</div>
            <span class="badge">Mastery Lv ${ch.championLevel}</span>
            <div style="color:#bcd0ff;font-weight:800">${fmt.format(ch.championPoints)} pts</div>
          </div>
          <div class="progress" style="margin-top:10px"><span style="width:${pct}%"></span></div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="card panel" style="border-radius:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:8px">
        <h3>Summoner: ${escapeHtml(summoner.name)}</h3>
        <span class="badge">Level ${summoner.level}</span>
      </div>

      <p><span class="badge">Fetched in ${ms} ms via AWS Lambda (${escapeHtml(platform)})</span></p>

      ${rows}
    </div>
  `;
}

// utils
function escapeHtml(s) {
  return String(s).replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}