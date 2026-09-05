(function attachNorthstarLandingClient(global) {
  const json = (value) => JSON.stringify(value, Object.keys(value || {}).sort());
  const makeKey = (service, scope, payload) => {
    const storageKey = `northstar-landing-retry-${service}-${scope}-${json(payload)}`;
    try {
      const stored = global.sessionStorage?.getItem(storageKey);
      if (stored) return stored;
      const next = global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      global.sessionStorage?.setItem(storageKey, next);
      return next;
    } catch {
      return global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };

  class NorthstarLandingClient {
    constructor({ service, apiBase = global.location?.origin || '' } = {}) {
      if (!service || typeof service !== 'string') throw new Error('service_required');
      this.service = service;
      this.apiBase = String(apiBase).replace(/\/+$/, '');
      this.manifestPromise = null;
    }

    url(path) {
      return new URL(path, `${this.apiBase || global.location?.origin || ''}/`).toString();
    }

    async request(path, options = {}) {
      const response = await global.fetch(this.url(path), { ...options, headers: { accept: 'application/json', ...(options.headers || {}) } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.error || `northstar_request_failed_${response.status}`);
        error.status = response.status;
        error.requestId = response.requestId || response.headers.get('x-request-id') || null;
        throw error;
      }
      return body;
    }

    async manifest() {
      if (!this.manifestPromise) this.manifestPromise = this.request(`/api/public/tenant?service=${encodeURIComponent(this.service)}`);
      return this.manifestPromise;
    }

    async catalog() {
      const manifest = await this.manifest();
      return this.request(manifest.integration.catalogEndpoint);
    }

    async availability({ days = 7, catalogItemId = '' } = {}) {
      const manifest = await this.manifest();
      const url = new URL(this.url(manifest.integration.availabilityEndpoint));
      url.searchParams.set('days', String(days));
      if (catalogItemId) url.searchParams.set('catalogItemId', catalogItemId);
      return this.request(`${url.pathname}${url.search}`);
    }

    async submitLead(payload, { idempotencyKey } = {}) {
      const manifest = await this.manifest();
      const key = idempotencyKey || makeKey(this.service, 'lead', payload);
      return this.request(manifest.integration.leadEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ ...payload, service: this.service })
      });
    }

    async book(payload, { idempotencyKey } = {}) {
      const manifest = await this.manifest();
      const key = idempotencyKey || makeKey(this.service, 'booking', payload);
      return this.request(manifest.integration.bookingEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ ...payload, service: this.service })
      });
    }
  }

  global.NorthstarLandingClient = NorthstarLandingClient;
})(globalThis);
