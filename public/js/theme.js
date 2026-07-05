const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved preference
if (localStorage.getItem('theme') === 'dark') {
  body.classList.add('dark-mode');
  if (themeToggle) themeToggle.textContent = 'Light';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? 'Light' : 'Dark';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}