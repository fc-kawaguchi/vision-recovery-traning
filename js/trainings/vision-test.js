const VisionTest = (() => {
  const PHASES = [
    { id: 'right', label: '右目', emoji: '&#128065;', instruction: '左目を手のひらで優しく覆い、右目だけで見てください' },
    { id: 'left',  label: '左目', emoji: '&#128065;', instruction: '右目を手のひらで優しく覆い、左目だけで見てください' },
    { id: 'both',  label: '両目', emoji: '&#128064;', instruction: '両目を開けて、普段通りに見てください' },
  ];

  const DIRS = ['up', 'right', 'down', 'left'];
  const DIR_LABELS = { up: '↑', right: '→', down: '↓', left: '←' };

  // 測定範囲ごとの VA レベル定義
  const VA_LEVELS = {
    low:    [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.7, 1.0],
    medium: [0.5, 0.6, 0.7, 0.8, 1.0, 1.2, 1.5],
    high:   [1.0, 1.2, 1.5, 1.8, 2.0],
  };

  const TIME_LIMIT   = 6000; // ms per round
  const MIN_RADIUS   = 8;
  const MAX_RADIUS   = 150;
  const ROUNDS_EACH  = 10;  // 1フェーズあたりの問題数

  // VA × 距離 × DPI からリング半径(px)を計算
  function computeRadius(va, distanceCm, dpi) {
    const pxPerCm = dpi / 2.54;
    const gapCm   = distanceCm / (va * 3438);
    return (gapCm * pxPerCm) / 0.55;
  }

  // テストアイテム一覧 (大→小の順)
  function buildTestItems(settings) {
    const { distance, dpi, range } = settings;
    return VA_LEVELS[range]
      .map(va => ({ va, radius: Math.round(computeRadius(va, distance, dpi)) }))
      .filter(item => item.radius >= MIN_RADIUS && item.radius <= MAX_RADIUS)
      .sort((a, b) => b.radius - a.radius); // 大きい（低VA）→小さい（高VA）
  }

  // items を count 問になるよう調整（不足時は先頭からループ）
  function selectTestItems(items, count) {
    if (items.length === 0) return [];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(items[i % items.length]);
    }
    return result;
  }

  function drawLandoltC(canvas, radius, direction) {
    const ctx = canvas.getContext('2d');
    const cx  = canvas.width / 2;
    const cy  = canvas.height / 2;
    const lw  = Math.max(radius * 0.22, 5);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'butt';

    const gapHalf = Math.asin(0.275);
    const rotMap  = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI };

    ctx.beginPath();
    ctx.arc(cx, cy, radius, rotMap[direction] + gapHalf, rotMap[direction] + Math.PI * 2 - gapHalf);
    ctx.stroke();
  }

  let state           = null;
  let keyboardHandler = null;

  function start(container, settings, onComplete) {
    const testItems = selectTestItems(buildTestItems(settings), ROUNDS_EACH);

    state = {
      settings,
      testItems,
      phaseIdx: 0,
      results: {},
      // current phase
      round: 0,
      correctItems: [],
      currentItem: null,
      currentDir: null,
      answered: false,
      timerElapsed: 0,
      timer: null,
      paused: false,
      container,
      onComplete,
    };

    if (testItems.length === 0) {
      showNoItemsWarning(container, settings, onComplete);
      return;
    }

    showPhaseIntro();
  }

  function showNoItemsWarning(container, settings, onComplete) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem;">
        <p style="font-size:1.3rem; margin-bottom:1rem;">&#9888;&#65039;</p>
        <p style="font-weight:700; margin-bottom:0.75rem;">測定できる範囲がありません</p>
        <p style="color:#64748b; font-size:0.9rem; line-height:1.7; margin-bottom:1.5rem;">
          選択した設定（${settings.distance}cm / ${settings.dpi}dpi / 測定範囲）では<br>
          画面上で表示できるリングサイズがありません。<br>
          <strong>距離を長くする</strong>か<strong>測定範囲を変更</strong>してください。
        </p>
        <button id="vt-back-to-menu" class="btn btn-secondary">メニューに戻る</button>
      </div>
    `;
    document.getElementById('vt-back-to-menu').addEventListener('click', () => {
      Router.show('menu');
    });
  }

  function showPhaseIntro() {
    if (!state) return;
    const phase    = PHASES[state.phaseIdx];
    const phaseNum = state.phaseIdx + 1;
    const { settings } = state;

    state.container.innerHTML = `
      <div class="vt-intro">
        <div class="vt-step-indicator">
          ${PHASES.map((p, i) => `<span class="vt-step ${i === state.phaseIdx ? 'active' : i < state.phaseIdx ? 'done' : ''}">${p.label}</span>`).join('<span class="vt-step-sep">→</span>')}
        </div>
        <div class="vt-intro-emoji">${phase.emoji}</div>
        <h3 class="vt-intro-title">${phase.label}のテスト（${phaseNum}/3）</h3>
        <p class="vt-intro-desc">${phase.instruction}</p>
        <div class="vt-settings-badge">
          ${settings.distance}cm ／ ${settings.dpi}dpi ／ ${state.testItems.length}問
        </div>
        <button id="vt-phase-start" class="btn btn-primary" style="margin-top:1.25rem; min-width:200px;">
          準備ができた — 開始する
        </button>
      </div>
    `;

    injectVTStyles(state.container);
    document.getElementById('vt-phase-start').addEventListener('click', startPhase);
    updateHeaderProgress();
  }

  function injectVTStyles(container) {
    if (container.querySelector('style.vt-style')) return;
    const style = document.createElement('style');
    style.className = 'vt-style';
    style.textContent = `
      .vt-intro { text-align:center; padding:0.25rem 0; width:100%; }
      .vt-step-indicator { display:flex; align-items:center; justify-content:center; gap:0.4rem; margin-bottom:1.25rem; }
      .vt-step { font-size:0.8rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:100px;
                 background:#f1f5f9; color:#94a3b8; }
      .vt-step.active { background:#eff6ff; color:#3b82f6; }
      .vt-step.done   { background:#f0fdf4; color:#22c55e; }
      .vt-step-sep { font-size:0.75rem; color:#cbd5e1; }
      .vt-intro-emoji  { font-size:2.75rem; line-height:1; margin-bottom:0.75rem; }
      .vt-intro-title  { font-size:1.2rem; font-weight:700; margin-bottom:0.625rem; }
      .vt-intro-desc   { font-size:0.92rem; color:#64748b; line-height:1.7; max-width:300px; margin:0 auto 0.875rem; }
      .vt-settings-badge { display:inline-block; background:#f1f5f9; border:1px solid #e2e8f0;
                            border-radius:8px; padding:0.4rem 1rem; font-size:0.82rem; color:#64748b; font-weight:600; }
      .vt-phase-banner { display:flex; justify-content:center; margin-bottom:0.5rem; }
      .vt-phase-badge  { background:#eff6ff; color:#3b82f6; padding:0.25rem 1rem;
                         border-radius:100px; font-weight:700; font-size:0.88rem; }
      .vt-feedback { text-align:center; font-size:1.05rem; font-weight:600; min-height:1.6rem;
                     margin:0.625rem 0 0; }
      .vt-va-label { text-align:center; font-size:0.8rem; color:#94a3b8; margin-bottom:0.25rem; }
    `;
    container.appendChild(style);
  }

  function startPhase() {
    if (!state) return;
    state.round        = 0;
    state.correctItems = [];
    state.timerElapsed = 0;

    const phase = PHASES[state.phaseIdx];
    state.container.innerHTML = `
      <div class="vt-phase-banner">
        <span class="vt-phase-badge">${phase.label} — ${state.testItems.length}問</span>
      </div>
      <p class="training-instruction">Cの切れ目の方向を答えてください（大→小の順に表示）</p>
      <div class="timer-bar-container">
        <div class="timer-bar" id="vt-bar"></div>
      </div>
      <p class="vt-va-label" id="vt-va-label"></p>
      <canvas id="vt-canvas" width="300" height="220" style="margin:0 auto 0.25rem;"></canvas>
      <!-- 十字ボタン -->
      <div class="direction-cross" id="vt-cross">
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
      <p id="vt-feedback" class="vt-feedback"></p>
      <p class="vt-keyboard-hint">PC: ↑↓←→ キーでも回答できます</p>
    `;

    injectVTStyles(state.container);

    state.container.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => answer(btn.dataset.dir, btn));
    });

    // キーボード対応
    if (keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
    keyboardHandler = (e) => {
      const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const dir = dirMap[e.key];
      if (!dir) return;
      e.preventDefault();
      const btn = state?.container.querySelector(`.direction-btn[data-dir="${dir}"]`);
      if (btn && !btn.disabled) btn.click();
    };
    document.addEventListener('keydown', keyboardHandler);

    updatePhaseProgress();
    nextRound();
  }

  function nextRound() {
    if (!state) return;
    if (state.round >= state.testItems.length) { finishPhase(); return; }

    state.answered     = false;
    state.timerElapsed = 0;
    state.currentItem  = state.testItems[state.round];
    state.currentDir   = DIRS[Math.floor(Math.random() * 4)];

    // VA ラベル更新
    const vaLabel = document.getElementById('vt-va-label');
    if (vaLabel) vaLabel.textContent = `視力 ${state.currentItem.va.toFixed(2)} 相当`;

    const canvas = document.getElementById('vt-canvas');
    if (canvas) drawLandoltC(canvas, state.currentItem.radius, state.currentDir);

    state.container.querySelectorAll('.direction-btn').forEach(b => {
      b.classList.remove('correct', 'wrong');
      b.disabled = false;
    });
    const fb = document.getElementById('vt-feedback');
    if (fb) { fb.textContent = ''; fb.style.color = ''; }

    startTimer();
    updatePhaseProgress();
  }

  function startTimer() {
    const bar = document.getElementById('vt-bar');
    if (!bar) return;
    bar.className = 'timer-bar';
    bar.style.width = Math.max(0, 100 - (state.timerElapsed / TIME_LIMIT) * 100) + '%';

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (!state || state.paused) return;
      state.timerElapsed += 100;
      const pct = Math.max(0, 100 - (state.timerElapsed / TIME_LIMIT) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.className = 'timer-bar danger';
      else if (pct < 60) bar.className = 'timer-bar warning';
      if (state.timerElapsed >= TIME_LIMIT && !state.answered) answer(null, null);
    }, 100);
  }

  function answer(dir, btn) {
    if (!state || state.answered) return;
    state.answered = true;
    clearInterval(state.timer);

    state.container.querySelectorAll('.direction-btn').forEach(b => { b.disabled = true; });
    const fb = document.getElementById('vt-feedback');

    if (dir === state.currentDir) {
      state.correctItems.push(state.currentItem);
      if (btn) btn.classList.add('correct');
      if (fb) { fb.textContent = '✓ 正解！'; fb.style.color = '#22c55e'; }
    } else {
      const cb = state.container.querySelector(`.direction-btn[data-dir="${state.currentDir}"]`);
      if (cb) cb.classList.add('correct');
      if (btn) btn.classList.add('wrong');
      if (fb) { fb.textContent = dir ? '✗ 不正解' : '⏱ 時間切れ'; fb.style.color = '#ef4444'; }
    }

    state.round++;
    setTimeout(nextRound, 900);
  }

  function finishPhase() {
    if (!state) return;
    if (keyboardHandler) {
      document.removeEventListener('keydown', keyboardHandler);
      keyboardHandler = null;
    }
    const phaseId = PHASES[state.phaseIdx].id;

    // 正解した中で最も高いVA（最小リング = 最高VA）
    const achievedVA = state.correctItems.length > 0
      ? Math.max(...state.correctItems.map(i => i.va))
      : null; // 全滅

    state.results[phaseId] = {
      label:        PHASES[state.phaseIdx].label,
      achievedVA,
      correctCount: state.correctItems.length,
      totalCount:   state.testItems.length,
    };

    state.phaseIdx++;

    if (state.phaseIdx >= PHASES.length) {
      const cb  = state.onComplete;
      const res = { type: 'vision-test', settings: state.settings, phases: state.results };
      state = null;
      cb(res);
    } else {
      showPhaseIntro();
    }
  }

  function updateHeaderProgress() {
    const el = document.getElementById('training-progress');
    if (el && state) el.textContent = (state.phaseIdx + 1) + ' / 3 パート';
  }

  function updatePhaseProgress() {
    const el = document.getElementById('training-progress');
    if (!el || !state) return;
    const phase = PHASES[state.phaseIdx];
    if (phase) el.textContent = phase.label + '  ' + state.round + ' / ' + state.testItems.length;
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
    if (keyboardHandler) {
      document.removeEventListener('keydown', keyboardHandler);
      keyboardHandler = null;
    }
    if (state?.timer) clearInterval(state.timer);
    state = null;
  }

  return { start, pause, resume, stop };
})();
