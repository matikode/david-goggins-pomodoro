(function () {
  'use strict';

  const QUOTES = [
    "Don't stop when you're tired. Stop when you're done.",
    "The only way to grow is to go where it's uncomfortable.",
    "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.",
    "Callus your mind like you callus your hands.",
    "Who's gonna carry the boats?"
  ];

  const START_PHRASES = [
    "Let's get it! Stay hard!",
    "No excuses! Let's go!",
    "It's time to suffer. Embrace it!",
    "You're not done yet. Get after it!",
    "Discipline equals freedom. Start now!"
  ];

  const BREAK_END_PHRASE = "Get back to work! Stay hard!";

  const CIRCUMFERENCE = 2 * Math.PI * 90;
  const DEFAULT_WORK = 25;
  const DEFAULT_BREAK = 5;
  const DEFAULT_LONG_BREAK = 15;
  const POMODOROS_BEFORE_LONG = 4;

  const STORAGE_KEY = 'goggins_pomodoro_settings';
  const HISTORY_KEY = 'goggins_pomodoro_history';

  let state = {
    mode: 'idle',
    sessionType: 'work',
    timeRemaining: DEFAULT_WORK * 60,
    totalTime: DEFAULT_WORK * 60,
    completedPomodoros: 0,
    quoteIndex: 0,
    intervalId: null,
    autoStartTimeout: null
  };

  let settings = loadSettings();
  let historyData = loadHistory();

  const dom = {};
  let audioCtx = null;

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      workDuration: DEFAULT_WORK,
      breakDuration: DEFAULT_BREAK,
      longBreakDuration: DEFAULT_LONG_BREAK,
      soundEnabled: true
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyData));
    } catch (e) {}
  }

  function addHistoryEntry(duration) {
    const entry = {
      timestamp: new Date().toISOString(),
      duration: duration
    };
    historyData.unshift(entry); // Add to beginning
    saveHistory();
  }

  function renderHistory() {
    if (historyData.length === 0) {
      dom.historyList.innerHTML = '<div class="history-empty">No sessions completed yet. Get after it!</div>';
      return;
    }

    dom.historyList.innerHTML = historyData.map(function(entry) {
      const dateObj = new Date(entry.timestamp);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="history-item">
          <div>
            <div class="history-item-date">${dateStr}</div>
            <div class="history-item-time">${timeStr}</div>
          </div>
          <div class="history-item-duration">${entry.duration} MIN</div>
        </div>
      `;
    }).join('');
  }

  function cacheDom() {
    dom.timeDisplay = document.getElementById('timeDisplay');
    dom.timerMode = document.getElementById('timerMode');
    dom.ringProgress = document.getElementById('ringProgress');
    dom.ringContainer = document.querySelector('.timer-ring-container');
    dom.dogTags = document.querySelectorAll('.dog-tag');
    dom.quoteDisplay = document.getElementById('quoteDisplay');
    dom.startBtn = document.getElementById('startBtn');
    dom.pauseBtn = document.getElementById('pauseBtn');
    dom.resetBtn = document.getElementById('resetBtn');
    dom.skipBtn = document.getElementById('skipBtn');
    dom.muteBtn = document.getElementById('muteBtn');
    
    dom.settingsBtn = document.getElementById('settingsBtn');
    dom.settingsModal = document.getElementById('settingsModal');
    dom.closeSettings = document.getElementById('closeSettings');
    
    dom.historyBtn = document.getElementById('historyBtn');
    dom.historyModal = document.getElementById('historyModal');
    dom.closeHistory = document.getElementById('closeHistory');
    dom.historyList = document.getElementById('historyList');
    dom.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    dom.workSlider = document.getElementById('workSlider');
    dom.breakSlider = document.getElementById('breakSlider');
    dom.longBreakSlider = document.getElementById('longBreakSlider');
    dom.workValue = document.getElementById('workValue');
    dom.breakValue = document.getElementById('breakValue');
    dom.longBreakValue = document.getElementById('longBreakValue');
    dom.soundToggle = document.getElementById('soundToggle');
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateDisplay() {
    dom.timeDisplay.textContent = formatTime(state.timeRemaining);

    const fraction = state.totalTime > 0 ? state.timeRemaining / state.totalTime : 1;
    const offset = CIRCUMFERENCE * (1 - fraction);
    dom.ringProgress.setAttribute('stroke-dashoffset', offset);

    const modeLabel = state.sessionType === 'work' ? 'WORK' : 'BREAK';
    document.title = formatTime(state.timeRemaining) + ' \u2014 ' + modeLabel + ' | Goggins Pomodoro';

    const isBreak = state.sessionType === 'break';
    dom.timerMode.textContent = modeLabel;
    dom.timerMode.classList.toggle('break-mode', isBreak);
    dom.ringProgress.classList.toggle('break-mode', isBreak);

    const isFlashing = state.mode === 'running' && state.timeRemaining <= 10 && state.timeRemaining > 0;
    dom.ringContainer.classList.toggle('flashing', isFlashing);
  }

  function updateDogTags() {
    const cyclePos = state.completedPomodoros % POMODOROS_BEFORE_LONG;
    const allFilled = cyclePos === 0 && state.completedPomodoros > 0 && state.sessionType === 'work';
    dom.dogTags.forEach(function (tag, i) {
      const isFilled = allFilled || i < cyclePos;
      tag.classList.toggle('filled', isFilled);
    });
  }

  function showQuote(text) {
    dom.quoteDisplay.textContent = text;
    dom.quoteDisplay.classList.add('visible');
  }

  function hideQuote() {
    dom.quoteDisplay.classList.remove('visible');
  }

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, volume) {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = volume || 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playTick() {
    playTone(800, 0.06, 'square', 0.08);
  }

  function playAlarm() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      for (let i = 0; i < 3; i++) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        osc1.frequency.value = 440;
        osc2.frequency.value = 880;
        gain.gain.value = 0.12;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(ctx.currentTime + i * 0.5);
        osc2.start(ctx.currentTime + i * 0.5);
        osc1.stop(ctx.currentTime + 0.4 + i * 0.5);
        osc2.stop(ctx.currentTime + 0.4 + i * 0.5);
      }
    } catch (e) {}
  }

  function speak(text) {
    if (!settings.soundEnabled) return;

    // Mapeo de frases a archivos de audio de David Goggins en assets/audio/
    const audioMapping = {
      "Let's get it! Stay hard!": "assets/audio/start_0.mp3",
      "No excuses! Let's go!": "assets/audio/start_1.mp3",
      "It's time to suffer. Embrace it!": "assets/audio/start_2.mp3",
      "You're not done yet. Get after it!": "assets/audio/start_3.mp3",
      "Discipline equals freedom. Start now!": "assets/audio/start_4.mp3",
      "Don't stop when you're tired. Stop when you're done.": "assets/audio/quote_0.mp3",
      "The only way to grow is to go where it's uncomfortable.": "assets/audio/quote_1.mp3",
      "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.": "assets/audio/quote_2.mp3",
      "Callus your mind like you callus your hands.": "assets/audio/quote_3.mp3",
      "Who's gonna carry the boats?": "assets/audio/quote_4.mp3",
      "Get back to work! Stay hard!": "assets/audio/break_end.mp3"
    };

    const audioPath = audioMapping[text];

    if (audioPath) {
      const audio = new Audio(audioPath);
      
      // Intentamos reproducir el archivo de audio real
      audio.play().then(() => {
        // Reproducción exitosa de la voz real de Goggins
      }).catch((err) => {
        // Si el archivo no existe o falla la reproducción (ej. no se ha colocado el archivo MP3),
        // hacemos fallback a la síntesis de voz nativa del navegador.
        speakWithTTS(text);
      });
    } else {
      speakWithTTS(text);
    }
  }

  function speakWithTTS(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 0.6;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const deepVoice = voices.find(function (v) {
      return v.lang.startsWith('en') && v.name.toLowerCase().includes('male');
    });
    if (deepVoice) {
      utterance.voice = deepVoice;
    } else {
      const enVoice = voices.find(function (v) {
        return v.lang.startsWith('en');
      });
      if (enVoice) utterance.voice = enVoice;
    }
    window.speechSynthesis.speak(utterance);
  }

  function getSessionDuration() {
    if (state.sessionType === 'work') return settings.workDuration * 60;
    const cyclePosition = state.completedPomodoros % POMODOROS_BEFORE_LONG;
    if (cyclePosition === 0 && state.completedPomodoros > 0) {
      return settings.longBreakDuration * 60;
    }
    return settings.breakDuration * 60;
  }

  function isLongBreak() {
    return state.sessionType === 'break' && (state.completedPomodoros % POMODOROS_BEFORE_LONG) === 0 && state.completedPomodoros > 0;
  }

  function startTimer() {
    if (state.mode === 'running') return;

    if (state.mode === 'idle') {
      state.totalTime = getSessionDuration();
      state.timeRemaining = state.totalTime;
    }

    state.mode = 'running';
    updateButtons();

    if (state.sessionType === 'work' && state.timeRemaining === state.totalTime) {
      const phrase = START_PHRASES[state.quoteIndex % START_PHRASES.length];
      speak(phrase);
      showQuote(QUOTES[state.quoteIndex % QUOTES.length]);
    } else {
      hideQuote();
    }

    state.intervalId = setInterval(tick, 1000);
    updateDisplay();
  }

  function pauseTimer() {
    if (state.mode !== 'running') return;
    state.mode = 'paused';
    clearInterval(state.intervalId);
    state.intervalId = null;
    updateButtons();
  }

  function resetTimer() {
    clearInterval(state.intervalId);
    clearTimeout(state.autoStartTimeout);
    state.intervalId = null;
    state.autoStartTimeout = null;
    state.mode = 'idle';
    state.sessionType = 'work';
    state.totalTime = settings.workDuration * 60;
    state.timeRemaining = state.totalTime;
    state.completedPomodoros = 0;
    hideQuote();
    updateButtons();
    updateDogTags();
    updateDisplay();
  }

  function skipSession() {
    clearInterval(state.intervalId);
    clearTimeout(state.autoStartTimeout);
    state.intervalId = null;
    state.autoStartTimeout = null;
    transitionToNext();
  }

  function transitionToNext() {
    if (state.sessionType === 'work') {
      state.completedPomodoros++;
      addHistoryEntry(settings.workDuration);
      updateDogTags();
      playAlarm();
      const quote = QUOTES[state.quoteIndex % QUOTES.length];
      state.quoteIndex++;
      speak(quote);
      showQuote(quote);

      state.sessionType = 'break';
      state.mode = 'idle';
      state.totalTime = getSessionDuration();
      state.timeRemaining = state.totalTime;
    } else {
      speak(BREAK_END_PHRASE);
      showQuote(BREAK_END_PHRASE);
      state.sessionType = 'work';
      state.mode = 'idle';
      state.totalTime = settings.workDuration * 60;
      state.timeRemaining = state.totalTime;
      updateDogTags();
    }

    updateButtons();
    updateDisplay();

    state.autoStartTimeout = setTimeout(function () {
      if (state.mode === 'idle') {
        startTimer();
      }
    }, 2000);
  }

  function tick() {
    if (state.mode !== 'running') return;

    state.timeRemaining--;

    if (state.timeRemaining <= 10 && state.timeRemaining > 0) {
      playTick();
    }

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      clearInterval(state.intervalId);
      state.intervalId = null;
      updateDisplay();
      transitionToNext();
      return;
    }

    updateDisplay();
  }

  function updateButtons() {
    switch (state.mode) {
      case 'idle':
        dom.startBtn.style.display = '';
        dom.pauseBtn.style.display = 'none';
        dom.startBtn.textContent = state.timeRemaining < state.totalTime ? 'RESUME' : 'START';
        break;
      case 'running':
        dom.startBtn.style.display = 'none';
        dom.pauseBtn.style.display = '';
        break;
      case 'paused':
        dom.startBtn.style.display = '';
        dom.pauseBtn.style.display = 'none';
        dom.startBtn.textContent = 'RESUME';
        break;
    }
  }

  function openSettings() {
    dom.workSlider.value = settings.workDuration;
    dom.breakSlider.value = settings.breakDuration;
    dom.longBreakSlider.value = settings.longBreakDuration;
    dom.workValue.textContent = settings.workDuration;
    dom.breakValue.textContent = settings.breakDuration;
    dom.longBreakValue.textContent = settings.longBreakDuration;
    dom.soundToggle.checked = settings.soundEnabled;
    updateMuteButton();

    dom.settingsModal.classList.add('open');
    dom.settingsModal.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    dom.settingsModal.classList.remove('open');
    dom.settingsModal.setAttribute('aria-hidden', 'true');

    const changed = settings.workDuration !== parseInt(dom.workSlider.value) ||
      settings.breakDuration !== parseInt(dom.breakSlider.value) ||
      settings.longBreakDuration !== parseInt(dom.longBreakSlider.value);

    settings.workDuration = parseInt(dom.workSlider.value);
    settings.breakDuration = parseInt(dom.breakSlider.value);
    settings.longBreakDuration = parseInt(dom.longBreakSlider.value);
    settings.soundEnabled = dom.soundToggle.checked;
    saveSettings();
    updateMuteButton();

    if (changed && state.mode === 'idle') {
      if (state.sessionType === 'work') {
        state.totalTime = settings.workDuration * 60;
      } else {
        state.totalTime = getSessionDuration();
      }
      state.timeRemaining = state.totalTime;
      updateDisplay();
    }
  }

  function openHistoryModal() {
    renderHistory();
    dom.historyModal.classList.add('open');
    dom.historyModal.setAttribute('aria-hidden', 'false');
  }

  function closeHistoryModal() {
    dom.historyModal.classList.remove('open');
    dom.historyModal.setAttribute('aria-hidden', 'true');
  }

  function clearHistory() {
    if (confirm("Are you sure you want to delete all history?")) {
      historyData = [];
      saveHistory();
      renderHistory();
    }
  }

  function updateMuteButton() {
    dom.muteBtn.classList.toggle('muted', !settings.soundEnabled);
  }

  function toggleMute() {
    settings.soundEnabled = !settings.soundEnabled;
    dom.soundToggle.checked = settings.soundEnabled;
    updateMuteButton();
    saveSettings();
  }

  function bindEvents() {
    dom.startBtn.addEventListener('click', startTimer);
    dom.pauseBtn.addEventListener('click', pauseTimer);
    dom.resetBtn.addEventListener('click', resetTimer);
    dom.skipBtn.addEventListener('click', skipSession);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.settingsBtn.addEventListener('click', openSettings);
    dom.closeSettings.addEventListener('click', closeSettings);
    
    dom.historyBtn.addEventListener('click', openHistoryModal);
    dom.closeHistory.addEventListener('click', closeHistoryModal);
    dom.clearHistoryBtn.addEventListener('click', clearHistory);

    dom.settingsModal.addEventListener('click', function (e) {
      if (e.target === dom.settingsModal) closeSettings();
    });
    
    dom.historyModal.addEventListener('click', function (e) {
      if (e.target === dom.historyModal) closeHistoryModal();
    });

    dom.workSlider.addEventListener('input', function () {
      dom.workValue.textContent = this.value;
    });
    dom.breakSlider.addEventListener('input', function () {
      dom.breakValue.textContent = this.value;
    });
    dom.longBreakSlider.addEventListener('input', function () {
      dom.longBreakValue.textContent = this.value;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (dom.settingsModal.classList.contains('open')) {
          closeSettings();
          return;
        }
        if (dom.historyModal.classList.contains('open')) {
          closeHistoryModal();
          return;
        }
      }
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.mode === 'running') pauseTimer();
        else startTimer();
      }
      if (e.key === 'r' || e.key === 'R') resetTimer();
      if (e.key === 's' || e.key === 'S') skipSession();
    });

    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.getVoices();
      };
    }
  }

  function init() {
    cacheDom();
    bindEvents();

    state.totalTime = settings.workDuration * 60;
    state.timeRemaining = state.totalTime;

    updateMuteButton();
    updateDogTags();
    updateDisplay();
    updateButtons();

    dom.ringProgress.setAttribute('stroke-dasharray', CIRCUMFERENCE);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
