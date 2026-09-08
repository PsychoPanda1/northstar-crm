(() => {
  const tokenFromUrl = new URLSearchParams(window.location.search).get('token') || '';
  if (!tokenFromUrl || document.querySelector('#customer-estimate-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'customer-estimate-dialog'; dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-action aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER SELF-SERVICE</div><h2 data-estimate-action-title>Review estimate</h2><p data-estimate-action-help></p><form><div data-estimate-action-fields></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-action>Cancel</button><button class="primary-btn" type="submit" data-estimate-action-submit>Continue</button></div><p class="form-message" data-estimate-action-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'customer-estimate-dialog-title');
  dialog.setAttribute('aria-describedby', 'customer-estimate-dialog-help');
  dialog.querySelector('[data-estimate-action-title]').id = 'customer-estimate-dialog-title';
  dialog.querySelector('[data-estimate-action-help]').id = 'customer-estimate-dialog-help';
  const form = dialog.querySelector('form'); const fields = dialog.querySelector('[data-estimate-action-fields]'); const title = dialog.querySelector('[data-estimate-action-title]'); const help = dialog.querySelector('[data-estimate-action-help]'); const status = dialog.querySelector('[data-estimate-action-status]'); const submit = dialog.querySelector('[data-estimate-action-submit]');
  dialog.querySelectorAll('[data-close-estimate-action]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button) => {
    const action = button.dataset.action; if (!['approve', 'decline', 'request-change'].includes(action)) return;
    const selectedOption = button.closest('.row')?.querySelector('input[type="radio"]:checked')?.value || '';
    dialog.dataset.action = action; dialog.dataset.token = button.dataset.token || ''; dialog.dataset.optionId = selectedOption; status.textContent = ''; submit.disabled = false;
    title.textContent = action === 'approve' ? 'Approve estimate' : action === 'request-change' ? 'Request estimate changes' : 'Decline estimate';
    help.textContent = action === 'approve' ? 'Confirm your name and the selected package, if applicable.' : 'Tell the service office what should happen next.';
    fields.innerHTML = action === 'approve' ? '<label>Your name<input name="approverName" maxlength="120" minlength="2" autocomplete="name" required /></label>' : `<label>${action === 'request-change' ? 'What would you like changed?' : 'Why are you declining this estimate?'}<textarea name="reason" rows="5" maxlength="500" minlength="3" required></textarea></label>`;
    submit.textContent = action === 'approve' ? 'Approve estimate' : action === 'request-change' ? 'Request changes' : 'Decline estimate'; dialog.showModal(); fields.querySelector('input, textarea')?.focus();
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const action = dialog.dataset.action; const token = dialog.dataset.token; const data = new FormData(form); const approverName = String(data.get('approverName') || '').trim(); const reason = String(data.get('reason') || '').trim();
    if (action === 'approve' && approverName.length < 2) { status.textContent = 'Enter your name to approve this estimate.'; return; }
    if (action !== 'approve' && reason.length < 3) { status.textContent = 'Add at least three characters so the service office understands your response.'; return; }
    const payload = action === 'approve' ? { ...(dialog.dataset.optionId ? { optionId: dialog.dataset.optionId } : {}), approverName } : { reason };
    submit.disabled = true; status.textContent = 'Saving…';
    try { const response = await fetch(`/api/public/estimate/${action}?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': globalThis.northstarPortalRetryKey?.(`estimate-${action}`, payload) || globalThis.crypto?.randomUUID?.() || `estimate-${action}-${Date.now()}` }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(); dialog.close(); const message = document.querySelector('#message'); if (message) message.textContent = action === 'approve' ? 'Estimate approved.' : action === 'request-change' ? 'Change request sent.' : 'Estimate declined.'; window.location.reload(); } catch { status.textContent = 'That estimate response could not be saved. Please try again.'; } finally { submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-action="approve"], [data-action="decline"], [data-action="request-change"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
