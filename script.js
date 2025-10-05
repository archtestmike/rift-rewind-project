// =====================
// 1) Contact form -> your contact Lambda
// =====================
const CONTACT_LAMBDA_URL = 'https://uxgn2qacigic7pqq3mwvhg2duq0nkoir.lambda-url.us-east-1.on.aws/'; // keep yours

document.addEventListener('DOMContentLoaded', () => {
  // Contact form
  const contactForm = document.querySelector('.contact-form-container');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.contact-submit-btn');
      const messageDiv = document.getElementById('form-message');

      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      messageDiv.style.display = 'none';

      const formData = {
        name: contactForm.name.value,
        email: contactForm.email.value,
        message: contactForm.message.value
      };

      try {
        const res = await fetch(CONTACT_LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          mode: 'cors',
        });

        if (res.ok) {
          showMessage('Message sent successfully! Thank you for reaching out.', 'success');
          contactForm.reset();
        } else {
          showMessage('Failed to send message. Please try again.', 'error');
        }
      } catch {
        showMessage('Network error. Please check your connection and try again.', 'error');
      } finally {
        submitBtn.textContent = 'Send Message';
        submitBtn.disabled = false;
      }
    });
  }

  // =====================
  // 2) League Lookup -> Riot Lambda
  // =====================
  const RIOT_LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/'; // <-- replace with your Function URL

  const leagueForm = document.getElementById('league-form');
  const statusEl = document.getElementById('lookup-status');
  const champsEl = document.getElementById('champions');

  if (leagueForm) {
    leagueForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.innerHTML = '<span class="loader"></span> Fetching…';
      champsEl.innerHTML = '';

      const region = leagueForm.region.value;
      const riotId = (leagueForm.riot.value || '').trim();
      // Split "GameName#TAG"
      const [gameName, tagLine = 'NA1'] = riotId.split('#');

      if (!gameName) {
        statusEl.textContent = 'Please enter a Riot ID in the form GameName#TAG.';
        return;
      }

      try {
        const res = await fetch(RIOT_LAMBDA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summonerName: gameName,
            tagLine: tagLine,
            region: region
          }),
          mode: 'cors',
        });

        const data = await res.json();

        if (!res.ok) {
          statusEl.textContent = data?.error || 'Lookup failed.';
          return;
        }

        // Render summary
        statusEl.innerHTML = `<span class="badge"><span class="dot"></span> Found: <b>${data.summoner.name}</b></span>`;

        // Render top champions (if any)
        const tops = data.topChampions || [];
        if (!tops.length) {
          champsEl.innerHTML = '<li class="tiny muted">No mastery data returned.</li>';
          return;
        }

        champsEl.innerHTML = tops
          .map((m, i) => {
            const level = m.championLevel ?? '—';
            const points = m.championPoints?.toLocaleString?.() ?? '—';
            return `<li class="badge">#${i + 1} • ChampID ${m.championId} — Level ${level} • ${points} pts</li>`;
          })
          .join('');
      } catch (err) {
        statusEl.textContent = 'Network error.';
      }
    });
  }
});

// Shared tiny helper
function showMessage(text, type) {
  const messageDiv = document.getElementById('form-message');
  if (!messageDiv) return;
  messageDiv.textContent = text;
  messageDiv.className = `form-message ${type}`;
  messageDiv.style.display = 'block';
  setTimeout(() => { messageDiv.style.display = 'none'; }, 10000);
}