(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#job-access-link-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'job-access-link-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-job-access aria-label="Close">×</button><div class="dialog-kicker">SECURE ACCESS</div><h2 id="job-access-title">Job access link</h2><p id="job-access-help">This link is scoped by the server to the selected job and recipient workflow. Share it only with the intended person.</p><form><label>Generated link<input name="url" type="url" readonly /></label><p class="form-message" data-job-access-expiry role="status" aria-live="polite"></p><div class="workflow-actions"><button class="ghost-btn" type="button" data-copy-job-access>Copy link</button><button class="ghost-btn" type="button" data-close-job-access>Close</button></div><p class="form-message" data-job-access-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'job-access-title');
  dialog.setAttribute('aria-describedby', 'job-access-help');
  const form = dialog.querySelector('form');
  const urlInput = form.elements.url;
  const expiry = dialog.querySelector('[data-job-access-expiry]');
  const status = dialog.querySelector('[data-job-access-status]');
  const copy = dialog.querySelector('[data-copy-job-access]');
  dialog.querySelectorAll('[data-close-job-access]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(urlInput.value); status.textContent = 'Link copied.'; } catch { urlInput.select(); status.textContent = 'Copy was unavailable; the link is selected for manual copying.'; } });
  const open = async (button) => {
    const customer = button.dataset.jobAction === 'customer-link';
    dialog.querySelector('#job-access-title').textContent = customer ? 'Customer portal link' : 'Technician job link';
    status.textContent = 'Generating secure link…'; expiry.textContent = ''; urlInput.value = ''; copy.disabled = true; dialog.showModal();
    try { const result = customer ? await repository.customerLink(button.dataset.jobId) : await repository.technicianLink(button.dataset.jobId); const url = new URL(result.url, window.location.href).href; urlInput.value = url; expiry.textContent = result.expiresAt ? `Expires ${new Date(result.expiresAt).toLocaleString()}.` : (result.expiresInHours ? `Expires in ${result.expiresInHours} hours.` : 'Expiry is enforced by the server.'); status.textContent = 'Link ready. Copy it only to the intended recipient.'; copy.disabled = false; urlInput.focus(); urlInput.select(); } catch { status.textContent = customer ? 'Customer link unavailable.' : 'Technician link unavailable. Assign a technician first.'; }
  };
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-job-action="link"], [data-job-action="customer-link"]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void open(button); }, true);
})();
