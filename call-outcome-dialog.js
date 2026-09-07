(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#call-outcome-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'call-outcome-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-call-outcome aria-label="Close">×</button><div class="dialog-kicker">CALL CENTER</div><h2>Record call outcome</h2><p>Classify the conversation so follow-up, booking conversion, and missed-call recovery remain visible to the owner team.</p><form><label>Outcome<select name="outcome" required><option>New lead</option><option>Booked</option><option selected>Resolved</option><option>No answer</option><option>Wrong number</option></select></label><label>Outcome note <span>(optional)</span><textarea name="note" rows="4" maxlength="300" placeholder="Customer need, next step, or recovery note"></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-call-outcome>Cancel</button><button class="primary-btn" type="submit">Save outcome</button></div><p class="form-message" data-call-outcome-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-call-outcome-message]');
  let callId = '';
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-call-outcome]').forEach((button) => button.addEventListener('click', close));
  const open = (id) => { callId = id; form.reset(); form.elements.outcome.value = 'Resolved'; message.textContent = ''; dialog.showModal(); form.elements.outcome.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving…';
    try {
      const result = await repository.updateCallOutcome(callId, form.elements.outcome.value, form.elements.note.value.trim(), crypto.randomUUID());
      message.textContent = result.duplicate ? 'This call outcome was already recorded.' : 'Call outcome recorded.';
      setTimeout(() => { close(); document.querySelector('[data-view="calls"]')?.click(); }, 350);
    } catch { message.textContent = 'Could not record the call outcome. Confirm owner or dispatcher access.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-call-outcome]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(button.dataset.callOutcome);
  }, true);
})();
