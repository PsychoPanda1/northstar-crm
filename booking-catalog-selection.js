(function attachBookingCatalogSelection(global) {
  const requested = new URLSearchParams(global.location?.search || '').get('catalogItemId')?.trim() || '';
  if (!requested || !global.NorthstarLandingClient?.prototype) return;
  const prototype = global.NorthstarLandingClient.prototype;
  if (prototype.__northstarCatalogSelection) return;
  prototype.__northstarCatalogSelection = true;
  let validCatalogItemId = '';
  const originalCatalog = prototype.catalog;
  const originalAvailability = prototype.availability;
  prototype.catalog = async function catalogWithSelection(...args) {
    const result = await originalCatalog.apply(this, args);
    const items = Array.isArray(result?.items) ? result.items : [];
    validCatalogItemId = items.some((item) => String(item?.id || '') === requested) ? requested : '';
    return result;
  };
  prototype.availability = function availabilityWithSelection(options = {}) {
    const next = { ...options };
    if (!next.catalogItemId && validCatalogItemId) next.catalogItemId = validCatalogItemId;
    return originalAvailability.call(this, next);
  };
  const select = global.document?.querySelector('#service-select');
  if (!select) return;
  const sync = () => {
    if (!validCatalogItemId || ![...select.options].some((option) => option.value === validCatalogItemId)) return;
    select.value = validCatalogItemId;
    select.setAttribute('aria-describedby', 'service-selection-help');
  };
  const help = global.document.createElement('p');
  help.id = 'service-selection-help'; help.textContent = 'This service was selected from the landing page.'; help.hidden = true;
  select.closest('label')?.append(help);
  new global.MutationObserver(sync).observe(select, { childList: true });
  sync();
})(globalThis);
