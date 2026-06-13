const App = (() => {
  const state = {
    mode: 'vision-test',
    trainingType: 'focus',
    difficulty: 'normal',
    lastConfig: null,
  };

  const trainings = {
    'vision-test': VisionTest,
    'focus':       FocusTraining,
    'muscle':      MuscleTraining,
    'tracking':    TrackingTraining,
  };

  const titles = {
    'vision-test': '視力測定',
    'focus':       'ピント調整トレーニング',
    'muscle':      '眼筋トレーニング',
    'tracking':    'トラッキングトレーニング',
  };

  let currentTraining = null;

  function init() {
    // モードボタン
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        document.getElementById('training-options').classList.toggle('hidden', state.mode !== 'training');
      });
    });

    // トレーニング種類ボタン
    document.querySelectorAll('.training-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.training-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.trainingType = btn.dataset.type;
      });
    });

    // 難易度ボタン
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.difficulty = btn.dataset.diff;
      });
    });

    // スタート
    document.getElementById('start-btn').addEventListener('click', startSession);

    // トレーニング中の「戻る」
    document.getElementById('training-back-btn').addEventListener('click', () => {
      if (currentTraining?.stop) currentTraining.stop();
      currentTraining = null;
      Router.show('menu');
    });

    // リトライ
    document.getElementById('retry-btn').addEventListener('click', () => {
      Router.show('training');
      startTraining();
    });

    // メニューへ戻る
    document.getElementById('menu-btn').addEventListener('click', () => {
      Router.show('menu');
    });
  }

  function startSession() {
    state.lastConfig = {
      mode:       state.mode === 'vision-test' ? 'vision-test' : state.trainingType,
      difficulty: state.difficulty,
    };
    Router.show('training');
    startTraining();
  }

  function startTraining() {
    const { mode, difficulty } = state.lastConfig;
    const container = document.getElementById('training-area');

    document.getElementById('training-title').textContent    = titles[mode];
    document.getElementById('training-progress').textContent = '';
    container.innerHTML = '';

    currentTraining = trainings[mode];
    currentTraining.start(container, difficulty, score => {
      Router.show('result');
      Result.display(mode, score, difficulty);
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
