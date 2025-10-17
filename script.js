const RIOT_API_URL = "https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/";
const CHAMPION_MAP = {
  7: "LeBlanc", 268: "Azir", 517: "Sylas", 1: "Annie", 103: "Ahri", 64: "LeeSin",
  11: "MasterYi", 81: "Ezreal", 157: "Yasuo", 84: "Akali", 222: "Jinx"
};

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
      const champName = CHAMPION_MAP[c.championId] || `Champion ${c.championId}`;
      const champImg = `https://ddragon.leagueoflegends.com/cdn/14.18.1/img/champion/${champName.replace(/[^a-zA-Z]/g,"")}.png`;
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