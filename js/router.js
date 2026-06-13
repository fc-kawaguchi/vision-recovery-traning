const Router = (() => {
  function show(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + screenId).classList.add('active');
    window.scrollTo(0, 0);
  }
  return { show };
})();
