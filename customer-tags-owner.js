(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let customerId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-tags-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-tags-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-tags aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER SEGMENTATION</div><h2>Edit customer tags</h2><p>Use short tags to organize follow-up, reactivation, and service-history views. Separate tags with commas.</p><form><label>Tags<textarea name="tags" rows="4" maxlength="520" placeholder="membership, priority, annual-service"></textarea></label><p class="form-hint">Up to 12 tags; each tag must be 2–40 characters.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-tags>Cancel</button><button class="primary-btn" type="submit">Save tags</button></div><p class="form-message" data-tags-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-tags]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!customerId) { message('Select a customer before saving tags.'); return; }
      const form = event.currentTarget;
      const raw = form.elements.tags.value;
      const tags = [...new Set(raw.split(/[\n,]/).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
      if (tags.length > 12 || tags.some((tag) => tag.length < 2 || tag.length > 40)) { message('Use up to 12 tags, each between 2 and 40 characters.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.updateCustomerTags(customerId, tags, crypto.randomUUID());
        message('Customer tags saved.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="customers"]')?.click(); }, 450);
      } catch { message('Could not save customer tags. Check the customer record and your role.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-tags-action="edit"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    customerId = button.dataset.customerId || '';
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    form.elements.tags.value = button.dataset.customerTags || '';
    message('');
    modal.showModal();
    form.elements.tags.focus();
  }, true);
})();
