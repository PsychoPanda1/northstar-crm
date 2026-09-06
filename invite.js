const form = document.querySelector('#invite-form');
const message = document.querySelector('#invite-message');
const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const password = String(data.get('password') || '');
  const confirmPassword = String(data.get('confirmPassword') || '');
  if (!token) { message.textContent = 'This invitation link is missing its access token.'; return; }
  if (password !== confirmPassword) { message.textContent = 'Passwords do not match.'; return; }
  message.textContent = 'Creating your secure account…';
  try {
    const response = await fetch('/api/auth/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'invite_accept_failed');
    sessionStorage.setItem('northstar_session_token', body.token);
    window.location.href = `/portal?service=${encodeURIComponent(params.get('service') || 'default')}`;
  } catch (error) {
    message.textContent = error.message === 'invite_expired_or_invalid' ? 'This invitation is expired or no longer valid. Ask the workspace owner for a new invite.' : 'We could not finish setup. Check the password and try again.';
  }
});
