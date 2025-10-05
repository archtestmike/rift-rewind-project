// === Riot API Lambda integration ===
const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/';

// UI regions → platform routing codes your Lambda expects
const REGION_CODE = {
  'na1': 'na1', 'euw1': 'euw1', 'eun1': 'eun1', 'kr': 'kr',
  'br1': 'br1', 'la1': 'la1', 'la2': 'la2', 'oc1': 'oc1',
  'tr1': 'tr1', 'ru': 'ru', 'jp1': 'jp1'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('riot-form');
  const resultsEl = document.getElementById('riot-results');
  if (!form || !resultsEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = '<p class="tiny muted">Fetching…</p>';

    const riotId = (form.riotId.value || '').trim();
    const platform = REGION_CODE[form.region.value];

    // Expect Riot ID as GameName#TAG (send EXACTLY this to Lambda)
    if (!riotId.includes('#')) {
      resultsEl.innerHTML = '<p class="tiny" style="color:#ff9b9b">Invalid Riot ID. Use <b>GameName#TAG</b>.</p>';
      return;
    }

    try {
      const resp = await fetch(RIOT_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ⬇️ send the FULL riotId in "summonerName" exactly as Lambda expects
        body: JSON.stringify({ summonerName: riotId, region: platform })
      });

      if (!resp.ok) {
        const text = await resp.text();
        resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Lambda error (${resp.status}): ${escapeHtml(text || 'Request failed')}</p>`;
        return;
      }

      const data = await resp.json();
      resultsEl.innerHTML = `
        <pre style="white-space:pre-wrap; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); padding:12px; border-radius:12px; max-height:260px; overflow:auto;">
${escapeHtml(JSON.stringify(data, null, 2))}
        </pre>
      `;
    } catch (err) {
      resultsEl.innerHTML = `<p class="tiny" style="color:#ff9b9b">Network error: ${escapeHtml(err.message)}</p>`;
    }
  });
});

// Simple HTML escape for <pre> output
function escapeHtml(s) {
  return s.replace(/[&<>"'`=\/]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
  }[c]));
}