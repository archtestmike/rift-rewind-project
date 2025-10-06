// Riot API Lambda
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';
// Serverless Metrics Lambda
const METRICS_LAMBDA_URL = 'https://tfapgtyrz75ve4lrye32a3zzfe0zgaft.lambda-url.us-east-1.on.aws/';

document.addEventListener('DOMContentLoaded', () => {
  // Riot Lookup
  const form = document.getElementById('riot-form');
  const results = document.getElementById('riot-results');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    results.innerHTML = '<p class="tiny muted">Fetching data...</p>';
    const riotId = form.riotId.value.trim();
    const region = form.region.value;
    if (!riotId.includes('#')) {
      results.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid format. Use GameName#TAG.</p>';
      return;
    }

    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: riotId, region })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Request failed');

      // build HTML
      const champs = (data.topChampions || []).map(c => `
        <div class="champion">
          <img src="https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/${c.championId}.png" alt="">
          <span>Mastery: ${c.championPoints}</span>
        </div>
      `).join('');
      results.innerHTML = `
        <p><strong>${data.summoner.name}</strong> — Level ${data.summoner.level}</p>
        <div class="champs">${champs}</div>
      `;
    } catch (err) {
      results.innerHTML = `<p class="tiny" style="color:#ff9b9b">${err.message}</p>`;
    }
  });

  // Serverless Insights
  const insights = document.getElementById('insights-content');
  async function loadInsights() {
    try {
      const r = await fetch(METRICS_LAMBDA_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      insights.innerHTML = `
        <div class="metrics">
          <div><b>Function:</b> ${data.function}</div>
          <div><b>Invocations:</b> ${data.metrics.invocations}</div>
          <div><b>Avg Duration:</b> ${data.metrics.avgDurationMs} ms</div>
          <div><b>Window:</b> ${data.windowMinutes} min</div>
        </div>`;
    } catch (e) {
      insights.innerHTML = `<p class="tiny" style="color:#ff9b9b">Metrics unavailable: ${e.message}</p>`;
    }
  }
  loadInsights();
});