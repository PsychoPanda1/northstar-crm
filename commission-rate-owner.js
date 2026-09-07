(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#commission-rate-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'commission-rate-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-commission aria-label="Close">×</button><div class="dialog-kicker">PAYROLL SETTINGS</div><h2>Set commission rate</h2><p>Choose a field technician and save the revenue commission rate used by payroll-ready reporting.</p><form><label>Technician<select name="teamMemberId" required><option value="">Loading technicians…</option></select></label><label>Commission rate (%)<input name="commissionRate" type="number" min="0" max="100" step="0.01" required value="10" /></label><p class="form-hint">Use 0–100%. The rate affects future commission calculations and is protected by owner authorization on the API.</p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-commission>Cancel</button><button class="primary-btn" type="submit">Save rate</button></div><p class="form-message" data-commission-message role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-commission-message]');
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelectorAll('[data-close-commission]').forEach((button) => button.addEventListener('click', close));
  let members = [];
  const syncRate = () => { const member = members.find((item) => item.id === form.elements.teamMemberId.value); if (member) form.elements.commissionRate.value = String(member.commissionRate ?? 10); };
  form.elements.teamMemberId.addEventListener('change', syncRate);
  const open = async () => {
    form.reset(); message.textContent = 'Loading technicians…';
    try {
      members = (await repository.list('team')).filter((item) => ['Lead technician', 'Field technician', 'Apprentice'].includes(item.role));
      form.elements.teamMemberId.innerHTML = members.length ? `<option value="">Choose a technician</option>${members.map((item) => `<option value="${String(item.id).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${String(item.name || item.id).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))} · ${Number(item.commissionRate ?? 10)}%</option>`).join('')}` : '<option value="">No eligible technicians</option>';
      message.textContent = members.length ? '' : 'Add an eligible technician before setting a commission rate.';
      dialog.showModal();
      form.elements.teamMemberId.focus();
    } catch { message.textContent = 'Could not load technicians for payroll settings.'; dialog.showModal(); }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const rate = Number(form.elements.commissionRate.value);
    const member = members.find((item) => item.id === form.elements.teamMemberId.value);
    if (!member || !Number.isFinite(rate) || rate < 0 || rate > 100) { message.textContent = 'Choose a technician and enter a rate from 0 to 100%.'; return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving commission rate…';
    try {
      const result = await repository.setTeamCommissionRate(member.id, rate);
      message.textContent = result.duplicate ? 'Commission rate was already saved.' : `Commission rate saved for ${member.name}.`;
      setTimeout(close, 500);
    } catch { message.textContent = 'Could not save the commission rate. Confirm owner access and the selected technician.'; submit.disabled = false; }
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#commission-rate-view');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    void open();
  }, true);
})();
