(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let jobId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-completion-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'job-complete-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-completion aria-label="Close">×</button><div class="dialog-kicker">JOB CLOSEOUT</div><h2>Complete job</h2><p>Capture the customer-ready completion note before the job moves into invoicing and follow-up.</p><form><label>Completion note<textarea name="note" rows="5" maxlength="500" minlength="3" required placeholder="Work completed and customer briefed."></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-completion>Cancel</button><button class="primary-btn" type="submit">Complete job</button></div><p class="form-message" data-completion-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-completion]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const note = form.elements.note.value.trim();
      if (!jobId || note.length < 3 || note.length > 500) { message('Enter a completion note between 3 and 500 characters.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Completing…');
      try {
        await repository.completeJob(jobId, note, crypto.randomUUID());
        message('Job completed.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="dispatch"]')?.click(); }, 450);
      } catch { message('Could not complete the job. Check the technician, clock, checklist, and required forms.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-job-action="complete"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    jobId = button.dataset.jobId || '';
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    form.elements.note.value = 'Work completed and customer briefed.';
    message('');
    modal.showModal();
    form.elements.note.focus();
  }, true);
})();
