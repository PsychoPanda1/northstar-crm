(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#dispatch-date-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-date-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-dispatch-date aria-label="Close">×</button><div class="dialog-kicker">DISPATCH</div><h2 id="dispatch-date-title">Open dispatch day</h2><p id="dispatch-date-help">Choose the service day to load for this workspace.</p><form><label>Dispatch date<input name="date" type="date" required /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-dispatch-date>Cancel</button><button class="primary-btn" type="submit">Open day</button></div><p class="form-message" data-dispatch-date-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'dispatch-date-title');
  dialog.setAttribute('aria-describedby', 'dispatch-date-help');
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-dispatch-date-status]');
  const submit = form.querySelector('[type="submit"]');
  const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  dialog.querySelectorAll('[data-close-dispatch-date]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = () => { form.reset(); form.elements.date.value = today(); status.textContent = ''; submit.disabled = false; dialog.showModal(); form.elements.date.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true; status.textContent = 'Loading dispatch…';
    try {
      const result = await repository.listDispatchForDate(form.elements.date.value);
      const team = await repository.list('team');
      drawerTitle.textContent = `Dispatch · ${result.date}`;
      renderDispatchBoard(result.items, team);
      decorateDispatchWorkload(result.items);
      decorateDispatchRecommendations();
      decorateDispatchNotifications();
      decorateDispatchChecklists();
      decorateDispatchDetails();
      dialog.close();
    } catch { status.textContent = 'Could not load that dispatch date. Choose a valid service day and try again.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#dispatch-date-view');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); open();
  }, true);
})();
