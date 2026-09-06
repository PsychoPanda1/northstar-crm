(() => {
  const drawer = document.querySelector('#record-drawer');
  const list = document.querySelector('#record-list');
  const repository = window.northstarRepository;
  if (!drawer || !list || !repository?.getCallRecording || !repository?.list) return;
  let calls = new Map();
  let loading = false;
  const decorate = async () => {
    if (drawer.dataset.view !== 'calls' || loading) return;
    loading = true;
    try {
      const items = await repository.list('calls');
      calls = new Map(items.map((item) => [item.id, item]));
      list.querySelectorAll('.record-card').forEach((card) => {
        const id = card.querySelector('.record-id')?.textContent?.trim();
        const call = calls.get(id);
        if (!call?.recordingAvailable || card.querySelector('[data-call-recording]')) return;
        const actions = card.querySelector('.record-actions') || (() => { const node = document.createElement('div'); node.className = 'record-actions'; card.querySelector('div')?.append(node); return node; })();
        const button = document.createElement('button');
        button.className = 'ghost-btn';
        button.dataset.callRecording = id;
        button.textContent = 'Open recording';
        actions.prepend(button);
      });
    } catch {} finally { loading = false; }
  };
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-call-recording]');
    if (!button) return;
    button.disabled = true;
    try {
      const result = await repository.getCallRecording(button.dataset.callRecording);
      const url = result.recording?.url;
      if (!url || !/^https:\/\//i.test(url)) throw new Error('invalid_recording_url');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { window.alert('This call recording is unavailable or has expired.'); }
    finally { button.disabled = false; }
  });
  new MutationObserver(() => { void decorate(); }).observe(drawer, { attributes: true, childList: true, subtree: true });
  void decorate();
})();
