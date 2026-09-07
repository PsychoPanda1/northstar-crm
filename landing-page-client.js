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

    async validateOwnerSession(result) {
      const manifest = await this.manifest();
      const tenantMismatch = result?.tenant?.slug && manifest?.tenant?.slug && result.tenant.slug !== manifest.tenant.slug;
      if (tenantMismatch) throw new Error('owner_session_tenant_mismatch');
      if (result?.service && result.service !== this.service && !result?.tenant?.slug) throw new Error('owner_session_service_mismatch');
      return result;
    }

    async tenant() {
      const manifest = await this.manifest();
      return manifest.tenant || {};
    }

    async publicContact() {
      const tenant = await this.tenant();
      return { ...(tenant.contactPhone ? { phone: tenant.contactPhone } : {}), ...(tenant.contactEmail ? { email: tenant.contactEmail } : {}), ...(tenant.serviceArea ? { serviceArea: tenant.serviceArea } : {}) };
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

    async ownerPortalUrl() {
      const manifest = await this.manifest();
      return this.url(manifest.integration.ownerPortalPath);
    }

    async ownerPasswordLogin(email, password) {
      const manifest = await this.manifest();
      const integration = manifest.integration || {};
      if (!Array.isArray(integration.ownerAuthMethods) || !integration.ownerAuthMethods.includes('password') || !integration.ownerAuthEndpoint) {
        const error = new Error('password_owner_auth_unavailable');
        error.status = 404;
        throw error;
      }
      if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) throw new Error('owner_credentials_required');
      const endpoint = new URL(this.url(integration.ownerAuthEndpoint));
      endpoint.searchParams.set('service', this.service);
      return this.validateOwnerSession(await this.request(`${endpoint.pathname}${endpoint.search}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, service: this.service })
      }));
    }

    async ownerOidcLogin(idToken) {
      const manifest = await this.manifest();
      const integration = manifest.integration || {};
      if (!Array.isArray(integration.ownerAuthMethods) || !integration.ownerAuthMethods.includes('oidc') || !integration.ownerOidcAuthEndpoint) {
        const error = new Error('oidc_owner_auth_unavailable');
        error.status = 404;
        throw error;
      }
      if (typeof idToken !== 'string' || !idToken.trim() || idToken.length > 20_000) throw new Error('identity_token_required');
      const endpoint = new URL(this.url(integration.ownerOidcAuthEndpoint));
      endpoint.searchParams.set('service', this.service);
      return this.validateOwnerSession(await this.request(`${endpoint.pathname}${endpoint.search}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: idToken.trim(), service: this.service })
      }));
    }

    async refreshOwnerSession(token) {
      const manifest = await this.manifest();
      const endpoint = manifest.integration?.ownerAuthRefreshEndpoint;
      if (!endpoint) {
        const error = new Error('owner_session_refresh_unavailable');
        error.status = 404;
        throw error;
      }
      if (typeof token !== 'string' || !token.trim() || token.length > 20_000) throw new Error('owner_session_token_required');
      const refreshUrl = new URL(this.url(endpoint));
      refreshUrl.searchParams.set('service', this.service);
      return this.validateOwnerSession(await this.request(`${refreshUrl.pathname}${refreshUrl.search}`, { method: 'POST', headers: { authorization: `Bearer ${token.trim()}` } }));
    }

    async logoutOwnerSession(token) {
      const manifest = await this.manifest();
      const endpoint = manifest.integration?.ownerAuthLogoutEndpoint;
      if (!endpoint) {
        const error = new Error('owner_session_logout_unavailable');
        error.status = 404;
        throw error;
      }
      if (typeof token !== 'string' || !token.trim() || token.length > 20_000) throw new Error('owner_session_token_required');
      return this.request(endpoint, { method: 'POST', headers: { authorization: `Bearer ${token.trim()}` } });
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
