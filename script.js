const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

document.addEventListener('DOMContentLoaded', () => {
  const riotIdEl = document.getElementById('riotId');
  const regionEl = document.getElementById('region');
  const resultsEl = document.getElementById('riot-results');
  const btn = document.getElementById('lookup-btn');
  const recentLink = document.getElementById('recent-link');

  const recent = localStorage.getItem('recentRiotId');
  if (recent) {
    recentLink.textContent = recent;
    recentLink.style.display = 'inline';
    recentLink.onclick = e => {
      e.preventDefault();
      riotIdEl.value = recent;
    };
  }

  btn.onclick = async () => {
    resultsEl.innerHTML = `<p class="tiny muted">Fetching...</p>`;
    const riotId = riotIdEl.value.trim();
    const region = regionEl.value;
    if (!riotId.includes('#')) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use GameName#TAG</p>`;
      return;
    }

    const start = performance.now();
    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({summonerName: riotId, region})
      });

      const ms = Math.round(performance.now() - start);
      if (!resp.ok) {
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${await resp.text()}</p>`;
        return;
      }

      const data = await resp.json();
      localStorage.setItem('recentRiotId', riotId);
      recentLink.textContent = riotId;
      recentLink.style.display = 'inline';

      renderResults(data, ms);
    } catch (e) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Error: ${e.message}</p>`;
    }
  };

  function renderResults(data, ms) {
    const summ = data?.summoner || {};
    const champs = data?.topChampions || [];
    const rows = champs.map(c => `
      <div class="panel" style="margin-top:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>Champion ID</strong> ${c.championId}</div>
          <div class="pill">Mastery Lv ${c.championLevel}</div>
          <div style="color:#a7b7ff;font-weight:600;">${c.championPoints.toLocaleString()} pts</div>
        </div>
      </div>
    `).join('');

    resultsEl.innerHTML = `
      <div class="panel">
        <h3>Summoner: ${summ.name || '—'}</h3>
        <p>Fetched in ${ms} ms via AWS Lambda (us-east-1)</p>
        ${rows || '<p class="tiny muted">No data.</p>'}
      </div>
    `;
  }
});