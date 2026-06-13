const TrackingTraining = (() => {
  const CONFIG = {
    easy:   { duration: 30000, speed: 1.8, flashEvery: 3200, ballSize: 32 },
    normal: { duration: 30000, speed: 2.8, flashEvery: 2200, ballSize: 26 },
    hard:   { duration: 30000, speed: 4.0, flashEvery: 1500, ballSize: 20 },
  };

  let state           = null;
  let animFrame       = null;
  let keyboardHandler = null;

  function start(container, difficulty, onComplete) {
    const cfg = CONFIG[difficulty];
    state = {
      cfg,
      onComplete,
      hits: 0, flashes: 0,
      bx: 0, by: 0,
      vx: (Math.random() > 0.5 ? 1 : -1) * cfg.speed,
      vy: (Math.random() > 0.5 ? 1 : -1) * cfg.speed,
      isFlashing: false,
      startTime: 0,
      flashTimer: null,
      endTimer: null,
    };

    container.innerHTML = `
      <p class="training-instruction">動くボールを目で追い、<strong>赤くなったら素早くタップ！</strong></p>
      <div class="timer-bar-container">
        <div class="timer-bar" id="track-bar"></div>
      </div>
      <div id="track-field" class="track-field">
        <div id="track-ball" class="track-ball"></div>
        <span id="track-countdown" class="track-countdown"></span>
      </div>
      <div class="track-stats">
        <span>ヒット <strong id="track-hits">0</strong></span>
        <span>フラッシュ <strong id="track-flashes">0</strong></span>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .track-field {
        position: relative; width: 100%;
        height: min(62vw, calc(100vh - 300px)); min-height: 200px;
        background: #0f172a; border-radius: 12px; overflow: hidden;
        cursor: crosshair; touch-action: none; margin: 0.5rem 0;
      }
      .track-ball {
        position: absolute; border-radius: 50%;
        background: #60a5fa;
        box-shadow: 0 0 10px rgba(96,165,250,0.55);
        transform: translate(-50%, -50%);
        transition: background 0.08s;
        cursor: pointer;
      }
      .track-ball.flash {
        background: #ef4444;
        box-shadow: 0 0 22px rgba(239,68,68,0.85);
        animation: trackBallBounce 0.28s ease;
      }
      .track-ball.hit {
        background: #22c55e;
        box-shadow: 0 0 22px rgba(34,197,94,0.85);
        animation: hitFlash 0.28s ease;
      }
      .track-countdown {
        position: absolute; top: 0.6rem; right: 0.875rem;
        color: #475569; font-size: 0.85rem; font-weight: 600;
        pointer-events: none;
      }
      .track-stats {
        display: flex; justify-content: center; gap: 2.5rem;
        color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;
      }
      .track-stats strong { color: #1e293b; }
    `;
    container.appendChild(style);

    const ball = document.getElementById('track-ball');
    ball.style.width  = cfg.ballSize + 'px';
    ball.style.height = cfg.ballSize + 'px';

    ball.addEventListener('click', onHit);
    ball.addEventListener('touchstart', e => { e.preventDefault(); onHit(); }, { passive: false });

    // フィールド全体をクリックでもヒット判定（PC マウス操作のため）
    const field = document.getElementById('track-field');
    field.addEventListener('click', onHit);

    // Enter キーでもヒット判定
    if (keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
    keyboardHandler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onHit(); }
    };
    document.addEventListener('keydown', keyboardHandler);

    // フィールドサイズ確定後に開始
    requestAnimationFrame(() => {
      const field = document.getElementById('track-field');
      state.bx = field.offsetWidth  * 0.5;
      state.by = field.offsetHeight * 0.5;
      state.startTime = Date.now();
      loop();
      scheduleFlash();
      state.endTimer = setTimeout(finish, cfg.duration);
    });
  }

  function loop() {
    if (!state) return;

    const field = document.getElementById('track-field');
    if (!field) return;

    const fw  = field.offsetWidth;
    const fh  = field.offsetHeight;
    const r   = state.cfg.ballSize / 2;

    state.bx += state.vx;
    state.by += state.vy;

    if (state.bx - r <= 0)  { state.bx = r;      state.vx =  Math.abs(state.vx); }
    if (state.bx + r >= fw) { state.bx = fw - r; state.vx = -Math.abs(state.vx); }
    if (state.by - r <= 0)  { state.by = r;       state.vy =  Math.abs(state.vy); }
    if (state.by + r >= fh) { state.by = fh - r;  state.vy = -Math.abs(state.vy); }

    const ball = document.getElementById('track-ball');
    if (ball) {
      ball.style.left = state.bx + 'px';
      ball.style.top  = state.by + 'px';
    }

    // タイマーバー & カウントダウン
    const elapsed = Date.now() - state.startTime;
    const pct     = Math.max(0, 100 - (elapsed / state.cfg.duration) * 100);
    const bar     = document.getElementById('track-bar');
    if (bar) {
      bar.style.width = pct + '%';
      if (pct < 30) bar.className = 'timer-bar danger';
      else if (pct < 60) bar.className = 'timer-bar warning';
    }
    const cd = document.getElementById('track-countdown');
    if (cd) cd.textContent = Math.ceil((state.cfg.duration - elapsed) / 1000) + 's';

    animFrame = requestAnimationFrame(loop);
  }

  function scheduleFlash() {
    if (!state) return;
    const jitter = (Math.random() - 0.5) * 600;
    state.flashTimer = setTimeout(() => {
      if (!state) return;
      state.isFlashing = true;
      state.flashes++;
      document.getElementById('track-flashes').textContent = state.flashes;
      const ball = document.getElementById('track-ball');
      if (ball) ball.classList.add('flash');

      // 1秒後に自動消灯
      setTimeout(() => {
        if (!state || !state.isFlashing) return;
        state.isFlashing = false;
        const b = document.getElementById('track-ball');
        if (b) b.classList.remove('flash');
        scheduleFlash();
      }, 900);
    }, state.cfg.flashEvery + jitter);
  }

  function onHit() {
    if (!state || !state.isFlashing) return;
    state.isFlashing = false;
    state.hits++;

    const ball = document.getElementById('track-ball');
    if (ball) {
      ball.classList.remove('flash');
      ball.classList.add('hit');
      setTimeout(() => ball && ball.classList.remove('hit'), 280);
    }
    document.getElementById('track-hits').textContent = state.hits;

    clearTimeout(state.flashTimer);
    scheduleFlash();
  }

  function finish() {
    if (!state) return;
    if (keyboardHandler) { document.removeEventListener('keydown', keyboardHandler); keyboardHandler = null; }
    cancelAnimationFrame(animFrame);
    clearTimeout(state.flashTimer);
    clearTimeout(state.endTimer);

    const score = state.flashes > 0
      ? Math.round((state.hits / state.flashes) * 100)
      : 0;
    const cb = state.onComplete;
    state = null;
    cb(score);
  }

  function pause() {
    if (!state || state.paused) return;
    state.paused    = true;
    state.pauseTs   = Date.now();
    cancelAnimationFrame(animFrame);
    clearTimeout(state.flashTimer);
    clearTimeout(state.endTimer);
  }

  function resume() {
    if (!state || !state.paused) return;
    const pausedMs   = Date.now() - state.pauseTs;
    state.startTime += pausedMs; // 開始時刻を後ろにずらして残り時間を維持
    state.paused     = false;
    loop();
    scheduleFlash();
    const remaining = state.cfg.duration - (Date.now() - state.startTime);
    if (remaining > 0) state.endTimer = setTimeout(finish, remaining);
    else finish();
  }

  function stop() {
    if (keyboardHandler) { document.removeEventListener('keydown', keyboardHandler); keyboardHandler = null; }
    cancelAnimationFrame(animFrame);
    if (state) {
      clearTimeout(state.flashTimer);
      clearTimeout(state.endTimer);
    }
    state = null;
  }

  return { start, pause, resume, stop };
})();
