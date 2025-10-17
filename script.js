const RIOT_API_URL = "https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/";

/* Display names for a few common champion IDs; fallback shows "Champion {id}" */
const CHAMPION_MAP = {
  7: "LeBlanc",
  268: "Azir",
  517: "Sylas",
  1: "Annie",
  103: "Ahri",
  64: "Lee Sin",
  11: "Master Yi",
  81: "Ezreal",
  157: "Yasuo",
  84: "Akali",
  222: "Jinx"
};

/* DDragon filename exceptions + normalizer */
const DDRAGON_FILE = {
  "LeBlanc": "Leblanc",
  "Cho'Gath": "Chogath",
  "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix",
  "Vel'Koz": "Velkoz",
  "Kog'Maw": "KogMaw",
  "Rek'Sai": "RekSai",
  "Bel'Veth": "Belveth",
  "Nunu & Willump": "Nunu",
  "Jarvan IV": "JarvanIV",
  "Wukong": "MonkeyKing",
  "Renata Glasc": "Renata",
  "Dr. Mundo": "DrMundo",
  "Tahm Kench": "TahmKench"
};
function ddragonFileFromName(name) {
  if (!name) return "";
  if (DDRAGON_FILE[name]) return `${DDRAGON_FILE[name]}.png`;
  const clean = name.replace(/['’.&]/g, "").replace(/\s+/g, "").trim();
  return `${clean}.png`;
}
function displayNameFromId(id) {
  return CHAMPION_MAP[id] || `Champion ${id}`;
}

document.addEventListener("DOMContentLoaded", function () {
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

    lookupBtn.textContent = "Looking up...";
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
        showMessage("Summoner found!", "success");
      } else {
        showMessage(data.error || "Failed to fetch data", "error");
      }
    } catch (err) {
      loadingDiv.style.display = "none";
      showMessage("Network error. Try again.", "error");
    }

    lookupBtn.textContent = "Look Up Summoner";
    lookupBtn.disabled = false;
  });

  summonerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") lookupBtn.click();
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

  if (data.topChampions && data.topChampions.length > 0) {
    const champs = data.topChampions.map(c => {
      const champName = displayNameFromId(c.championId);
      const file = ddragonFileFromName(champName);
      const champImg = `https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${file}`;
      return `
        <div class="champion-card">
          <img src="${champImg}" class="champion-img" alt="${champName}"
               onerror="this.onerror=null;this.src='https://ddragon.leagueoflegends.com/cdn/14.18.1/img/profileicon/1.png'">
          <div>
            <h5>${champName}</h5>
            <p>Level ${c.championLevel} • ${Number(c.championPoints || 0).toLocaleString()} pts</p>
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