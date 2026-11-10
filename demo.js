// Demo only: stands in for Webflow's form handler (which posts to Webflow) and shows what would be sent.
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.id !== 'contact') return;
  e.preventDefault();
  const hidden = [...form.querySelectorAll('input[type=hidden]')].map((i) => `${i.name}: ${i.value}`);
  document.getElementById('captured').textContent = hidden.length ? hidden.join('\n') : '(no attribution parameters on this visit)';
  form.hidden = true;
  form.parentElement.querySelector('.w-form-done').hidden = false;
});
