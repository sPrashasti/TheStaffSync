// Applies the saved light/dark theme before the app loads, so the page never flashes.
// A separate file (not inline) so the Content-Security-Policy can forbid inline scripts.
(function () {
  var mode = 'light';
  try {
    var saved = localStorage.getItem('mui-mode');
    if (saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) mode = 'dark';
  } catch { /* storage blocked: use light */ }
  document.documentElement.classList.add(mode);
})();
