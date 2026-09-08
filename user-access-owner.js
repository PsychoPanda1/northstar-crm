(() => {
  const trigger = document.querySelector('#user-access-view');
  const repository = window.northstarRepository;
  if (!trigger || !repository?.createUserInvite) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dialog = document.createElement('dialog');
  dialog.className = 'workflow-dialog';
  dialog.id = 'user-access-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-user-access aria-label="Close">×</button><div class="dialog-kicker">OWNER ADMINISTRATION</div><h2>Manage user access</h2><p>Invite and manage tenant-bound staff without exposing password digests or account secrets.</p><form><label>Action<select name="action"><option value="invite">Send secure invite</option><option value="add">Create account directly</option><option value="manage">Manage existing account</option><option value="resend">Resend invite</option><option value="revoke">Revoke pending invite</option></select></label><div data-user-access-fields></div><p class="form-message" role="status" aria-live="polite"></p><div data-user-access-result hidden></div><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-user-access>Cancel</button><button class="primary-btn" type="submit">Continue</button></div></form>';
  document.body.append(dialog);
  dialog.querySelectorAll('[data-close-user-access]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const form = dialog.querySelector('form');
  const fields = dialog.querySelector('[data-user-access-fields]');
  const message = dialog.querySelector('.form-message');
  const result = dialog.querySelector('[data-user-access-result]');
  const roleOptions = '<option value="dispatcher">Dispatcher</option><option value="technician">Technician</option><option value="accountant">Accountant</option>';
  const field = (label, input) => `<label>${label}${input}</label>`;
  const loadUsers = async () => (await repository.listUsers()).items || [];
  const renderFields = async () => {
    const action = form.elements.action.value;
    result.hidden = true;
    result.innerHTML = '';
    message.textContent = '';
    if (action === 'invite') fields.innerHTML = field('Name', '<input name="name" required maxlength="100" />') + field('Email', '<input name="email" type="email" required maxlength="160" />') + field('Role', `<select name="role">${roleOptions}</select>`);
    if (action === 'add') fields.innerHTML = field('Name', '<input name="name" required maxlength="100" />') + field('Email', '<input name="email" type="email" required maxlength="160" />') + field('Temporary password', '<input name="password" type="password" minlength="10" required autocomplete="new-password" />') + field('Role', `<select name="role">${roleOptions}</select>`);
    if (action === 'manage') { fields.innerHTML = '<div class="empty-state">Loading accounts…</div>'; try { const users = (await loadUsers()).filter((item) => String(item.id || '').startsWith('USER-')); fields.innerHTML = users.length ? field('Account', `<select name="userId">${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} · ${escapeHtml(user.role)} · ${escapeHtml(user.status)}</option>`).join('')}</select>`) + field('Operation', '<select name="operation"><option value="status">Toggle active/suspended</option><option value="reset">Reset password</option></select>') + field('New password (reset only)', '<input name="password" type="password" minlength="10" autocomplete="new-password" />') : '<div class="empty-state">No runtime staff accounts are available.</div>'; } catch { fields.innerHTML = '<div class="empty-state">Accounts are unavailable.</div>'; } }
    if (action === 'resend' || action === 'revoke') { fields.innerHTML = '<div class="empty-state">Loading invitations…</div>'; try { const invites = (await repository.listUserInvites()).items || []; const available = invites.filter((item) => action === 'resend' ? ['Pending', 'Expired'].includes(item.status) : item.status === 'Pending'); fields.innerHTML = available.length ? field(action === 'resend' ? 'Invitation to resend' : 'Pending invite', `<select name="inviteId">${available.map((invite) => `<option value="${escapeHtml(invite.id)}">${escapeHtml(invite.name)} · ${escapeHtml(invite.email)} · ${escapeHtml(invite.status)}</option>`).join('')}</select>`) : `<div class="empty-state">No ${action === 'resend' ? 'expired or pending invitations' : 'pending invitations'} available.</div>`; } catch { fields.innerHTML = '<div class="empty-state">Invitations are unavailable.</div>'; } }
  };
  form.elements.action.addEventListener('change', () => { void renderFields(); });
  trigger.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); dialog.showModal(); void renderFields(); }, true);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const action = form.elements.action.value;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Saving access change…';
    try {
      if (action === 'invite') { const created = await repository.createUserInvite(form.elements.name.value.trim(), form.elements.email.value.trim(), form.elements.role.value); result.hidden = false; result.innerHTML = `<p class="muted">${created.delivery?.status === 'Queued (provider pending)' ? 'Invitation email queued for the configured provider.' : escapeHtml(created.delivery?.status || 'Invitation created.')}</p><label>Secure invite link<textarea readonly rows="3" data-user-access-link>${escapeHtml(created.inviteUrl)}</textarea></label><button class="ghost-btn" type="button" data-copy-user-access>Copy invite link</button>`; result.querySelector('[data-copy-user-access]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(created.inviteUrl); message.textContent = 'Invite link copied.'; } catch { message.textContent = 'Select the link and copy it manually.'; } }); message.textContent = 'Secure invite created; the email remains auditable and the link is available as a fallback.'; }
      else if (action === 'add') { await repository.createUser(form.elements.name.value.trim(), form.elements.email.value.trim(), form.elements.password.value, form.elements.role.value); message.textContent = 'User account created.'; }
      else if (action === 'resend') { if (!form.elements.inviteId?.value) throw new Error('invite_required'); const resent = await repository.resendUserInvite(form.elements.inviteId.value); result.hidden = false; result.innerHTML = `<label>New secure invite link<textarea readonly rows="3">${escapeHtml(resent.inviteUrl)}</textarea></label><button class="ghost-btn" type="button" data-copy-user-access>Copy invite link</button>`; result.querySelector('[data-copy-user-access]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(resent.inviteUrl); message.textContent = 'New invite link copied.'; } catch { message.textContent = 'Select the link and copy it manually.'; } }); message.textContent = 'Invitation rotated and requeued; the previous link is no longer valid.'; }
      else if (action === 'revoke') { if (!form.elements.inviteId?.value) throw new Error('invite_required'); await repository.revokeUserInvite(form.elements.inviteId.value); message.textContent = 'Invitation revoked.'; }
      else { const userId = form.elements.userId?.value; if (!userId) throw new Error('user_required'); if (form.elements.operation.value === 'reset') { if (!form.elements.password.value) throw new Error('password_required'); await repository.resetUserPassword(userId, form.elements.password.value); message.textContent = 'Password reset.'; } else { const users = await loadUsers(); const user = users.find((item) => item.id === userId); await repository.updateUserStatus(userId, user?.status === 'Suspended' ? 'Active' : 'Suspended'); message.textContent = 'Account status updated.'; } }
      if (action !== 'invite') { setTimeout(() => dialog.close(), 700); document.querySelector('#drawer-refresh')?.click(); }
    } catch { message.textContent = 'Could not apply the access change. Check the fields and try again.'; }
    finally { submit.disabled = false; }
  });
})();
