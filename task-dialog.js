(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#task-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'task-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-task aria-label="Close">×</button><div class="dialog-kicker">TODAY’S FOCUS</div><h2>Add a task</h2><p>Capture the next owner action with enough context for the team to pick it up later.</p><form><label>Task title<input name="title" type="text" maxlength="160" required value="Follow up with a customer" /></label><label>Detail <span>(optional)</span><textarea name="detail" rows="4" maxlength="1000" placeholder="What needs to happen next?"></textarea></label><label>Due date <span>(optional)</span><input name="dueAt" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-task>Cancel</button><button class="primary-btn" type="submit">Add task</button></div><p class="form-message" data-task-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-task-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-task]').forEach((button) => button.addEventListener('click', close));
  const open = () => { form.reset(); form.elements.title.value = 'Follow up with a customer'; message.textContent = ''; dialog.showModal(); form.elements.title.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const title = form.elements.title.value.trim();
    const detail = form.elements.detail.value.trim();
    const dueAt = form.elements.dueAt.value;
    if (!title || title.length > 160 || detail.length > 1000 || (dueAt && !/^\d{4}-\d{2}-\d{2}$/.test(dueAt))) { message.textContent = 'Enter a title up to 160 characters and a valid optional due date.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving task…';
    try {
      await repository.createTask(title, detail, dueAt ? `${dueAt}T12:00:00.000Z` : '');
      message.textContent = 'Task added to today’s focus.';
      setTimeout(close, 500);
      window.northstarRefreshFocus?.();
    } catch { message.textContent = 'Could not add the task. Confirm task permission and try again.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.add-task');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open();
  }, true);
})();
