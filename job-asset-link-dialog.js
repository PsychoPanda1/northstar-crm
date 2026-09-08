(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#job-asset-link-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'job-asset-link-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-job-asset-link aria-label="Close">×</button><div class="dialog-kicker">EQUIPMENT HISTORY</div><h2 id="job-asset-link-title">Link equipment to job</h2><p id="job-asset-link-help">Choose equipment already attached to this customer so future warranty and service history stay connected.</p><form><label>Customer equipment<select name="assetId" required><option value="">Loading equipment…</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-job-asset-link>Cancel</button><button class="primary-btn" type="submit">Link equipment</button></div><p class="form-message" data-job-asset-link-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'job-asset-link-title');
  dialog.setAttribute('aria-describedby', 'job-asset-link-help');
  const form = dialog.querySelector('form');
  const select = form.elements.assetId;
  const status = dialog.querySelector('[data-job-asset-link-status]');
  const submit = form.querySelector('[type="submit"]');
  let jobId = '';
  dialog.querySelectorAll('[data-close-job-asset-link]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = async (button) => {
    jobId = button.dataset.linkJobAsset || ''; form.reset(); submit.disabled = true; status.textContent = 'Loading customer equipment…'; select.innerHTML = '<option value="">Loading equipment…</option>'; dialog.showModal();
    try {
      const detail = await repository.getJobDetail(jobId);
      const profile = detail.customer?.id ? await repository.getCustomerProfile(detail.customer.id) : null;
      const assets = profile?.assets || [];
      select.innerHTML = assets.length ? `<option value="">Choose equipment</option>${assets.map((item) => `<option value="${esc(item.id)}">${esc(item.name)} · ${esc(item.serial || 'Serial not recorded')}</option>`).join('')}` : '<option value="">No customer equipment</option>';
      status.textContent = assets.length ? '' : 'Add customer equipment before linking it to this job.'; submit.disabled = !assets.length; select.focus();
    } catch { status.textContent = 'Could not load equipment for this job.'; }
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity() || !jobId || !select.value) return; submit.disabled = true; status.textContent = 'Linking equipment…'; try { await repository.linkJobAsset(jobId, select.value); dialog.close(); showToast('Equipment linked to job.'); openRecords('dispatch'); } catch { status.textContent = 'Could not link equipment to this job. Confirm the job and customer scope.'; submit.disabled = false; } });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-link-job-asset]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
