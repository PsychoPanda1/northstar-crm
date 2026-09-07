(() => {
  const trigger = document.querySelector('#add-lead');
  const repository = window.northstarRepository;
  if (!trigger || !repository?.createLead) return;
  const tenant = window.northstarTenant || {};
  const dialog = document.createElement('dialog');
  dialog.id = 'lead-intake-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-lead aria-label="Close">×</button><div class="dialog-kicker">LEAD INTAKE</div><h2>Add a lead</h2><p>Capture the service request once so the landing-page source, campaign, contact details, and follow-up context stay attached to the customer journey.</p><form><label>Name<input name="name" autocomplete="name" maxlength="160" required /></label><div class="workflow-actions"><label style="flex:1">Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40" /></label><label style="flex:1">Email<input name="email" type="email" autocomplete="email" maxlength="254" /></label></div><p class="form-hint">Provide at least a phone number or an email address.</p><div class="workflow-actions"><label style="flex:1">Requested service<input name="service" maxlength="120" required /></label><label style="flex:1">Lead source<input name="source" maxlength="120" required /></label></div><label>Service address <span>(optional)</span><input name="location" autocomplete="street-address" maxlength="240" /></label><label>Lead note <span>(optional)</span><textarea name="note" rows="3" maxlength="600"></textarea></label><label>Campaign attribution <span>(optional)</span><input name="campaign" maxlength="160" placeholder="utm_campaign value" /></label><p class="form-message" data-lead-message role="status" aria-live="polite"></p><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-lead>Cancel</button><button class="primary-btn" type="submit">Add lead</button></div></form>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-lead-message]');
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 2800); };
  dialog.querySelectorAll('[data-close-lead]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = () => { form.reset(); form.elements.service.value = tenant.serviceLabel || 'Service visit'; form.elements.source.value = 'Owner workspace'; message.textContent = ''; dialog.showModal(); form.elements.name.focus(); };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.phone.trim() && !values.email.trim()) { message.textContent = 'Enter a phone number or an email address.'; form.elements.phone.focus(); return; }
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message.textContent = 'Saving…';
    try {
      const result = await repository.createLead({ name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim(), service: values.service.trim(), source: values.source.trim(), location: values.location.trim(), note: values.note.trim(), attribution: values.campaign.trim() ? { utm_campaign: values.campaign.trim() } : {} });
      dialog.close(); toast(result.duplicate ? 'That lead is already recorded.' : 'Lead added.'); document.querySelector('[data-view="leads"]')?.click();
    } catch (error) { message.textContent = error?.message === 'valid_lead_contact_required' ? 'Enter a valid phone number or email address.' : 'Could not add the lead. Check the contact details and try again.'; }
    finally { submit.disabled = false; }
  });
  trigger.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); open(); }, true);
})();
