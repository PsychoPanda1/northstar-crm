(() => {
  const button = document.querySelector('#collect-payment');
  const token = new URLSearchParams(location.search).get('token');
  if (!button || !token) return;
  let dialog;
  let invoice;
  const message = (text) => { const node = dialog?.querySelector('[data-tech-payment-message]'); if (node) node.textContent = text; };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.style.cssText = 'border:0;border-radius:16px;max-width:440px;width:calc(100% - 32px);padding:24px;box-shadow:0 20px 60px rgba(24,48,68,.25);font:inherit;color:#183044';
    dialog.innerHTML = '<button type="button" data-close-tech-payment aria-label="Close" style="float:right;border:0;background:none;font-size:24px;cursor:pointer">×</button><div style="color:#237b5b;font-size:11px;font-weight:800;letter-spacing:.12em">FIELD COLLECTION</div><h2 style="margin:8px 0">Collect payment</h2><p style="color:#6d7c84;font-size:13px">Choose the open invoice or installment and submit a provider-safe payment intent.</p><form><label style="display:block;margin-top:12px;font-size:12px;font-weight:700">Invoice or installment<select name="installment" required style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #d8e4e0;border-radius:9px;font:inherit"></select></label><label style="display:block;margin-top:12px;font-size:12px;font-weight:700">Amount<input name="amount" type="number" min="0.01" step="0.01" required style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px;border:1px solid #d8e4e0;border-radius:9px;font:inherit" /></label><fieldset style="border:0;padding:0;margin:12px 0"><legend style="font-size:12px;font-weight:700">Method</legend><label style="display:inline-flex;gap:6px;margin-right:16px;font-size:13px"><input type="radio" name="method" value="Card" checked /> Card</label><label style="display:inline-flex;gap:6px;font-size:13px"><input type="radio" name="method" value="ACH" /> ACH</label></fieldset><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-close-tech-payment style="width:auto;background:#eaf2ef;color:#237b5b">Cancel</button><button type="submit" style="width:auto">Submit payment</button></div><p data-tech-payment-message role="status" aria-live="polite" style="font-size:12px;color:#6d7c84"></p></form>';
    document.body.append(dialog);
    dialog.querySelectorAll('[data-close-tech-payment]').forEach((item) => item.addEventListener('click', () => dialog.close()));
    const form = dialog.querySelector('form');
    const select = form.elements.installment;
    select.addEventListener('change', () => { const selected = (invoice?.schedule || []).find((item) => item.id === select.value); if (selected) form.elements.amount.value = (Number(selected.amount) - Number(selected.paidAmount || 0)).toFixed(2); else form.elements.amount.value = Number(invoice?.balance || 0).toFixed(2); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selected = (invoice?.schedule || []).find((item) => item.id === form.elements.installment.value);
      const amount = Number(form.elements.amount.value);
      const maximum = selected ? Number(selected.amount) - Number(selected.paidAmount || 0) : Number(invoice?.balance || 0);
      if (!Number.isFinite(amount) || amount <= 0 || amount > maximum || !['Card', 'ACH'].includes(form.elements.method.value)) { message(`Enter an amount from $0.01 to $${Math.max(0, maximum).toFixed(2)}.`); return; }
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true; message('Submitting…');
      try {
        const response = await fetch(`/api/public/technician-job/payment-intent?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ amount, method: form.elements.method.value, ...(selected ? { installmentId: selected.id } : {}) }) });
        if (!response.ok && response.status !== 202) throw new Error('payment_failed');
        message(response.status === 202 ? 'Payment saved for synchronization.' : 'Payment submitted for provider confirmation.');
        setTimeout(() => dialog.close(), 700);
      } catch { message('Could not submit payment. Confirm the invoice or installment is still open.'); }
      finally { submit.disabled = false; }
    });
    return dialog;
  };
  button.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopImmediatePropagation(); button.disabled = true;
    try {
      const response = await fetch(`/api/public/technician-job?token=${encodeURIComponent(token)}`); if (!response.ok) throw new Error('job_unavailable');
      const job = await response.json(); invoice = job.invoice || { balance: 0, schedule: [] }; const modal = ensureDialog(); const form = modal.querySelector('form'); const select = form.elements.installment; const schedule = (invoice.schedule || []).filter((item) => item.status !== 'Paid' && Number(item.amount) - Number(item.paidAmount || 0) > 0); select.innerHTML = `<option value="">Full invoice · $${Number(invoice.balance || 0).toFixed(2)}</option>${schedule.map((item) => `<option value="${escapeHtml(item.id)}">Installment ${escapeHtml(item.sequence)} · $${(Number(item.amount) - Number(item.paidAmount || 0)).toFixed(2)}</option>`).join('')}`; select.dispatchEvent(new Event('change')); message(Number(invoice.balance || 0) > 0 ? '' : 'No open balance is available for this job.'); modal.showModal(); form.elements.amount.focus();
    } catch { message('Could not load the open invoice for this job.'); ensureDialog().showModal(); }
    finally { button.disabled = false; }
  }, true);
})();
