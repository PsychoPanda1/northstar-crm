const tenant = resolveTenant();
document.documentElement.style.setProperty('--tenant-accent', tenant.accent);
document.documentElement.style.setProperty('--tenant-accent-soft', tenant.accentSoft);
document.querySelectorAll('[data-tenant-name]').forEach((node) => { node.textContent = tenant.businessName; });
document.querySelectorAll('[data-service-label]').forEach((node) => { node.textContent = node.closest('.eyebrow') ? tenant.serviceLabel.toUpperCase() : tenant.serviceLabel; });
document.querySelector('[data-focus-line]').textContent = tenant.focus;
const toast = document.querySelector('#toast');
const loginDialog = document.querySelector('#login-dialog');
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
document.querySelector('#new-job').addEventListener('click', () => {
  showToast('New job workspace ready to configure.');
});
document.querySelectorAll('.task-list input').forEach((input) => {
  input.addEventListener('change', () => {
    const text = input.closest('label').querySelector('span');
    text.classList.toggle('done', input.checked);
  });
});
document.querySelectorAll('nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('nav a.active').classList.remove('active');
    link.classList.add('active');
  });
});
document.querySelector('#workspace-switcher').addEventListener('click', () => loginDialog.showModal());
document.querySelector('#owner-account').addEventListener('click', () => loginDialog.showModal());
document.querySelector('#close-login').addEventListener('click', () => loginDialog.close());
document.querySelector('#demo-login').addEventListener('click', () => { loginDialog.close(); showToast(`Demo session active for ${tenant.businessName}.`); });
