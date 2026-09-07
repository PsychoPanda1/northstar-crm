(() => {
  const repository = window.northstarRepository;
  const list = document.querySelector('#record-list');
  if (!repository || !list) return;
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const example = [{ formName: 'Safety inspection', fields: [{ id: 'panel_condition', label: 'Panel condition', type: 'select', required: true, options: ['Good', 'Needs repair'] }, { id: 'repair_note', label: 'Repair note', type: 'text', required: true, showWhen: { fieldId: 'panel_condition', equals: 'Needs repair' } }] }];
  const toast = (message) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = message; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 2800); };
  const dialog = document.createElement('dialog');
  dialog.id = 'structured-form-editor';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = `<button class="dialog-close" type="button" data-close-structured-form aria-label="Close">×</button><div class="dialog-kicker">PRICEBOOK WORKFLOW</div><h2>Configure technician forms</h2><p>Define bounded fields that travel with new jobs. Conditional fields use <code>showWhen</code> and are enforced again on the server.</p><form><label>Form definitions (JSON)<textarea name="formDefinitions" rows="16" spellcheck="false" required></textarea></label><p class="form-message" role="status" aria-live="polite"></p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-structured-form>Cancel</button><button class="primary-btn" type="submit">Save forms</button></div></form>`;
  document.body.append(dialog);
  dialog.querySelectorAll('[data-close-structured-form]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  let activeId = '';
  const open = async (button) => {
    activeId = button.dataset.catalogForms;
    const form = dialog.querySelector('form');
    const message = form.querySelector('.form-message');
    const textarea = form.elements.formDefinitions;
    button.disabled = true; message.textContent = 'Loading current definitions…';
    try {
      const response = await fetch(`/api/catalog/${encodeURIComponent(activeId)}/forms`, { headers: { authorization: `Bearer ${repository.token || ''}` } });
      if (!response.ok) throw new Error('load_failed');
      const current = await response.json();
      textarea.value = JSON.stringify(current.formDefinitions?.length ? current.formDefinitions : example, null, 2);
      message.textContent = 'Use text, number, select, boolean, or date fields. Save validates the server contract.';
      dialog.showModal(); textarea.focus(); textarea.select();
    } catch { toast('Could not load the pricebook forms.'); }
    finally { button.disabled = false; }
  };
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget; const message = form.querySelector('.form-message'); const button = form.querySelector('[type="submit"]');
    let definitions;
    try { definitions = JSON.parse(form.elements.formDefinitions.value); } catch { message.textContent = 'Enter valid JSON before saving.'; return; }
    if (!Array.isArray(definitions)) { message.textContent = 'The top-level value must be an array of form definitions.'; return; }
    button.disabled = true; message.textContent = 'Saving…';
    try {
      const response = await fetch(`/api/catalog/${encodeURIComponent(activeId)}/forms`, { method: 'PATCH', headers: { authorization: `Bearer ${repository.token || ''}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ formDefinitions: definitions }) });
      if (!response.ok) throw new Error('save_failed');
      dialog.close(); toast('Structured technician forms saved.');
      document.querySelector('[data-view="catalog"]')?.click();
    } catch { message.textContent = 'The server rejected these definitions. Check field ids, types, options, and conditional rules.'; }
    finally { button.disabled = false; }
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-catalog-forms]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(button);
  }, true);
})();
