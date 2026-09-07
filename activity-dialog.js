(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#activity-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'activity-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-activity aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER TIMELINE</div><h2>Log customer note</h2><p>Record a customer-safe timeline note for the team without losing which profile the interaction belongs to.</p><form><label>Customer<select name="customerId" required><option value="">Loading customers…</option></select></label><label>What happened?<textarea name="note" rows="5" maxlength="1000" required placeholder="Summarize the conversation, decision, or next step."></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-activity>Cancel</button><button class="primary-btn" type="submit">Save note</button></div><p class="form-message" data-activity-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-activity-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-activity]').forEach((button) => button.addEventListener('click', close));
  const open = async () => {
    form.reset(); message.textContent = 'Loading customers…';
    const select = form.elements.customerId;
    try {
      const customers = await repository.list('customers');
      select.innerHTML = customers.length ? `<option value="">Choose a customer</option>${customers.map((item) => `<option value="${String(item.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${String(item.name || item.id).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))} · ${String(item.phone || 'No phone').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</option>`).join('')}` : '<option value="">No customers found</option>';
      message.textContent = customers.length ? '' : 'Add a customer before logging a note.';
      dialog.showModal();
      select.focus();
    } catch { message.textContent = 'Could not load customers for timeline logging.'; dialog.showModal(); }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const customer = form.elements.customerId.selectedOptions[0];
    const note = form.elements.note.value.trim();
    if (!customer?.value || !note || note.length > 1000) { message.textContent = 'Choose a customer and enter a note up to 1,000 characters.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving timeline note…';
    try {
      await repository.logActivity(customer.textContent.split(' · ')[0], 'Note', note, customer.value);
      message.textContent = 'Customer note saved.';
      setTimeout(() => { close(); document.querySelector('#activity-view')?.click(); }, 500);
    } catch { message.textContent = 'Could not save the customer note. Confirm activity permission and try again.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#log-activity');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open();
  }, true);
})();
