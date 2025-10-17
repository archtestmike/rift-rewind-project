const RIOT_LAMBDA_URL = window.__LAMBDA_URL || '/api/riot';

const REGION_CODE = {
  'na1':'na1','euw1':'euw1','eun1':'eun1','kr':'kr','br1':'br1','la1':'la1','la2':'la2','oc1':'oc1','tr1':'tr1','ru':'ru','jp1':'jp1'
};

const CHAMPION_MAP = {
  7:'LeBlanc',268:'Azir',517:'Sylas',1:'Annie',103:'Ahri',64:'Lee Sin',11:'Master Yi',
  81:'Ezreal',157:'Yasuo',84:'Akali',222:'Jinx'
};

function ddragonFileFromName(name) {
  if (!name) return '';
  return name.replace(/['’.&\s]/g, '');
}

document.addEventListener('DOMContentLoaded', initRiotLookup);

function initRiotLookup() {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  if (!form || !resultsEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const region = REGION_CODE[form.region.value];
    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    try {
      const t0 = performance.now();
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region })
      });
      const t1 = performance.now();

      let data = null;
      const text = await resp.text();
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!resp.ok) {
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Error (${resp.status}): ${text}</p>`;
        return;
      }

      renderResult(resultsEl, data, Math.round(t1 - t0), region);
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${err.message}</p>`;
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
    const champName = ch.championName || CHAMPION_MAP[ch.championId] || `Champion ${ch.championId}`;
    const champImg = `https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${ddragonFileFromName(champName)}.png`;

    return `
      <div class="panel" style="margin:12px 0;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${champImg}" alt="${champName}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;">
          <div><b>${champName}</b><br><span class="tiny muted">Mastery Lv ${masteryLvl} — ${pts} pts</span></div>
        </div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="panel" style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;">
      <h3>Summoner: ${name}</h3>
      <p class="tiny muted">Level ${lvl} • Fetched in ${ms}ms via ${region}</p>
      ${rows || '<p class="tiny muted">No mastery data found.</p>'}
    </div>`;
}