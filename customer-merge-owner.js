(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;
  let dialog;
  let activeTargetId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-merge-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'customer-merge-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-merge aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER DATA QUALITY</div><h2>Merge duplicate customer</h2><p>Keep the current profile as canonical and move linked jobs, invoices, messages, and history from the duplicate into it.</p><form><label>Duplicate customer<select name="mergeCustomerId" required><option value="">Loading customers…</option></select></label><label class="checkbox-row"><input name="confirm" type="checkbox" required /> I understand the duplicate record will be retained as merged.</label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-merge>Cancel</button><button class="primary-btn" type="submit">Merge records</button></div><p class="form-message" data-merge-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-merge]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = dialog.querySelector('form');
      if (!form.reportValidity() || !activeTargetId || form.elements.mergeCustomerId.value === activeTargetId) return;
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message('Merging customer history…');
      try {
        const result = await repository.mergeCustomer(activeTargetId, form.elements.mergeCustomerId.value);
        message(`${result.reassigned || 0} linked record${result.reassigned === 1 ? '' : 's'} reassigned. Duplicate retained as merged.`);
        setTimeout(() => dialog.close(), 700);
      } catch { message('Could not merge customers. Confirm both records belong to this workspace and are not already merged.'); submit.disabled = false; }
    });
    return dialog;
  };
  const open = async (button) => {
    activeTargetId = button.dataset.customerMerge;
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    const select = form.elements.mergeCustomerId;
    button.disabled = true;
    message('Loading customers in this workspace…');
    try {
      const customers = (await repository.list('customers')).filter((item) => item.id !== activeTargetId && item.status !== 'Merged');
      select.innerHTML = customers.length ? `<option value="">Choose a duplicate</option>${customers.map((item) => `<option value="${String(item.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${String(item.name || item.id).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))} · ${String(item.phone || 'No phone').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</option>`).join('')}` : '<option value="">No merge candidates</option>';
      form.elements.confirm.checked = false;
      message(customers.length ? '' : 'No eligible duplicate customers were found.');
      modal.showModal();
      select.focus();
    } catch { message('Could not load customers for merging.'); modal.showModal(); }
    finally { button.disabled = false; }
  };
  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-customer-merge]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(button);
  }, true);
})();
