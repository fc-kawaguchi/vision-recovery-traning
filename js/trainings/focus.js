const FocusTraining = (() => {
  const CONFIG = {
    easy:   { rounds: 8,  interval: 3500 },
    normal: { rounds: 12, interval: 2500 },
    hard:   { rounds: 16, interval: 1800 },
  };

  let state = null;

  function start(container, difficulty, onComplete) {
    const cfg = CONFIG[difficulty];
    state = {
      round: 0,
      scored: 0,
      cfg,
      phase: 'near',
      waiting: false,
      intervalTimer: null,
      onComplete,
    };

    container.innerHTML = `
      <p class="training-instruction">指示に従って視線を切り替え、ピントが合ったらボタンを押してください</p>
      <div class="timer-bar-container">
        <div class="timer-bar" id="focus-bar"></div>
      </div>
      <div id="focus-display" class="focus-display-area"></div>
      <p id="focus-phase-label" class="focus-phase-label"></p>
      <p id="focus-feedback" class="focus-feedback"></p>
      <button id="focus-btn" class="btn btn-primary focus-action-btn">
        ピントが合った！
      </button>
      <p id="focus-score-text" class="focus-score-text"></p>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .focus-display-area {
        width: 100%; min-height: 160px;
        display: flex; align-items: center; justify-content: center;
        margin: 0.75rem 0;
      }
      .focus-target-near {
        background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px;
        padding: 1.5rem 2rem; text-align: center; width: 100%;
      }
      .near-main { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem; }
      .near-sub  { font-size: 0.68rem; color: #94a3b8; line-height: 1.6; }
      .focus-target-far {
        background: #0f172a; border-radius: 10px; width: 100%; min-height: 150px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.875rem;
      }
      .far-dot   { width: 10px; height: 10px; background: white; border-radius: 50%; }
      .far-label { color: #94a3b8; font-size: 0.85rem; }
      .focus-phase-label { text-align: center; font-size: 1.2rem; font-weight: 700; color: #3b82f6; margin: 0.25rem 0; }
      .focus-feedback { text-align: center; font-size: 1rem; font-weight: 600; height: 1.5rem; margin: 0.25rem 0; }
      .focus-action-btn { min-width: 200px; font-size: 1rem; margin-top: 0.5rem; }
      .focus-score-text { margin-top: 0.625rem; color: #94a3b8; font-size: 0.88rem; text-align: center; }
    `;
    container.appendChild(style);

    document.getElementById('focus-btn').addEventListener('click', handleButton);
    updateProgress();
    nextPhase();
  }

  function nextPhase() {
    if (!state) return;
    if (state.round >= state.cfg.rounds) { finish(); return; }

    state.waiting      = true;
    state.timerElapsed = 0;
    state.paused       = false;
    state.phase        = state.round % 2 === 0 ? 'near' : 'far';

    const display  = document.getElementById('focus-display');
    const label    = document.getElementById('focus-phase-label');
    const btn      = document.getElementById('focus-btn');
    const feedback = document.getElementById('focus-feedback');

    if (state.phase === 'near') {
      display.innerHTML = `
        <div class="focus-target-near">
          <p class="near-main">近くのテキスト</p>
          <p class="near-sub">この小さな文字にしっかりピントを合わせてください。<br>文字がはっきり見えたらボタンを押しましょう。</p>
        </div>
      `;
      label.textContent = '📍 近くを見てください';
    } else {
      display.innerHTML = `
        <div class="focus-target-far">
          <div class="far-circles-wrap">
            <div class="far-circle"></div>
            <div class="far-circle"></div>
          </div>
          <p class="far-label">目の力を抜いて、画面の奥を見るイメージで<br>2つの○を1つに重ねてください</p>
        </div>
      `;
      label.textContent = '👁 2つの○を1つに見てください';
    }

    if (btn)      { btn.disabled = false; btn.style.opacity = '1'; }
    if (feedback) { feedback.textContent = ''; feedback.style.color = ''; }

    startTimer();
  }

  function startTimer() {
    const bar   = document.getElementById('focus-bar');
    if (!bar) return;
    bar.style.width = Math.max(0, 100 - (state.timerElapsed / state.cfg.interval) * 100) + '%';
    bar.className   = 'timer-bar';

    if (state.intervalTimer) clearInterval(state.intervalTimer);
    state.intervalTimer = setInterval(() => {
      if (!state || state.paused) return;
      state.timerElapsed += 100;
      const elapsed = state.timerElapsed;
      const pct = Math.max(0, 100 - (elapsed / state.cfg.interval) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.className = 'timer-bar danger';
      else if (pct < 60) bar.className = 'timer-bar warning';

      if (elapsed >= state.cfg.interval && state.waiting && !state.paused) {
        state.waiting = false;
        clearInterval(state.intervalTimer);
        const fb  = document.getElementById('focus-feedback');
        const btn = document.getElementById('focus-btn');
        if (fb)  { fb.textContent = '遅かった！次は素早く切り替えよう'; fb.style.color = '#ef4444'; }
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
        state.round++;
        updateProgress();
        setTimeout(nextPhase, 700);
      }
    }, 100);
  }

  function handleButton() {
    if (!state || !state.waiting) return;
    state.waiting = false;
    clearInterval(state.intervalTimer);

    state.scored++;
    const btn = document.getElementById('focus-btn');
    const fb  = document.getElementById('focus-feedback');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    if (fb)  { fb.textContent = '✓ グッド！'; fb.style.color = '#22c55e'; }

    state.round++;
    updateProgress();
    setTimeout(nextPhase, 700);
  }

  function updateProgress() {
    const el = document.getElementById('training-progress');
    if (el && state) el.textContent = state.round + ' / ' + state.cfg.rounds;
    const txt = document.getElementById('focus-score-text');
    if (txt && state) txt.textContent = '成功: ' + state.scored + ' / ' + state.round + ' 回';
  }

  function finish() {
    const score = Math.round((state.scored / state.cfg.rounds) * 100);
    const cb    = state.onComplete;
    state = null;
    cb(score);
  }

  function pause() {
    if (!state || state.paused) return;
    state.paused = true;
    clearInterval(state.intervalTimer);
  }

  function resume() {
    if (!state || !state.paused) return;
    state.paused = false;
    if (state.waiting) startTimer();
  }

  function stop() {
    if (state?.intervalTimer) clearInterval(state.intervalTimer);
    state = null;
  }

  return { start, pause, resume, stop };
})();
