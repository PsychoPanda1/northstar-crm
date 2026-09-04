const toast = document.querySelector('#toast');
document.querySelector('#new-job').addEventListener('click', () => {
  toast.textContent = 'New job workspace ready to configure.';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
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
