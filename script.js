// Contact form handler - Sends form data to AWS Lambda
const LAMBDA_URL = 'https://qhn53vmz4dsaf34lowcbnao3ya0ncvem.lambda-url.us-east-1.on.aws/'; // Replace with your Function URL

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.contact-form-container');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = form.querySelector('.contact-submit-btn');
    const messageDiv = document.getElementById('form-message');

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    if (messageDiv) messageDiv.style.display = 'none';

    const formData = { name: form.name.value, email: form.email.value, message: form.message.value };

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage('Message sent successfully! Thank you for reaching out.', 'success');
        form.reset();
      } else {
        showMessage('Failed to send message. Please try again.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please check your connection and try again.', 'error');
    }

    submitBtn.textContent = 'Send Message';
    submitBtn.disabled = false;
  });
});

function showMessage(text, type) {
  const messageDiv = document.getElementById('form-message');
  if (!messageDiv) return;
  messageDiv.textContent = text;
  messageDiv.className = `form-message ${type}`;
  messageDiv.style.display = 'block';
  setTimeout(() => { messageDiv.style.display = 'none'; }, 10000);
}