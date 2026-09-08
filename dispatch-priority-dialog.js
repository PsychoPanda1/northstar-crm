(() => {
  const recordList = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!recordList || !repository) return;

  let dialog;
  let jobId = '';
  const message = (text) => { const node = dialog?.querySelector('[data-priority-message]'); if (node) node.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'workflow-dialog';
    dialog.id = 'dispatch-priority-dialog';
    dialog.innerHTML = '<button class="dialog-close" type="button" data-close-priority aria-label="Close">×</button><div class="dialog-kicker">DISPATCH PRIORITY</div><h2>Set job priority</h2><p>Priority changes the dispatch queue order and highlights urgent work for the owner and field team.</p><form><label>Priority<select name="priority" required><option>Low</option><option>Normal</option><option>High</option><option>Emergency</option></select></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-priority>Cancel</button><button class="primary-btn" type="submit">Save priority</button></div><p class="form-message" data-priority-message role="status" aria-live="polite"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-priority]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!jobId || !['Low', 'Normal', 'High', 'Emergency'].includes(form.elements.priority.value)) { message('Choose a valid job priority.'); return; }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message('Saving…');
      try {
        await repository.updateJobPriority(jobId, form.elements.priority.value);
        message('Priority saved.');
        setTimeout(() => { dialog.close(); document.querySelector('[data-view="dispatch"]')?.click(); }, 450);
      } catch { message('Could not update priority. Completed, canceled, and no-show jobs cannot be changed.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-job-action="priority"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    jobId = button.dataset.jobId || '';
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    form.elements.priority.value = button.dataset.jobPriority || 'Normal';
    message('');
    modal.showModal();
    form.elements.priority.focus();
  }, true);
})();
