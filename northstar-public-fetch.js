(() => {
  if (typeof globalThis.fetch !== 'function' || globalThis.northstarPublicFetch) return;
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.northstarPublicFetch = async (input, init = {}) => {
    const timeoutMs = Number(init.timeoutMs ?? 20000);
    if (typeof globalThis.AbortController !== 'function' || typeof globalThis.setTimeout !== 'function') return nativeFetch(input, init);
    const controller = new globalThis.AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000);
    const { timeoutMs: _timeoutMs, ...requestInit } = init;
    try { return await nativeFetch(input, { ...requestInit, signal: controller.signal }); } finally { globalThis.clearTimeout(timeout); }
  };
  globalThis.fetch = globalThis.northstarPublicFetch;
})();
