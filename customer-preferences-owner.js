(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let customerId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-preferences-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-preferences-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-preferences aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER COMMUNICATIONS</div><h2>Contact preferences</h2><p>Honor the customer’s channel choices before reminders, updates, and follow-up messages are queued.</p><form><label class="checkbox-row"><input name="smsOptOut" type="checkbox" /> Opt out of SMS</label><label class="checkbox-row"><input name="emailOptOut" type="checkbox" /> Opt out of email</label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-preferences>Cancel</button><button class="primary-btn" type="submit">Save preferences</button></div><p class="form-message" data-preferences-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-preferences]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!customerId) { message('Select a customer before saving preferences.'); return; }
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.updateCustomerPreferences(customerId, { smsOptOut: form.elements.smsOptOut.checked, emailOptOut: form.elements.emailOptOut.checked });
        message('Contact preferences saved.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="customers"]')?.click(); }, 450);
      } catch { message('Could not save contact preferences. Check the customer record and your role.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-preferences-action="edit"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    customerId = button.dataset.customerId || '';
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    form.elements.smsOptOut.checked = button.dataset.smsOptOut === 'true';
    form.elements.emailOptOut.checked = button.dataset.emailOptOut === 'true';
    message('');
    modal.showModal();
    form.elements.smsOptOut.focus();
  }, true);
})();
