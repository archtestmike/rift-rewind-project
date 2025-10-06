// === Riot API Lambda integration (unchanged) ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

// Champion ID → Name
const CHAMPION_MAP = {
  7: 'LeBlanc', 268: 'Azir', 517: 'Sylas', 1: 'Annie', 103: 'Ahri',
  64: 'Lee Sin', 11: 'Master Yi', 81: 'Ezreal', 157: 'Yasuo', 84: 'Akali', 222: 'Jinx',
};

// Name → Data Dragon filename overrides
const DDRAGON_FILE = {
  'LeBlanc': 'Leblanc', "Cho'Gath": 'Chogath', "Kai'Sa": 'Kaisa', "Kha'Zix": 'Khazix',
  "Vel'Koz": 'Velkoz', "Kog'Maw": 'KogMaw', "Rek'Sai": 'RekSai', "Bel'Veth": 'Belveth',
  'Nunu & Willump': 'Nunu', 'Jarvan IV': 'JarvanIV', 'Wukong': 'MonkeyKing',
  'Renata Glasc': 'Renata', 'Dr. Mundo': 'DrMundo', 'Tahm Kench': 'TahmKench',
};

// Build a safe Data Dragon filename for a champion name
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

// ──────────────────────────────────────────────────────────────────────────────
// Page bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initVisitorHeatmap();
});

// === Riot Lookup UI ===
function initRiotLookup(){
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  const recentEl = document.getElementById('recentId');
  if (!form || !resultsEl) return;

  // recent link from localStorage
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

// ──────────────────────────────────────────────────────────────────────────────
// Visitor Heatmap (Gamified) — continents highlight (privacy-friendly)
const VISITED_KEY = 'visitedContinents_v1'; // stores array of continent codes

async function initVisitorHeatmap(){
  const panel = document.getElementById('heatmap-panel');
  if (!panel) return;

  // Inject a gradient into the SVG so lit continents look neon
  const svg = panel.querySelector('svg');
  if (svg && !svg.querySelector('#gradLit')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id','gradLit'); grad.setAttribute('x1','0%'); grad.setAttribute('x2','100%');
    grad.setAttribute('y1','0%'); grad.setAttribute('y2','0%');
    const s1 = document.createElementNS('http://www.w3.org/2000/svg','stop'); s1.setAttribute('offset','0%');
    const s2 = document.createElementNS('http://www.w3.org/2000/svg','stop'); s2.setAttribute('offset','100%');
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
  }

  // Reset button
  const resetBtn = document.getElementById('reset-progress');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    localStorage.removeItem(VISITED_KEY);
    updateVisitedStats([]);
    // remove lit class
    panel.querySelectorAll('.continent.lit').forEach(g => g.classList.remove('lit'));
  });

  // Click to toggle (fun interaction)
  panel.querySelectorAll('.continent').forEach(g => {
    g.addEventListener('click', () => {
      const code = g.getAttribute('data-continent');
      const set = new Set(readVisited());
      if (g.classList.toggle('lit')) set.add(code); else set.delete(code);
      persistVisited([...set]);
      updateVisitedStats([...set]);
    });
  });

  // Local progress render
  updateVisitedStats(readVisited());

  // Geo lookup (continent + country)
  const msgEl = document.getElementById('visitor-msg');
  try {
    const geo = await getVisitorGeo();
    if (geo) {
      const { country_name, continent_code, continent_name } = geo;
      msgEl.textContent = `👋 Welcome from ${country_name || 'your region'} (${continent_name || continent_code}).`;
      lightContinent(continent_code);
    } else {
      msgEl.textContent = '🌍 Could not detect location.';
    }
  } catch (e) {
    msgEl.textContent = '🌍 Could not detect location.';
    console.error(e);
  }
}

async function getVisitorGeo(){
  // ipapi.co returns continent_code, continent_name, country_name
  const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function lightContinent(code){
  if (!code) return;
  const id = code.toUpperCase(); // AF, AN, AS, EU, NA, OC, SA
  if (id === 'AN') return; // ignore Antarctica
  const el = document.querySelector(`.continent[data-continent="${id}"]`);
  if (!el) return;
  if (!el.classList.contains('lit')) el.classList.add('lit');

  const set = new Set(readVisited());
  set.add(id);
  persistVisited([...set]);
  updateVisitedStats([...set]);
}

function readVisited(){
  try{
    const raw = localStorage.getItem(VISITED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  }catch{ return []; }
}
function persistVisited(arr){ localStorage.setItem(VISITED_KEY, JSON.stringify(arr)); }
function updateVisitedStats(arr){
  const countEl = document.getElementById('visited-count');
  if (countEl) countEl.textContent = String(new Set(arr).size);
}