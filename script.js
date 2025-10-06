/* =========================
   Riot API (your existing)
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
    .map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('');
  return `${clean}.png`;
}

/* =========================
   GitHub Pulse (no token)
   ========================= */
const DEFAULT_OWNER = localStorage.getItem('ghOwner') || 'archtestmike';
const DEFAULT_REPO  = localStorage.getItem('ghRepo')  || '';

document.addEventListener('DOMContentLoaded', () => {
  initRiotLookup();
  initGitHubPulse();
});

/* Riot Lookup UI */
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

/* Helpers */
function escapeHtml(s='') {
  return s.replace(/[&<>"'`=\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','=':'&#61;','/':'&#47;'
  }[c]));
}
const fmtAgo = (iso) => {
  const d = new Date(iso);
  const sec = Math.max(1, Math.floor((Date.now()-d.getTime())/1000));
  const units = [
    ['y',31536000],['mo',2592000],['d',86400],['h',3600],['m',60],['s',1]
  ];
  for (const [u,n] of units){ if (sec>=n) return `${Math.floor(sec/n)}${u} ago`; }
  return 'now';
};

/* GitHub Pulse */
function initGitHubPulse(){
  const ownerInput = document.getElementById('gh-owner');
  const repoSelect = document.getElementById('gh-repo');
  const refreshBtn = document.getElementById('gh-refresh');
  const statusEl = document.getElementById('gh-status');

  const kStars = document.getElementById('k-stars');
  const kForks = document.getElementById('k-forks');
  const kPRs   = document.getElementById('k-prs');
  const kPush  = document.getElementById('k-pushed');

  const commitsEl = document.getElementById('gh-commits');
  const prsEl = document.getElementById('gh-prs');

  if (!ownerInput || !repoSelect) return;

  ownerInput.value = DEFAULT_OWNER;

  ownerInput.addEventListener('change', async ()=>{
    await populateRepos();
    await runPulse();
  });

  repoSelect.addEventListener('change', async ()=>{
    localStorage.setItem('ghRepo', repoSelect.value);
    await runPulse();
  });

  refreshBtn.addEventListener('click', runPulse);

  // initial load
  (async () => {
    await populateRepos();
    await runPulse();
  })();

  async function populateRepos(){
    const owner = (ownerInput.value || '').trim();
    if (!owner) return;
    statusEl.textContent = 'Loading repositories…';
    try{
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=pushed`);
      if(!res.ok) throw new Error(`GitHub ${res.status}`);
      const repos = await res.json();

      // Choose repo list: prefer non-fork, non-archived; sort by pushed_at desc
      repos.sort((a,b)=> new Date(b.pushed_at)-new Date(a.pushed_at));
      const options = repos.filter(r=>!r.archived).map(r=>r.name);

      const prev = localStorage.getItem('ghRepo') || DEFAULT_REPO;
      repoSelect.innerHTML = options.map(name => `<option value="${name}">${name}</option>`).join('');

      // select previous or first
      const pick = options.includes(prev) ? prev : (options[0] || '');
      if (pick) repoSelect.value = pick;

      localStorage.setItem('ghOwner', owner);
      localStorage.setItem('ghRepo', pick || '');
      statusEl.textContent = options.length ? '' : 'No public repos found for this owner.';
    }catch(err){
      statusEl.textContent = `Error loading repos: ${err.message}`;
      repoSelect.innerHTML = '';
    }
  }

  async function runPulse(){
    const owner = (ownerInput.value || '').trim();
    const repo  = (repoSelect.value || '').trim();
    if (!owner || !repo){ return; }

    // reset skeletons
    [kStars,kForks,kPRs,kPush].forEach(el=>{ el.classList.add('skeleton'); el.textContent='—'; });
    commitsEl.innerHTML = `<div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div>`;
    prsEl.innerHTML = `<div class="skeleton-row"></div><div class="skeleton-row"></div>`;

    statusEl.textContent = 'Fetching repo data…';
    try{
      const [repoRes, commitsRes, prsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=5`)
      ]);
      if (!repoRes.ok) throw new Error(`Repo ${repoRes.status}`);
      const repoJson = await repoRes.json();

      // KPIs
      kStars.textContent = (repoJson.stargazers_count ?? 0).toLocaleString();
      kForks.textContent = (repoJson.forks_count ?? 0).toLocaleString();
      kPush.textContent = repoJson.pushed_at ? fmtAgo(repoJson.pushed_at) : '—';

      // PR count: we only fetched 5 to show; we can show the fetched length
      const prs = prsRes.ok ? await prsRes.json() : [];
      kPRs.textContent = Array.isArray(prs) ? prs.length.toString() : '0';
      [kStars,kForks,kPRs,kPush].forEach(el=>el.classList.remove('skeleton'));

      // Commits
      if (!commitsRes.ok) throw new Error(`Commits ${commitsRes.status}`);
      const commits = await commitsRes.json();
      commitsEl.innerHTML = (Array.isArray(commits) ? commits : []).map(c=>{
        const msg = (c.commit?.message || '—').split('\n')[0].slice(0,140);
        const author = c.commit?.author?.name || c.author?.login || 'unknown';
        const when = c.commit?.author?.date || c.commit?.committer?.date || new Date().toISOString();
        const url = c.html_url;
        return `<div class="gh-item">
          <div class="gh-head">
            <div style="font-weight:800; letter-spacing:.2px;">${escapeHtml(msg)}</div>
            <a class="chip" href="${url}" target="_blank" rel="noopener">View</a>
          </div>
          <div class="tiny muted">by <b>${escapeHtml(author)}</b> • ${fmtAgo(when)}</div>
        </div>`;
      }).join('') || `<p class="tiny muted">No recent commits.</p>`;

      // PRs
      prsEl.innerHTML = (Array.isArray(prs) ? prs : []).map(p=>{
        const title = (p.title || '—').slice(0,140);
        const author = p.user?.login || 'unknown';
        const when = p.updated_at || p.created_at;
        const url = p.html_url;
        const number = p.number;
        return `<div class="gh-item">
          <div class="gh-head">
            <div style="font-weight:800; letter-spacing:.2px;">#${number} — ${escapeHtml(title)}</div>
            <a class="chip" href="${url}" target="_blank" rel="noopener">Open PR</a>
          </div>
          <div class="tiny muted">by <b>${escapeHtml(author)}</b> • ${fmtAgo(when)}</div>
        </div>`;
      }).join('') || `<p class="tiny muted">No open PRs.</p>`;

      statusEl.textContent = `Owner: ${owner} • Repo: ${repo}`;
    }catch(err){
      statusEl.textContent = `Error: ${err.message}`;
      commitsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Failed to load commits.</p>`;
      prsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Failed to load PRs.</p>`;
      [kStars,kForks,kPRs,kPush].forEach(el=>el.classList.remove('skeleton'));
    }
  }
}