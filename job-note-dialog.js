(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#job-note-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'job-note-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-job-note aria-label="Close">×</button><div class="dialog-kicker">DISPATCH HANDOFF</div><h2 id="job-note-title">Add internal job note</h2><p id="job-note-help">Share access details and field context with the assigned technician or dispatcher. This note is internal and is not shown to customers.</p><form><label>Internal note<textarea name="note" rows="6" maxlength="1000" required placeholder="Gate code, equipment location, safety detail, or next step…"></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-job-note>Cancel</button><button class="primary-btn" type="submit">Save note</button></div><p class="form-message" data-job-note-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'job-note-title');
  dialog.setAttribute('aria-describedby', 'job-note-help');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-job-note-status]');
  const submit = form.querySelector('[type="submit"]');
  let jobId = '';
  dialog.querySelectorAll('[data-close-job-note]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button) => { jobId = button.dataset.jobNote || ''; form.reset(); status.textContent = ''; submit.disabled = false; dialog.showModal(); form.elements.note.focus(); };
  form.addEventListener('submit', async (event) => { event.preventDefault(); if (!form.reportValidity()) return; const note = form.elements.note.value.trim(); if (!jobId || !note || note.length > 1000) { status.textContent = 'Enter an internal note up to 1,000 characters.'; return; } submit.disabled = true; status.textContent = 'Saving internal note…'; try { await repository.addJobNote(jobId, note); dialog.close(); showToast('Internal job note saved.'); openRecords('dispatch'); } catch { status.textContent = 'Could not save the job note. Confirm the job and your dispatch permission.'; submit.disabled = false; } });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-job-note]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
