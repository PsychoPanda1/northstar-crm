(() => {
  const repository = window.northstarRepository;
  if (!repository || document.querySelector('#bulk-import-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'bulk-import-dialog';
  dialog.className = 'workflow-dialog';
  dialog.innerHTML = '<button class="dialog-close" type="button" data-close-bulk-import aria-label="Close">×</button><div class="dialog-kicker">DATA ONBOARDING</div><h2 id="bulk-import-title">Review import</h2><p id="bulk-import-help">Preview the rows before writing anything to this service workspace.</p><form><p class="import-summary" data-import-summary role="status" aria-live="polite">Choose a CSV file to begin.</p><label class="checkbox-field"><input name="confirm" type="checkbox" required /> I reviewed the summary and want to import valid rows.</label><div class="workflow-actions"><button class="ghost-btn" type="button" data-close-bulk-import>Cancel</button><button class="primary-btn" type="submit" disabled>Import valid rows</button></div><p class="form-message" data-import-status role="status" aria-live="polite"></p></form>';
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'bulk-import-title');
  dialog.setAttribute('aria-describedby', 'bulk-import-help');
  const form = dialog.querySelector('form');
  const summary = dialog.querySelector('[data-import-summary]');
  const status = dialog.querySelector('[data-import-status]');
  const submit = form.querySelector('[type="submit"]');
  let kind = '';
  let rows = [];
  let key = '';
  dialog.querySelectorAll('[data-close-bulk-import]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  const open = (button) => {
    kind = button.id === 'import-assets' ? 'assets' : 'customers'; rows = []; key = crypto.randomUUID(); form.reset(); submit.disabled = true; summary.textContent = 'Choose a CSV file to begin.'; status.textContent = ''; dialog.querySelector('#bulk-import-title').textContent = kind === 'assets' ? 'Review equipment import' : 'Review customer import'; dialog.showModal();
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.csv,text/csv'; input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; status.textContent = 'Validating CSV…'; try { rows = parseCustomerCsv(await file.text()); const preview = kind === 'assets' ? await repository.importAssets(rows, { dryRun: true, idempotencyKey: key }) : await repository.importCustomers(rows, { dryRun: true, idempotencyKey: key }); summary.textContent = kind === 'assets' ? `${preview.created} new equipment · ${preview.matched} matched · ${preview.invalid} invalid` : `${preview.created} new customers · ${preview.matched} matched · ${preview.updated} enrichable · ${preview.invalid} invalid`; submit.disabled = false; status.textContent = 'Preview complete. No records have been written.'; } catch (error) { rows = []; submit.disabled = true; status.textContent = error?.message === 'csv_name_and_contact_columns_required' ? 'CSV needs name plus phone or email columns.' : 'Could not preview this CSV. Check the headers and try again.'; } finally { input.remove(); } }); input.click();
  };
  form.addEventListener('submit', async (event) => { event.preventDefault(); if (!rows.length || !form.reportValidity()) return; submit.disabled = true; status.textContent = 'Importing valid rows…'; try { const result = kind === 'assets' ? await repository.importAssets(rows, { dryRun: false, idempotencyKey: key }) : await repository.importCustomers(rows, { dryRun: false, idempotencyKey: key }); dialog.close(); showToast(kind === 'assets' ? `Imported ${result.created} equipment record${result.created === 1 ? '' : 's'}.` : `Imported ${result.created} customer${result.created === 1 ? '' : 's'}.`); openRecords(kind); } catch { status.textContent = 'Import failed. No retry was submitted; review the CSV and try again.'; submit.disabled = false; } });
  document.addEventListener('click', (event) => { const button = event.target.closest('#import-customers, #import-assets'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); open(button); }, true);
})();
