(() => {
  const button = document.querySelector('#use-material');
  const token = new URLSearchParams(location.search).get('token');
  if (!button || !token) return;
  let dialog;
  let job;
  const message = (text) => { const node = dialog?.querySelector('[data-material-message]'); if (node) node.textContent = text; };
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.style.cssText = 'border:0;border-radius:16px;max-width:440px;width:calc(100% - 32px);padding:24px;box-shadow:0 20px 60px rgba(24,48,68,.25);font:inherit;color:#183044';
    dialog.innerHTML = '<button type="button" data-close-material aria-label="Close" style="float:right;border:0;background:none;font-size:24px;cursor:pointer">×</button><div style="color:#237b5b;font-size:11px;font-weight:800;letter-spacing:.12em">FIELD INVENTORY</div><h2 style="margin:8px 0">Record material used</h2><p style="color:#6d7c84;font-size:13px">Choose stock from the truck, van, or warehouse location. Quantity is checked before it is consumed.</p><form><label style="display:block;margin-top:12px;font-size:12px;font-weight:700">Material<select name="materialId" required style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #d8e4e0;border-radius:9px;font:inherit"></select></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700">Quantity<input name="quantity" type="number" min="1" step="1" value="1" required style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #d8e4e0;border-radius:9px;font:inherit" /></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700">Stock location<select name="locationId" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #d8e4e0;border-radius:9px;font:inherit"></select></label><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-close-material style="width:auto;background:#eaf2ef;color:#237b5b">Cancel</button><button type="submit" style="width:auto">Record usage</button></div><p data-material-message role="status" aria-live="polite" style="font-size:12px;color:#6d7c84"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-material]').forEach((item) => item.addEventListener('click', () => dialog.close()));
    const form = dialog.querySelector('form');
    form.elements.materialId.addEventListener('change', () => { const material = (job?.materials || []).find((item) => item.id === form.elements.materialId.value); form.elements.quantity.max = String(Math.max(0, Number(material?.onHand || 0))); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const material = (job?.materials || []).find((item) => item.id === form.elements.materialId.value);
      const quantity = Number(form.elements.quantity.value);
      if (!material || !Number.isInteger(quantity) || quantity <= 0 || quantity > Number(material.onHand || 0)) { message(`Enter a whole quantity from 1 to ${Number(material?.onHand || 0)}.`); return; }
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message('Recording…');
      try {
        const response = await fetch(`/api/public/technician-job/materials?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ materialId: material.id, quantity, ...(form.elements.locationId.value ? { locationId: form.elements.locationId.value } : {}) }) });
        if (!response.ok && response.status !== 202) throw new Error('material_failed');
        message(response.status === 202 ? 'Material usage saved for synchronization.' : 'Material usage recorded.'); setTimeout(() => dialog.close(), 700);
      } catch { message('Could not record material usage. Confirm stock and location availability.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };
  button.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopImmediatePropagation(); button.disabled = true;
    try {
      const response = await fetch(`/api/public/technician-job?token=${encodeURIComponent(token)}`); if (!response.ok) throw new Error('job_unavailable');
      job = await response.json(); const modal = ensureDialog(); const form = modal.querySelector('form'); const materials = job.materials || []; const locations = job.inventoryLocations || []; form.elements.materialId.innerHTML = materials.length ? materials.map((item) => `<option value="${esc(item.id)}">${esc(item.name)} · ${Number(item.onHand || 0)} ${esc(item.unit || 'units')} available</option>`).join('') : '<option value="">No stocked materials</option>'; form.elements.locationId.innerHTML = `<option value="">Default available stock</option>${locations.map((item) => `<option value="${esc(item.id)}">${esc(item.name)} · ${esc(item.type || '')}</option>`).join('')}`; form.elements.materialId.dispatchEvent(new Event('change')); message(materials.length ? '' : 'No stocked materials are available for this job.'); modal.showModal(); form.elements.materialId.focus();
    } catch { message('Could not load available materials.'); ensureDialog().showModal(); }
    finally { button.disabled = false; }
  }, true);
})();
