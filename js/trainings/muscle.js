const MuscleTraining = (() => {
  // 8方向 (x,y は フィールド内の % 位置)
  const ALL_DIRS = [
    { id: 'up',         label: '↑', x: 50, y: 12 },
    { id: 'up-right',   label: '↗', x: 82, y: 12 },
    { id: 'right',      label: '→', x: 88, y: 50 },
    { id: 'down-right', label: '↘', x: 82, y: 82 },
    { id: 'down',       label: '↓', x: 50, y: 88 },
    { id: 'down-left',  label: '↙', x: 18, y: 82 },
    { id: 'left',       label: '←', x: 12, y: 50 },
    { id: 'up-left',    label: '↖', x: 18, y: 12 },
  ];

  const CONFIG = {
    easy:   { rounds: 8,  showTime: 2500, dirs: ['up', 'right', 'down', 'left'] },
    normal: { rounds: 12, showTime: 2000, dirs: ALL_DIRS.map(d => d.id) },
    hard:   { rounds: 16, showTime: 1400, dirs: ALL_DIRS.map(d => d.id) },
  };

  let state = null;

  function start(container, difficulty, onComplete) {
    const cfg  = CONFIG[difficulty];
    const dirs = cfg.dirs.map(id => ALL_DIRS.find(d => d.id === id));

    state = {
      round: 0, correct: 0,
      cfg, dirs,
      currentDir: null,
      answered: false,
      timer: null,
      onComplete,
    };

    const btnHtml = dirs.map(d =>
      `<button class="muscle-dir-btn" data-dir="${d.id}" title="${d.id}">${d.label}</button>`
    ).join('');

    container.innerHTML = `
      <p class="training-instruction">点が現れた方向を目で追い、対応するボタンを押してください</p>
      <div class="timer-bar-container">
        <div class="timer-bar" id="muscle-bar"></div>
      </div>
      <div id="muscle-field" class="muscle-field">
        <div class="muscle-center-cross">+</div>
        <div id="muscle-dot" class="muscle-dot" style="display:none;"></div>
      </div>
      <p id="muscle-feedback" class="muscle-feedback"></p>
      <div class="muscle-btn-wrap">${btnHtml}</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .muscle-field {
        position: relative; width: 100%; padding-top: 55%;
        background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 12px;
        overflow: hidden; margin: 0.75rem 0;
      }
      .muscle-center-cross {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.4rem; color: #cbd5e1; user-select: none;
      }
      .muscle-dot {
        position: absolute; width: 18px; height: 18px;
        background: #3b82f6; border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 5px rgba(59,130,246,0.25);
        animation: dotAppear 0.18s ease;
      }
      .muscle-feedback { text-align:center; font-size:1.05rem; font-weight:600; height:1.5rem; margin:0.25rem 0; }
      .muscle-btn-wrap  { display:flex; flex-wrap:wrap; justify-content:center; gap:0.5rem; }
      .muscle-dir-btn   {
        width: 50px; height: 50px; font-size: 1.25rem;
        border-radius: 8px; border: 2px solid #e2e8f0; background: white;
        transition: border-color 0.15s, background 0.15s;
      }
      .muscle-dir-btn:hover:not(:disabled) { border-color: #3b82f6; background: #eff6ff; }
      .muscle-dir-btn:disabled { cursor: default; opacity: 0.7; }
      .muscle-dir-btn.correct  { border-color: #22c55e; background: #f0fdf4; }
      .muscle-dir-btn.wrong    { border-color: #ef4444; background: #fef2f2; }
    `;
    container.appendChild(style);

    container.querySelectorAll('.muscle-dir-btn').forEach(btn => {
      btn.addEventListener('click', () => answer(btn.dataset.dir, btn));
    });

    updateProgress();
    nextRound();
  }

  function nextRound() {
    if (!state) return;
    if (state.round >= state.cfg.rounds) { finish(); return; }

    state.answered     = false;
    state.timerElapsed = 0;
    state.paused       = false;
    const pick         = state.dirs[Math.floor(Math.random() * state.dirs.length)];
    state.currentDir = pick.id;

    const dot = document.getElementById('muscle-dot');
    if (dot) {
      dot.style.display = 'block';
      dot.style.left    = pick.x + '%';
      dot.style.top     = pick.y + '%';
      // トリガー再アニメーション
      dot.classList.remove('muscle-dot');
      void dot.offsetWidth;
      dot.classList.add('muscle-dot');
    }

    document.querySelectorAll('.muscle-dir-btn').forEach(b => {
      b.classList.remove('correct', 'wrong');
      b.disabled = false;
    });
    const fb = document.getElementById('muscle-feedback');
    if (fb) { fb.textContent = ''; fb.style.color = ''; }

    startTimer();
  }

  function startTimer() {
    const bar   = document.getElementById('muscle-bar');
    if (!bar) return;
    bar.style.width = Math.max(0, 100 - (state.timerElapsed / state.cfg.showTime) * 100) + '%';
    bar.className   = 'timer-bar';

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (!state || state.paused) return;
      state.timerElapsed += 100;
      const pct = Math.max(0, 100 - (state.timerElapsed / state.cfg.showTime) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.className = 'timer-bar danger';
      else if (pct < 60) bar.className = 'timer-bar warning';

      if (state.timerElapsed >= state.cfg.showTime && !state.answered) {
        answer(null, null);
      }
    }, 100);
  }

  function answer(dir, btn) {
    if (!state || state.answered) return;
    state.answered = true;
    clearInterval(state.timer);

    const dot = document.getElementById('muscle-dot');
    if (dot) dot.style.display = 'none';
    document.querySelectorAll('.muscle-dir-btn').forEach(b => { b.disabled = true; });
    const fb = document.getElementById('muscle-feedback');

    if (dir === state.currentDir) {
      state.correct++;
      if (btn) btn.classList.add('correct');
      if (fb) { fb.textContent = '✓ 正解！'; fb.style.color = '#22c55e'; }
    } else {
      const correctBtn = document.querySelector(`.muscle-dir-btn[data-dir="${state.currentDir}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      if (btn) btn.classList.add('wrong');
      if (fb) { fb.textContent = dir ? '✗ 不正解' : '⏱ 時間切れ'; fb.style.color = '#ef4444'; }
    }

    state.round++;
    updateProgress();
    setTimeout(nextRound, 850);
  }

  function updateProgress() {
    const el = document.getElementById('training-progress');
    if (el && state) el.textContent = state.round + ' / ' + state.cfg.rounds;
  }

  function finish() {
    const score = Math.round((state.correct / state.cfg.rounds) * 100);
    const cb    = state.onComplete;
    state = null;
    cb(score);
  }

  function pause() {
    if (!state || state.paused) return;
    state.paused = true;
    clearInterval(state.timer);
  }

  function resume() {
    if (!state || !state.paused) return;
    state.paused = false;
    if (!state.answered) startTimer();
  }

  function stop() {
    if (state?.timer) clearInterval(state.timer);
    state = null;
  }

  return { start, pause, resume, stop };
})();
