(() => {
  const list = document.querySelector('#record-list');
  const drawer = document.querySelector('#record-drawer');
  if (!list || !drawer) return;
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); };
  const decorate = () => {
    if (drawer.dataset.view !== 'estimates') return;
    list.querySelectorAll('.record-card').forEach((card) => {
      const id = card.querySelector('.record-id')?.textContent?.trim();
      if (!/^EST-/.test(id || '') || card.querySelector('[data-estimate-media]')) return;
      const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.querySelector('div')?.append(node); return node; })();
      const button = document.createElement('button'); button.className = 'ghost-btn'; button.dataset.estimateMedia = id; button.textContent = 'Add media'; actions.append(button);
    });
  };
  decorate();
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-estimate-media]');
    if (!button) return;
    const url = window.prompt('HTTPS image or document URL'); if (!url?.trim()) return;
    const caption = window.prompt('Caption', 'Supporting estimate information'); if (!caption?.trim()) return;
    const kind = window.prompt('Type: reference, before, after, or document', 'reference'); if (!['reference', 'before', 'after', 'document'].includes(kind)) return;
    button.disabled = true;
    try { await window.northstarRepository.addEstimateMedia(button.dataset.estimateMedia, url.trim(), caption.trim(), kind, crypto.randomUUID()); button.remove(); toast('Estimate media attached.'); }
    catch (error) { toast(error?.message === 'estimate_media_locked' ? 'This estimate is already closed.' : 'Could not attach estimate media.'); button.disabled = false; }
  });
})();
