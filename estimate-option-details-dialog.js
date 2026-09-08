(() => {
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!list || !repository?.list || !repository?.updateEstimateOptionDetails || document.querySelector('#estimate-option-details-dialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'estimate-option-details-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-estimate-options aria-label="Close">×</button><div class="dialog-kicker">ESTIMATE SCOPE</div><h2>Package details</h2><p>Define the included work for each estimate option. These details remain attached to the estimate package for owner and customer review.</p><form><div data-estimate-options-list></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-estimate-options>Cancel</button><button class="primary-btn" type="submit">Save package details</button></div><p class="form-message" data-estimate-options-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const optionsTarget = dialog.querySelector('[data-estimate-options-list]');
  const message = dialog.querySelector('[data-estimate-options-message]');
  let estimateId = '';
  let activeButton;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const open = async (button) => {
    activeButton = button; estimateId = button.dataset.estimateOptionDetails; optionsTarget.innerHTML = '<p class="muted">Loading estimate packages…</p>'; message.textContent = ''; dialog.showModal();
    try {
      const estimate = (await repository.list('estimates')).find((item) => item.id === estimateId);
      if (!estimate?.options?.length) throw new Error('options unavailable');
      optionsTarget.innerHTML = estimate.options.map((option, index) => `<label>Included work for ${escape(option.label || `Option ${index + 1}`)} <span>(one item per line)</span><textarea name="option_${escape(option.id || index)}" data-estimate-option-id="${escape(option.id || index)}" rows="4" maxlength="2000">${escape((option.items || []).join('\n'))}</textarea></label>`).join('');
      message.textContent = '';
      optionsTarget.querySelector('textarea')?.focus();
    } catch { optionsTarget.innerHTML = '<p class="muted">Estimate packages could not be loaded.</p>'; message.textContent = 'Could not load package details. Confirm the estimate is still available.'; }
  };
  dialog.querySelectorAll('[data-close-estimate-options]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const entries = [...optionsTarget.querySelectorAll('[data-estimate-option-id]')];
    if (!estimateId || !entries.length) { message.textContent = 'No estimate packages are available to update.'; return; }
    const options = entries.map((textarea) => ({ id: textarea.dataset.estimateOptionId, items: textarea.value.split('\n').map((item) => item.trim()).filter(Boolean) }));
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; if (activeButton) activeButton.disabled = true; message.textContent = 'Saving package details…';
    try { await repository.updateEstimateOptionDetails(estimateId, options); message.textContent = 'Estimate package details saved.'; setTimeout(() => { dialog.close(); document.querySelector('#drawer-refresh')?.click(); }, 400); }
    catch { message.textContent = 'Could not save package details. Confirm owner access and estimate status.'; submit.disabled = false; if (activeButton) activeButton.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-estimate-option-details]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
