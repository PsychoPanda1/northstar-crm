(() => {
  const token = new URLSearchParams(location.search).get('token');
  if (!token) return;

  const portal = () => globalThis.__northstarPortal || {};
  const message = (text) => {
    const target = document.querySelector('#message');
    if (target) target.textContent = text;
  };
  const retryKey = (scope, payload) => globalThis.northstarPortalRetryKey
    ? globalThis.northstarPortalRetryKey(scope, payload)
    : crypto.randomUUID();
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  const dialog = document.createElement('dialog');
  dialog.id = 'customer-service-plan-dialog';
  dialog.className = 'workflow-dialog';
  document.body.append(dialog);

  const open = async (mode, button) => {
    const plan = portal().plans?.find((item) => item.id === button.dataset.planId);
    if (!plan) return;
    dialog.dataset.mode = mode;
    dialog.setAttribute('aria-labelledby', 'service-plan-dialog-title');
    dialog.innerHTML = '<form method="dialog" class="workflow-dialog__form"><h2 id="service-plan-dialog-title"></h2><p id="service-plan-dialog-help"></p><div id="service-plan-dialog-fields"></div><p id="service-plan-dialog-error" role="alert" class="workflow-dialog__error"></p><div class="workflow-dialog__actions"><button value="cancel">Cancel</button><button id="service-plan-dialog-submit" value="default">Submit</button></div></form>';
    const title = dialog.querySelector('#service-plan-dialog-title');
    const help = dialog.querySelector('#service-plan-dialog-help');
    const fields = dialog.querySelector('#service-plan-dialog-fields');
    const submit = dialog.querySelector('#service-plan-dialog-submit');
    const error = dialog.querySelector('#service-plan-dialog-error');
    title.textContent = mode === 'visit' ? `Schedule a ${plan.service} visit` : `Request a change to ${plan.service}`;
    if (mode === 'request') {
      help.textContent = 'Choose what you need and add enough detail for the service office to respond.';
      fields.innerHTML = `<label>Request type<select name="action" required><option value="pause">Pause plan</option><option value="resume">Resume plan</option><option value="change">Change plan</option><option value="cancel">Cancel plan</option></select></label><label>Details<textarea name="note" rows="4" minlength="3" maxlength="2000" required placeholder="Tell the service office what you need."></textarea></label>`;
    } else {
      help.textContent = 'Choose an available time and service location. Your service office will receive the request immediately.';
      const catalogItem = portal().catalog?.find((item) => item.name === plan.service);
      const query = `?token=${encodeURIComponent(token)}${catalogItem?.id ? `&catalogItemId=${encodeURIComponent(catalogItem.id)}` : ''}`;
      const response = await fetch('/api/public/customer-portal/availability' + query).catch(() => null);
      const body = response?.ok ? await response.json().catch(() => ({})) : {};
      const slots = body.slotOptions || [];
      const locations = portal().locations || [];
      fields.innerHTML = `<label>Appointment time<select name="slotId" required>${slots.length ? slots.map((slot) => `<option value="${esc(slot.id)}">${esc(slot.label)}</option>`).join('') : '<option value="">No times available</option>'}</select></label><label>Service location<select name="locationId" required>${locations.length ? locations.map((item) => `<option value="${esc(item.id)}">${esc(item.label)} · ${esc(item.address)}</option>`).join('') : '<option value="">No saved locations</option>'}</select></label>`;
      submit.disabled = !slots.length || !locations.length;
    }
    dialog.showModal();
    dialog.querySelector('textarea, select')?.focus();
    dialog.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const values = Object.fromEntries(formData.entries());
      if (mode === 'request' && String(values.note || '').trim().length < 3) {
        error.textContent = 'Add at least three characters describing the request.';
        return;
      }
      if (mode === 'visit' && (!values.slotId || !values.locationId)) {
        error.textContent = 'Choose an appointment time and service location.';
        return;
      }
      submit.disabled = true;
      error.textContent = '';
      const payload = mode === 'visit'
        ? { planId: plan.id, slotId: values.slotId, locationId: values.locationId }
        : { planId: plan.id, service: plan.service, action: values.action, note: String(values.note).trim() };
      const endpoint = mode === 'visit' ? '/api/public/customer-portal/service-plan-visit' : '/api/public/customer-portal/service-plan-request';
      try {
        const response = await fetch(endpoint + `?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': retryKey(`service-plan-${mode}`, payload) }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error();
        dialog.close();
        message(mode === 'visit' ? 'Service-plan visit scheduled.' : 'Plan request sent. Your service office will follow up.');
        if (mode === 'request' || mode === 'visit') window.location.reload();
      } catch {
        error.textContent = mode === 'visit' ? 'That plan visit could not be scheduled. Please try again.' : 'That plan request could not be sent. Please try again.';
        submit.disabled = false;
      }
    }, { once: true });
  };

  document.addEventListener('click', (event) => {
    const visit = event.target.closest('[data-action="schedule-plan-visit"]');
    const request = event.target.closest('[data-plan-request="true"]');
    if (!visit && !request) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (visit && !visit.disabled) void open('visit', visit);
    if (request && !request.disabled) void open('request', request);
  }, true);
})();
