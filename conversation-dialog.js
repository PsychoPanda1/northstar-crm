(() => {
  const repository = window.northstarRepository;
  const list = document.querySelector('#record-list');
  if (!repository || !list) return;
  let dialog;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const toast = (text) => { const node = document.querySelector('#toast'); if (!node) return; node.textContent = text; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2800); };
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'conversation-message-dialog';
    dialog.className = 'workflow-dialog';
    dialog.innerHTML = '<form method="dialog" class="workflow-dialog__form"><h2 id="conversation-dialog-title">Message customer</h2><p id="conversation-dialog-help">Messages are queued for provider delivery and remain visible in the conversation ledger.</p><label id="conversation-dialog-customer-label">Customer<select name="customer"></select></label><label>Channel<select name="channel"><option>SMS</option><option>Email</option></select></label><label>Message<textarea name="message" rows="6" minlength="1" maxlength="4000" required placeholder="Write a clear service update."></textarea></label><p id="conversation-dialog-error" role="alert" class="workflow-dialog__error"></p><div class="workflow-dialog__actions"><button value="cancel">Cancel</button><button id="conversation-dialog-submit" value="default">Queue message</button></div></form>';
    document.body.append(dialog);
    return dialog;
  };
  const open = async (mode, button) => {
    const modal = ensureDialog(); const form = modal.querySelector('form'); const customerLabel = modal.querySelector('#conversation-dialog-customer-label'); const customer = form.elements.customer; const channel = form.elements.channel; const submit = modal.querySelector('#conversation-dialog-submit'); const error = modal.querySelector('#conversation-dialog-error');
    form.reset(); error.textContent = ''; let messages = []; try { messages = await repository.list('messages'); } catch {}
    if (mode === 'reply') {
      const item = messages.find((entry) => entry.id === button.dataset.conversationReply || entry.id === button.dataset.messageReply); modal.querySelector('#conversation-dialog-title').textContent = `Reply to ${item?.customer || 'customer'}`; customerLabel.hidden = true; customer.innerHTML = ''; if (item?.channel === 'Email' || item?.channel === 'SMS') channel.value = item.channel;
    } else {
      modal.querySelector('#conversation-dialog-title').textContent = mode === 'compose' ? 'New conversation message' : 'Send customer message'; customerLabel.hidden = false; let customers = [];
      if (mode === 'compose') { const currentCustomer = document.querySelector('#drawer-title')?.textContent?.replace(/^Conversation · /, '').trim(); customers = messages.filter((entry) => entry.customer === currentCustomer).map((entry) => ({ id: entry.customerId || '', name: entry.customer })).filter((entry, index, all) => entry.name && all.findIndex((candidate) => candidate.name === entry.name) === index); } else { try { customers = await repository.list('customers'); } catch {} }
      customer.innerHTML = customers.length ? customers.map((entry) => `<option value="${esc(entry.id || entry.customerId || '')}" data-name="${esc(entry.name || entry.customer || '')}">${esc(entry.name || entry.customer || 'Customer')}</option>`).join('') : '<option value="">No customers available</option>'; submit.disabled = !customers.length;
    }
    modal.showModal(); form.elements.message.focus();
    form.onsubmit = async (event) => { event.preventDefault(); if (!form.reportValidity()) return; const text = form.elements.message.value.trim(); if (!text) return; submit.disabled = true; error.textContent = ''; try { if (mode === 'reply') await repository.replyToMessage(button.dataset.conversationReply || button.dataset.messageReply, text); else { const option = customer.selectedOptions[0]; if (!option?.dataset.name) throw new Error('customer_required'); await repository.sendMessage(option.dataset.name, channel.value, text, option.value); } modal.close(); toast('Message queued for provider delivery.'); if (mode === 'reply' || mode === 'compose') document.querySelector('#conversation-view')?.click(); else window.openRecords?.('messages'); } catch { error.textContent = 'Could not queue the message. Check the customer channel preference and provider configuration.'; submit.disabled = false; } };
  };
  document.addEventListener('click', (event) => { const reply = event.target.closest('[data-conversation-reply], [data-message-reply]'); const compose = event.target.closest('[data-conversation-compose]'); const send = event.target.closest('#send-message'); if (!reply && !compose && !send) return; event.preventDefault(); event.stopImmediatePropagation(); void open(reply ? 'reply' : compose ? 'compose' : 'send', reply || compose || send); }, true);
})();
