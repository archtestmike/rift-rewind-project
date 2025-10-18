const RIOT_API_URL = "https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/";

const CHAMPION_MAP = {
  7: "LeBlanc", 268: "Azir", 517: "Sylas", 1: "Annie", 103: "Ahri",
  64: "Lee Sin", 11: "Master Yi", 81: "Ezreal", 157: "Yasuo", 84: "Akali", 222: "Jinx"
};
const DDRAGON_FILE = {
  "LeBlanc": "Leblanc", "Cho'Gath": "Chogath", "Kai'Sa": "Kaisa", "Kha'Zix": "Khazix",
  "Vel'Koz": "Velkoz", "Kog'Maw": "KogMaw", "Rek'Sai": "RekSai", "Bel'Veth": "Belveth",
  "Nunu & Willump": "Nunu", "Jarvan IV": "JarvanIV", "Wukong": "MonkeyKing",
  "Renata Glasc": "Renata", "Dr. Mundo": "DrMundo", "Tahm Kench": "TahmKench"
};
function ddragonFileFromName(name) {
  if (!name) return '';
  if (DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean = name.replace(/['’.&]/g, '').replace(/\s+/g, '').trim();
  return `${clean}.png`;
}

document.addEventListener("DOMContentLoaded", function () {
  animateParticles();
  typeEffect();

  const lookupBtn = document.getElementById("lookup-btn");
  const summonerInput = document.getElementById("summoner-name");
  const regionSelect = document.getElementById("region");

  lookupBtn.addEventListener("click", async () => {
    const summonerName = summonerInput.value.trim();
    const region = regionSelect.value;
    const messageDiv = document.getElementById("lookup-message");
    const resultsDiv = document.getElementById("summoner-results");
    const loadingDiv = document.getElementById("loading");

    if (!summonerName || !summonerName.includes("#")) {
      showMessage("Please use Riot ID format: GameName#TAG", "error");
      return;
    }

    lookupBtn.textContent = "Summoning...";
    lookupBtn.disabled = true;
    messageDiv.style.display = "none";
    resultsDiv.style.display = "none";
    loadingDiv.style.display = "block";

    try {
      const response = await fetch(RIOT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summonerName, region }),
      });

      const data = await response.json();
      loadingDiv.style.display = "none";

      if (response.ok) {
        displaySummonerData(data);
        showMessage("Summoner data retrieved!", "success");
      } else {
        showMessage(data.error || "Failed to fetch data", "error");
      }
    } catch {
      loadingDiv.style.display = "none";
      showMessage("Network error. Try again.", "error");
    }

    lookupBtn.textContent = "Summon Data";
    lookupBtn.disabled = false;
  });
});

function displaySummonerData(data) {
  const resultsDiv = document.getElementById("summoner-results");
  const summonerInfo = document.getElementById("summoner-info");
  const championMastery = document.getElementById("champion-mastery");

  summonerInfo.innerHTML = `
    <div class="summoner-card">
      <h5>${data.summoner.name}</h5>
      <p>Level: ${data.summoner.level}</p>
    </div>
  `;

  if (data.topChampions?.length) {
    const champs = data.topChampions.map(c => {
      const champName = CHAMPION_MAP[c.championId] || `Champion ${c.championId}`;
      const img = ddragonFileFromName(champName);
      const champImg = `https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${img}`;
      return `
        <div class="champion-card">
          <img src="${champImg}" class="champion-img" alt="${champName}">
          <div>
            <h5>${champName}</h5>
            <p>Level ${c.championLevel} • ${c.championPoints.toLocaleString()} pts</p>
          </div>
        </div>`;
    }).join("");
    championMastery.innerHTML = `<h5>Top Champions</h5><div class="champions-grid">${champs}</div>`;
  } else {
    championMastery.innerHTML = "<p>No champion mastery data found.</p>";
  }

  resultsDiv.style.display = "block";
}

function showMessage(text, type) {
  const div = document.getElementById("lookup-message");
  div.textContent = text;
  div.className = `lookup-message ${type}`;
  div.style.display = "block";
  setTimeout(() => (div.style.display = "none"), 8000);
}

/* Particle background animation */
function animateParticles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let w, h;
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2 + 1,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4
  }));

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x