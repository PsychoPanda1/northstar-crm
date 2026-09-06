(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  if (!list || !drawer) return;
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); };
  const decorate = () => {
    if (drawer.dataset.view !== 'invoices') return;
    list.querySelectorAll('.record-card').forEach((card) => {
      const id = card.querySelector('.record-id')?.textContent?.trim();
      if (!/^INV-/.test(id || '') || card.querySelector('[data-invoice-bill-to]')) return;
      const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.querySelector('div')?.append(node); return node; })();
      const button = document.createElement('button'); button.className = 'ghost-btn'; button.dataset.invoiceBillTo = id; button.textContent = 'Set bill-to'; actions.append(button);
    });
  };
  decorate();
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-invoice-bill-to]');
    if (!button) return;
    const name = window.prompt('Bill-to account or contact name'); if (!name?.trim()) return;
    const email = window.prompt('Bill-to email (optional)', '') ?? ''; const phone = window.prompt('Bill-to phone (optional)', '') ?? ''; const address = window.prompt('Bill-to address (optional)', '') ?? ''; const terms = window.prompt('Terms: Due on receipt, Net 15, Net 30, Net 45, or Net 60', 'Net 30'); if (!terms) return;
    button.disabled = true;
    try { await window.northstarRepository.updateInvoiceBillTo(button.dataset.invoiceBillTo, { name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), terms }); button.textContent = 'Bill-to saved'; toast('Invoice bill-to profile saved.'); }
    catch (error) { toast(error?.message === 'valid_bill_to_profile_required' ? 'Enter a valid bill-to profile and payment term.' : 'Could not save invoice bill-to details.'); button.disabled = false; }
  });
})();
