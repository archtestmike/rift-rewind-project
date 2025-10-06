// ========= Riot API Lookup =========
const lookupBtn = document.getElementById('lookupBtn');
const regionSel = document.getElementById('region');
const summonerInput = document.getElementById('summoner');
const resultBox = document.getElementById('result');
const recent = document.getElementById('recent');

const LAMBDA_URL = "https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/";

lookupBtn?.addEventListener("click", async () => {
  const summonerName = summonerInput.value.trim();
  const region = regionSel.value;
  if (!summonerName) {
    resultBox.innerHTML = `<p class="muted">Please enter a Riot ID in GameName#TAG format.</p>`;
    return;
  }

  recent.innerHTML = `Recent: <a href="#">${summonerName}</a>`;
  resultBox.innerHTML = `<p class="muted">Fetching data...</p>`;

  const start = performance.now();
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summonerName, region }),
    });
    const latency = Math.round(performance.now() - start);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Error fetching summoner data");

    const champs = data.topChampions.map(c => `
      <div class="champ-card">
        <p><strong>Champion ID ${c.championId}</strong></p>
        <p>Mastery Lv ${c.championLevel}</p>
        <p>${c.championPoints.toLocaleString()} pts</p>
      </div>
    `).join("");

    resultBox.innerHTML = `
      <p><strong>Summoner:</strong> ${data.summoner.name}</p>
      <p>Level ${data.summoner.level}</p>
      <p>Fetched in ${latency} ms via AWS Lambda (${region})</p>
      ${champs}
    `;
  } catch (err) {
    resultBox.innerHTML = `<p class="muted">Lambda error: ${err.message}</p>`;
  }
});