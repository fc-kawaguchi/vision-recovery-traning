const MuscleTraining = (() => {
  // 4方向 (x,y はフィールド内の % 位置)
  const DIRS = [
    { id: 'up',    label: '↑', x: 50, y:  8 },
    { id: 'right', label: '→', x: 92, y: 50 },
    { id: 'down',  label: '↓', x: 50, y: 92 },
    { id: 'left',  label: '←', x:  8, y: 50 },
  ];

  const CONFIGS = {
    easy:   { rounds: 8,  showTime: 2800 },
    normal: { rounds: 12, showTime: 2000 },
    hard:   { rounds: 16, showTime: 1400 },
  };

  let state           = null;
  let keyboardHandler = null;

  function start(container, difficulty, onComplete) {
    const cfg = CONFIGS[difficulty] || CONFIGS.normal;
    state = {
      round: 0, correct: 0,
      cfg,
      currentDir: null,
      answered: false,
      timer: null,
      onComplete,
    };

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
      <div class="direction-cross" id="muscle-cross">
        <div class="cross-empty"></div>
        <button class="direction-btn" data-dir="up">↑</button>
        <div class="cross-empty"></div>
        <button class="direction-btn" data-dir="left">←</button>
        <div class="cross-empty"></div>
        <button class="direction-btn" data-dir="right">→</button>
        <div class="cross-empty"></div>
        <button class="direction-btn" data-dir="down">↓</button>
        <div class="cross-empty"></div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .muscle-field {
        position: relative; width: 100%;
        height: min(55vw, calc(100vh - 340px)); min-height: 180px;
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
      .muscle-feedback { text-align:center; font-size:1.05rem; font-weight:600; height:1.5rem; margin:0.25rem 0 0; }
    `;
    container.appendChild(style);

    container.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => answer(btn.dataset.dir, btn));
    });

    if (keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
    keyboardHandler = (e) => {
      const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const dir = dirMap[e.key];
      if (!dir) return;
      e.preventDefault();
      const btn = document.querySelector(`#muscle-cross .direction-btn[data-dir="${dir}"]`);
      if (btn && !btn.disabled) btn.click();
    };
    document.addEventListener('keydown', keyboardHandler);

    updateProgress();
    nextRound();
  }

  function nextRound() {
    if (!state) return;
    if (state.round >= state.cfg.rounds) { finish(); return; }

    state.answered     = false;
    state.timerElapsed = 0;
    state.paused       = false;
    const pick         = DIRS[Math.floor(Math.random() * DIRS.length)];
    state.currentDir   = pick.id;

    const dot = document.getElementById('muscle-dot');
    if (dot) {
      dot.style.display = 'block';
      dot.style.left    = pick.x + '%';
      dot.style.top     = pick.y + '%';
      dot.classList.remove('muscle-dot');
      void dot.offsetWidth;
      dot.classList.add('muscle-dot');
    }

    document.querySelectorAll('.direction-btn').forEach(b => {
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
    document.querySelectorAll('.direction-btn').forEach(b => { b.disabled = true; });
    const fb = document.getElementById('muscle-feedback');

    if (dir === state.currentDir) {
      state.correct++;
      if (btn) btn.classList.add('correct');
      if (fb) { fb.textContent = '✓ 正解！'; fb.style.color = '#22c55e'; }
    } else {
      const correctBtn = document.querySelector(`.direction-btn[data-dir="${state.currentDir}"]`);
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
    if (keyboardHandler) { document.removeEventListener('keydown', keyboardHandler); keyboardHandler = null; }
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
    if (keyboardHandler) { document.removeEventListener('keydown', keyboardHandler); keyboardHandler = null; }
    if (state?.timer) clearInterval(state.timer);
    state = null;
  }

  return { start, pause, resume, stop };
})();
