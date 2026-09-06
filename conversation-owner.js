(function () {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const when = (item) => Date.parse(item.receivedAt || item.queuedAt || item.createdAt || '') || 0;
  const repository = window.northstarRepository;
  const drawer = document.querySelector('#record-drawer');
  const title = document.querySelector('#drawer-title');
  const list = document.querySelector('#record-list');
  const reportButton = document.querySelector('#report-view');
  if (!repository || !drawer || !title || !list || !reportButton || document.querySelector('#conversation-view')) return;

  const button = document.createElement('button');
  button.className = 'ghost-btn';
  button.id = 'conversation-view';
  button.textContent = 'Conversations';
  reportButton.after(button);
  let messages = [];

  const openDrawer = (heading, markup) => {
    drawer.dataset.view = 'conversation';
    title.textContent = heading;
    list.innerHTML = markup;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  };

  const threadKey = (item) => item.customerId || `name:${String(item.customer || 'Unknown customer').trim().toLowerCase()}`;
  const threadGroups = () => [...messages.reduce((groups, item) => {
    const key = threadKey(item);
    const existing = groups.get(key) || { key, customerId: item.customerId || '', customer: item.customer || 'Unknown customer', items: [] };
    existing.items.push(item);
    existing.customer = item.customer || existing.customer;
    groups.set(key, existing);
    return groups;
  }, new Map()).values()].map((group) => ({ ...group, items: group.items.sort((a, b) => when(a) - when(b)), latest: group.items[group.items.length - 1] })).sort((a, b) => when(b.latest) - when(a.latest));

  const threadSummary = (group) => `<article class="record-card"><div><span class="record-id">${escapeHtml(group.customerId || 'CUSTOMER THREAD')}</span><h3>${escapeHtml(group.customer)}</h3><p>${escapeHtml(group.latest?.message || 'No message text')} · ${escapeHtml(group.latest?.channel || 'Message')} · ${escapeHtml(group.latest?.status || 'Queued')}</p><div class="record-actions"><button class="ghost-btn" data-conversation-open="${escapeHtml(group.key)}">Open conversation</button></div></div><span class="record-status">${group.items.length} message${group.items.length === 1 ? '' : 's'}</span></article>`;
  const renderInbox = () => openDrawer('Conversations', `<div class="report-period">${threadGroups().length} customer thread${threadGroups().length === 1 ? '' : 's'} · provider delivery remains auditable</div>${threadGroups().map(threadSummary).join('') || '<div class="empty-state">No customer messages yet.</div>'}`);
  const renderThread = (group) => {
    const content = `<div class="report-period">${escapeHtml(group.customer)} · ${group.items.length} message${group.items.length === 1 ? '' : 's'}</div><div class="record-actions"><button class="ghost-btn" data-conversation-back>All conversations</button><button class="primary-btn" data-conversation-compose>New message</button></div>${group.items.map((item) => `<article class="record-card"><div><span class="record-id">${escapeHtml(item.id)}</span><h3>${escapeHtml(item.direction === 'inbound' ? 'Customer' : 'Workspace')} · ${escapeHtml(item.channel || 'Message')}</h3><p>${escapeHtml(item.message || 'No message text')}</p><small class="muted">${escapeHtml(item.status || 'Queued')} · ${when(item) ? escapeHtml(new Date(when(item)).toLocaleString()) : 'Time not recorded'}</small><div class="record-actions"><button class="ghost-btn" data-conversation-reply="${escapeHtml(item.id)}">Reply</button></div></div><span class="record-status">${escapeHtml(item.direction || item.status || '')}</span></article>`).join('')}`;
    openDrawer(`Conversation · ${group.customer}`, content);
  };

  const load = async () => {
    button.disabled = true;
    try {
      messages = await repository.list('messages');
      renderInbox();
    } catch { list.innerHTML = '<div class="empty-state">Conversation history is unavailable.</div>'; }
    finally { button.disabled = false; }
  };

  button.addEventListener('click', () => { void load(); });
  list.addEventListener('click', async (event) => {
    if (drawer.dataset.view !== 'conversation') return;
    const open = event.target.closest('[data-conversation-open]');
    if (open) { const group = threadGroups().find((item) => item.key === open.dataset.conversationOpen); if (group) renderThread(group); return; }
    if (event.target.closest('[data-conversation-back]')) { renderInbox(); return; }
    const reply = event.target.closest('[data-conversation-reply]');
    if (reply) {
      const message = window.prompt('Reply to customer');
      if (!message?.trim()) return;
      reply.disabled = true;
      try { const result = await repository.replyToMessage(reply.dataset.conversationReply, message.trim()); messages.push(result.message || result); const group = threadGroups().find((item) => item.items.some((item) => item.id === reply.dataset.conversationReply)); if (group) renderThread(group); }
      catch { window.alert('Could not queue the reply. Check the customer channel preference and provider configuration.'); reply.disabled = false; }
      return;
    }
    if (event.target.closest('[data-conversation-compose]')) {
      const group = threadGroups().find((item) => item.customer === title.textContent.replace(/^Conversation · /, ''));
      if (!group) return;
      const message = window.prompt('Message to customer');
      if (!message?.trim()) return;
      const channel = window.prompt('Channel: SMS or Email', 'SMS');
      if (!['SMS', 'Email'].includes(channel)) return;
      try { const result = await repository.sendMessage(group.customer, channel, message.trim(), group.customerId); messages.push(result.message || result); renderThread(threadGroups().find((item) => item.key === group.key)); }
      catch { window.alert('Could not queue the message. Check the customer channel preference and provider configuration.'); }
    }
  });
}());
