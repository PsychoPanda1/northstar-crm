(() => {
  const repository = window.northstarRepository;
  if (!repository?.getRouteSummary || !document.querySelector('#record-list') || document.querySelector('#dispatch-route-summary-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'dispatch-route-summary-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-route-summary aria-label="Close">×</button><div class="dialog-kicker">DISPATCH ROUTING</div><h2>Route summary</h2><p>Review workload, assignment coverage, and planned field time for a dispatch date.</p><form><label>Date <span>(optional)</span><input name="date" type="date" /></label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-route-summary>Cancel</button><button class="primary-btn" type="submit">Load summary</button></div><p class="form-message" data-route-summary-message role="status" aria-live="polite"></p></form><div data-route-summary-result class="profile-section" hidden></div>';
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const message = dialog.querySelector('[data-route-summary-message]');
  const result = dialog.querySelector('[data-route-summary-result]');
  const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  dialog.querySelectorAll('[data-close-route-summary]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true; result.hidden = true; message.textContent = 'Loading route summary…';
    try {
      const summary = await repository.getRouteSummary(form.elements.date.value.trim());
      const workload = (summary.technicians || []).map((item) => `<li><strong>${escape(item.technician)}</strong><span>${item.stops} stop${item.stops === 1 ? '' : 's'} · ${item.plannedMinutes} planned minutes</span></li>`).join('');
      result.innerHTML = `<span class="record-id">${escape(summary.date)} · DISPATCH COVERAGE</span><div class="profile-grid"><div><strong>${summary.totalStops}</strong><small>Total stops</small></div><div><strong>${summary.assignedStops}</strong><small>Assigned</small></div><div><strong>${summary.unassignedStops}</strong><small>Unassigned</small></div><div><strong>${summary.plannedMinutes}</strong><small>Planned minutes</small></div></div>${workload ? `<p class="record-id">TECHNICIAN WORKLOAD</p><ul class="summary-list">${workload}</ul>` : '<p class="muted">No normalized appointments for this date.</p>'}`;
      result.hidden = false; message.textContent = 'Summary loaded.';
    } catch { message.textContent = 'Could not load the route summary. Check the date and session, then try again.'; }
    finally { submit.disabled = false; }
  });
  document.addEventListener('click', (event) => { const button = event.target.closest('[data-route-summary]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); form.reset(); result.hidden = true; message.textContent = ''; dialog.showModal(); form.elements.date.focus(); }, true);
})();
