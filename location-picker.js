(function attachLocationPicker(global) {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\'\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const bind = () => {
    const form = document.querySelector('#new-job-form');
    if (!form || form.dataset.locationPickerBound) return;
    const customerSelect = form.elements.customerId;
    const catalogLabel = form.elements.catalogItemId?.closest('label');
    if (!customerSelect || !catalogLabel) return;
    const label = document.createElement('label');
    label.innerHTML = '<span>Service location</span><select name="locationId"><option value="">Primary service address</option></select>';
    catalogLabel.after(label);
    const locationSelect = label.querySelector('select');
    const loadLocations = async () => {
      locationSelect.innerHTML = '<option value="">Loading service locations…</option>';
      if (!customerSelect.value) {
        locationSelect.innerHTML = '<option value="">Primary service address</option>';
        return;
      }
      try {
        const profile = await global.northstarRepository.getCustomerProfile(customerSelect.value);
        const locations = profile.locations || [];
        locationSelect.innerHTML = locations.map((item, index) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label || `Service address ${index + 1}`)} · ${escapeHtml(item.address)}</option>`).join('') || '<option value="">Primary service address</option>';
      } catch {
        locationSelect.innerHTML = '<option value="">Primary service address</option>';
      }
    };
    customerSelect.addEventListener('change', loadLocations);
    new MutationObserver(loadLocations).observe(customerSelect, { childList: true });
    form.dataset.locationPickerBound = 'true';
    loadLocations();
  };
  new MutationObserver(bind).observe(document.body, { childList: true, subtree: true });
  bind();
})(globalThis);
