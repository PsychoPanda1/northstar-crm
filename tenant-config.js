// Presentation-only tenant configurations for the demo portal.
// Production authorization must resolve tenantId from the authenticated session.
const NORTHSTAR_TENANTS = {
  default: { slug: 'johnson-service-co', businessName: 'Johnson Service Co.', serviceLabel: 'Home services', accent: '#2d9d73', accentSoft: '#e9f7f0', focus: 'Keep every customer interaction connected.' },
  plumbing: { slug: 'clearwater-plumbing', businessName: 'Clearwater Plumbing', serviceLabel: 'Plumbing', accent: '#3689c1', accentSoft: '#e8f3fb', focus: 'Turn urgent calls into confident, scheduled work.' },
  powerwashing: { slug: 'lowcountry-wash-co', businessName: 'Lowcountry Wash Co.', serviceLabel: 'Power washing', accent: '#d88b38', accentSoft: '#fff2df', focus: 'Keep every property and follow-up moving.' },
  electrician: { slug: 'palmetto-electric', businessName: 'Palmetto Electric', serviceLabel: 'Electrical', accent: '#a271d1', accentSoft: '#f1eafa', focus: 'Make every service call clear, safe, and profitable.' },
  carwash: { slug: 'harbor-shine', businessName: 'Harbor Shine Mobile', serviceLabel: 'Mobile car wash', accent: '#3f9da6', accentSoft: '#e5f5f5', focus: 'Keep routes full and customers coming back.' }
};

function resolveTenant() {
  const requested = new URLSearchParams(window.location.search).get('service');
  return NORTHSTAR_TENANTS[requested] || NORTHSTAR_TENANTS.default;
}
