(function () {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#request-workflow-dialog')) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.id = 'request-workflow-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-request-dialog aria-label="Close">×</button><div class="dialog-kicker">CUSTOMER REQUEST</div><h2 data-request-dialog-title>Update request</h2><p data-request-dialog-help>Keep the customer queue moving with an auditable next step.</p><form><label data-request-assignee-field>Assign to<select name="assignedTo" required><option value="">Loading team…</option></select></label><label data-request-priority-field>Priority<select name="priority"><option>Low</option><option selected>Normal</option><option>High</option><option>Urgent</option></select></label><label data-request-channel-field>Channel<select name="channel"><option>SMS</option><option>Email</option></select></label><label data-request-message-field>Message<textarea name="message" rows="5" minlength="3" maxlength="1000" required></textarea></label><label data-request-note-field>Resolution note<textarea name="note" rows="4" minlength="3" maxlength="500" required></textarea></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-request-dialog>Cancel</button><button class="primary-btn" type="submit">Save</button></div><p class="form-message" role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const title = dialog.querySelector('[data-request-dialog-title]');
  const help = dialog.querySelector('[data-request-dialog-help]');
  const submit = form.querySelector('[type="submit"]');
  const message = form.querySelector('.form-message');
  let mode = '';
  let requestId = '';
  const fields = (selector) => dialog.querySelector(selector);
  const setVisible = (selector, visible) => { const node = fields(selector); node.hidden = !visible; node.querySelectorAll('input, select, textarea').forEach((input) => { input.disabled = !visible; input.required = visible && input.name !== 'priority' && input.name !== 'channel'; }); };
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-request-dialog]').forEach((button) => button.addEventListener('click', close));
  const open = async (nextMode, id, source) => {
    mode = nextMode; requestId = id; message.textContent = ''; form.reset();
    const currentPriority = source?.closest('.record-card')?.querySelector('.record-status')?.textContent?.trim();
    title.textContent = ({ reply: 'Reply to customer', assign: 'Assign request', priority: 'Set request priority', resolve: 'Resolve request' })[mode] || 'Update request';
    help.textContent = ({ reply: 'Queue a tenant-scoped SMS or email response with provider-pending status.', assign: 'Choose an authorized owner or dispatcher for this request.', priority: 'Set urgency so the right queue and SLA attention are visible.', resolve: 'Record the outcome so the request leaves the open queue.' })[mode] || '';
    setVisible('[data-request-assignee-field]', mode === 'assign'); setVisible('[data-request-priority-field]', mode === 'priority'); setVisible('[data-request-channel-field]', mode === 'reply'); setVisible('[data-request-message-field]', mode === 'reply'); setVisible('[data-request-note-field]', mode === 'resolve');
    if (mode === 'assign') {
      const select = form.elements.assignedTo; select.innerHTML = '<option value="">Loading team…</option>'; try { const team = await repository.list('team'); const eligible = team.filter((member) => ['Owner', 'Dispatcher', 'owner', 'dispatcher'].includes(member.role)); select.innerHTML = '<option value="">Choose a teammate</option>' + eligible.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.role)}</option>`).join(''); } catch { select.innerHTML = '<option value="">Team unavailable</option>'; }
    }
    if (mode === 'priority' && ['Low', 'Normal', 'High', 'Urgent'].includes(currentPriority)) form.elements.priority.value = currentPriority;
    submit.textContent = mode === 'reply' ? 'Queue reply' : mode === 'resolve' ? 'Resolve request' : 'Save';
    dialog.showModal();
    (form.querySelector('select:not([disabled]), textarea:not([disabled])') || submit).focus();
  };
  const refreshRequests = () => { close(); document.querySelector('[data-view="requests"]')?.click(); document.querySelector('#request-view')?.click(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); submit.disabled = true; message.textContent = 'Saving…';
    try {
      if (mode === 'reply') await repository.replyToRequest(requestId, form.elements.channel.value, form.elements.message.value.trim(), crypto.randomUUID());
      else if (mode === 'assign') await repository.assignRequest(requestId, form.elements.assignedTo.value, crypto.randomUUID());
      else if (mode === 'priority') await repository.updateRequestPriority(requestId, form.elements.priority.value, crypto.randomUUID());
      else if (mode === 'resolve') await repository.resolveRequest(requestId, form.elements.note.value.trim(), crypto.randomUUID());
      refreshRequests();
    } catch (error) { message.textContent = error?.message || 'Could not update the request.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-request-action="reply"],[data-request-action="assign"],[data-request-action="priority"],[data-request-action="resolve"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open(button.dataset.requestAction, button.dataset.requestId, button);
  }, true);
}());
