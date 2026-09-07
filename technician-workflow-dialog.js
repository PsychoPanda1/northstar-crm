(() => {
  const token = new URLSearchParams(location.search).get('token');
  if (!token) return;

  const definitions = {
    'en-route': { title: 'Mark job en route', help: 'Add an estimated arrival so the office and customer have a useful update.', label: 'ETA in minutes (optional)', name: 'eta', type: 'number', min: '1', max: '1440', submit: 'Mark en route' },
    complete: { title: 'Complete this job', help: 'The completion note is already on the job. Add an optional customer acknowledgment name.', label: 'Customer acknowledgment (optional)', name: 'acknowledgedBy', type: 'text', max: '120', submit: 'Complete job' },
    'log-time': { title: 'Log field time', help: 'Record the labor time spent on this job for costing and payroll review.', label: 'Hours worked', name: 'hours', type: 'number', min: '0.01', max: '24', step: '0.01', required: true, submit: 'Log time' }
  };
  let dialog;
  const message = (text) => { const target = document.querySelector('#message'); if (target) target.textContent = text; };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'technician-workflow-dialog';
    dialog.className = 'workflow-dialog';
    dialog.innerHTML = '<form method="dialog" class="workflow-dialog__form"><h2 id="technician-workflow-title"></h2><p id="technician-workflow-help"></p><label id="technician-workflow-label"></label><p id="technician-workflow-error" role="alert" class="workflow-dialog__error"></p><div class="workflow-dialog__actions"><button value="cancel">Cancel</button><button id="technician-workflow-submit" value="default">Submit</button></div></form>';
    document.body.append(dialog);
    return dialog;
  };
  const open = (key, button) => {
    const definition = definitions[key];
    if (!definition || typeof button.onclick !== 'function') return;
    const modal = ensureDialog();
    const form = modal.querySelector('form');
    const label = modal.querySelector('#technician-workflow-label');
    const input = document.createElement('input');
    input.name = definition.name;
    input.type = definition.type;
    input.required = Boolean(definition.required);
    if (definition.min) input.min = definition.min;
    if (definition.max) input.max = definition.max;
    if (definition.step) input.step = definition.step;
    input.autocomplete = 'off';
    label.textContent = definition.label;
    label.append(input);
    modal.querySelector('#technician-workflow-title').textContent = definition.title;
    modal.querySelector('#technician-workflow-help').textContent = definition.help;
    modal.querySelector('#technician-workflow-error').textContent = '';
    const submit = modal.querySelector('#technician-workflow-submit');
    modal.showModal();
    input.focus();
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = input.value.trim();
      if (key === 'log-time' && (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 24)) {
        modal.querySelector('#technician-workflow-error').textContent = 'Enter between 0.01 and 24 hours.';
        return;
      }
      submit.disabled = true;
      const originalPrompt = window.prompt;
      window.prompt = () => value;
      try {
        await button.onclick();
        modal.close();
        if (key === 'en-route') message(value ? `Job marked en route · ETA ${value} minutes.` : 'Job marked en route.');
      } catch {
        modal.querySelector('#technician-workflow-error').textContent = 'The field update could not be saved. Please try again.';
      } finally {
        window.prompt = originalPrompt;
        submit.disabled = false;
      }
    };
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#en-route, #complete, #log-time');
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(button.id, button);
  }, true);
})();
