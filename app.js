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
  let masterVolume = settings.volume !== undefined ? settings.volume : 0.8;

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
      soundEnabled: true,
      heartbeatEnabled: true,
      extremeMode: false,
      breathingMode: 'only_on_break',
      volume: 0.8
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

  function calculateStats() {
    const totalMinutes = historyData.reduce(function(acc, curr) { return acc + curr.duration; }, 0);
    const soulsTaken = (totalMinutes / 60).toFixed(1);
    
    let streak = 0;
    if (historyData.length > 0) {
      const dates = historyData.map(function(e) { return new Date(e.timestamp).toDateString(); });
      const uniqueDates = Array.from(new Set(dates)).sort(function(a, b) {
        return new Date(b) - new Date(a);
      });
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (uniqueDates.includes(today.toDateString()) || uniqueDates.includes(yesterday.toDateString())) {
        streak = 1;
        let checkDate = new Date(uniqueDates[0]); // Most recent
        for (let i = 1; i < uniqueDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (uniqueDates[i] === checkDate.toDateString()) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
    
    dom.soulsTakenVal.innerHTML = soulsTaken + '<small>h</small>';
    dom.streakVal.innerHTML = streak + '<small>d</small>';
  }

  function addHistoryEntry(duration) {
    const entry = {
      timestamp: new Date().toISOString(),
      duration: duration
    };
    historyData.unshift(entry);
    if (historyData.length > 100) {
      historyData = historyData.slice(0, 100);
    }
    saveHistory();
  }

  function renderHistory() {
    calculateStats();
    
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
    dom.extremeToggle = document.getElementById('extremeToggle');
    dom.fullscreenBtn = document.getElementById('fullscreenBtn');
    dom.soulsTakenVal = document.getElementById('soulsTakenVal');
    dom.streakVal = document.getElementById('streakVal');
    dom.quitModal = document.getElementById('quitModal');
    dom.punishBtn = document.getElementById('punishBtn');
    dom.cancelQuitBtn = document.getElementById('cancelQuitBtn');
    dom.volumeSlider = document.getElementById('volumeSlider');
    dom.volumeValue = document.getElementById('volumeValue');
    dom.heartbeatToggle = document.getElementById('heartbeatToggle');
    
    dom.breathingModeBtns = document.querySelectorAll('#breathingModeControl .segment-btn');
    dom.btnFocusBreathing = document.getElementById('btnFocusBreathing');
    dom.btnRelaxBreathing = document.getElementById('btnRelaxBreathing');
    dom.breathingTechniqueLabel = document.getElementById('breathingTechniqueLabel');
    dom.breathingPanel = document.getElementById('breathingPanel');
    dom.breathingCircleAnim = document.getElementById('breathingCircleAnim');
    dom.breathingTime = document.getElementById('breathingTime');
    dom.breathingReady = document.getElementById('breathingReady');
    dom.breathingPhaseText = document.getElementById('breathingPhaseText');
    dom.startBreathingBtn = document.getElementById('startBreathingBtn');
    dom.stopBreathingBtn = document.getElementById('stopBreathingBtn');
    dom.app = document.querySelector('.app');
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

    // Cookie Jar Mode (last 15 seconds of work)
    const isCookieJar = state.sessionType === 'work' && state.timeRemaining <= 15 && state.timeRemaining > 0;
    document.body.classList.toggle('cookie-jar-mode', isCookieJar);
    if (isCookieJar) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    const modeLabel = state.sessionType === 'work' ? 'WORK' : 'BREAK';
    document.title = formatTime(state.timeRemaining) + ' \u2014 ' + modeLabel + ' | Goggins Pomodoro';

    const isBreak = state.sessionType === 'break';
    dom.timerMode.textContent = modeLabel;
    dom.timerMode.classList.toggle('break-mode', isBreak);
    dom.ringProgress.classList.toggle('break-mode', isBreak);
    document.body.classList.toggle('break-active', isBreak);

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
      gain.gain.value = (volume || 0.15) * masterVolume;
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
        gain.gain.value = 0.12 * masterVolume;
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

  function playClickSound() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.15 * masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
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
      audio.volume = masterVolume;
      
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
    utterance.volume = masterVolume;
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

  let heartbeatInterval = null;
  function playHeartbeatTone() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4 * masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }

  function startHeartbeat() {
    if (heartbeatInterval || settings.heartbeatEnabled === false) return;
    heartbeatInterval = setInterval(function() {
      playHeartbeatTone();
      setTimeout(playHeartbeatTone, 150);
    }, 1000);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
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

  function attemptReset() {
    if (settings.extremeMode && state.mode === 'running') {
      openQuitModal();
    } else {
      resetTimer();
    }
  }

  function attemptSkip() {
    if (settings.extremeMode && state.mode === 'running') {
      openQuitModal();
    } else {
      skipSession();
    }
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
    stopHeartbeat();
    document.body.classList.remove('cookie-jar-mode');
    hideQuote();
    updateButtons();
    updateDogTags();
    updateDisplay();
    updateBreathingVisibility();
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
    updateBreathingVisibility();

    sendNotification(
      state.sessionType === 'work' ? '💀 Back to work!' : '🏆 Session complete!',
      state.sessionType === 'work' ? 'Break is over. Stay hard!' : 'Take a break. You earned it.'
    );

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
        dom.startBtn.classList.add('idle-pulse');
        dom.pauseBtn.style.display = 'none';
        dom.startBtn.textContent = state.timeRemaining < state.totalTime ? 'RESUME' : 'START';
        break;
      case 'running':
        dom.startBtn.style.display = 'none';
        dom.startBtn.classList.remove('idle-pulse');
        dom.pauseBtn.style.display = settings.extremeMode ? 'none' : '';
        break;
      case 'paused':
        dom.startBtn.style.display = '';
        dom.startBtn.classList.remove('idle-pulse');
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
    if (dom.heartbeatToggle) dom.heartbeatToggle.checked = settings.heartbeatEnabled !== false;
    dom.extremeToggle.checked = settings.extremeMode;
    if (dom.breathingModeBtns) {
      const mode = settings.breathingMode || 'only_on_break';
      dom.breathingModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === mode);
      });
    }
    dom.volumeSlider.value = Math.round(masterVolume * 100);
    dom.volumeValue.textContent = Math.round(masterVolume * 100) + '%';
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
    if (dom.heartbeatToggle) settings.heartbeatEnabled = dom.heartbeatToggle.checked;
    if (settings.heartbeatEnabled === false) stopHeartbeat();
    masterVolume = parseInt(dom.volumeSlider.value) / 100;
    settings.volume = masterVolume;
    
    const extremeChanged = settings.extremeMode !== dom.extremeToggle.checked;
    settings.extremeMode = dom.extremeToggle.checked;
    if (dom.breathingModeBtns) {
      const activeBtn = document.querySelector('#breathingModeControl .segment-btn.active');
      if (activeBtn) settings.breathingMode = activeBtn.dataset.value;
    }
    
    saveSettings();
    updateMuteButton();
    updateBreathingVisibility();
    if (extremeChanged) updateButtons();

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

  function openQuitModal() {
    dom.quitModal.classList.add('open');
    dom.quitModal.setAttribute('aria-hidden', 'false');
  }

  function closeQuitModal() {
    dom.quitModal.classList.remove('open');
    dom.quitModal.setAttribute('aria-hidden', 'true');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function updateMuteButton() {
    dom.muteBtn.classList.toggle('muted', !settings.soundEnabled);
  }

  function toggleMute() {
    settings.soundEnabled = !settings.soundEnabled;
    dom.soundToggle.checked = settings.soundEnabled;
    updateMuteButton();
    updateVolumeSliderState();
    saveSettings();
  }

  function updateVolumeSliderState() {
    if (dom.volumeSlider) {
      dom.volumeSlider.disabled = !settings.soundEnabled;
      dom.volumeSlider.style.opacity = settings.soundEnabled ? '1' : '0.35';
      dom.volumeSlider.style.cursor = settings.soundEnabled ? 'pointer' : 'not-allowed';
    }
  }

  function sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body: body, icon: '💀' }); } catch(e) {}
    }
  }

  let breathingState = {
    isActive: false,
    technique: 'focus',
    phaseIndex: 0,
    timeLeft: 4,
    intervalId: null
  };

  const FOCUS_PHASES = [
    { text: 'Inhale...', scaleClass: 'scale-150', duration: 4 },
    { text: 'Hold...', scaleClass: 'scale-150', duration: 4 },
    { text: 'Exhale...', scaleClass: 'scale-100', duration: 4 },
    { text: 'Hold...', scaleClass: 'scale-100', duration: 4 }
  ];

  const RELAX_PHASES = [
    { text: 'Inhale...', scaleClass: 'scale-150', duration: 4 },
    { text: 'Hold...', scaleClass: 'scale-150', duration: 7 },
    { text: 'Exhale...', scaleClass: 'scale-100', duration: 8 }
  ];

  function updateBreathingVisibility() {
    const isBreak = state.sessionType === 'break';
    const mode = settings.breathingMode || 'only_on_break';
    
    let isVisible = false;
    if (mode === 'always_visible') isVisible = true;
    else if (mode === 'only_on_break' && isBreak) isVisible = true;

    if (dom.breathingPanel) {
      dom.breathingPanel.classList.toggle('visible', isVisible);
      dom.breathingPanel.setAttribute('aria-hidden', !isVisible);
    }
    
    if (dom.app) {
      if (window.innerWidth >= 1024) {
        dom.app.classList.toggle('panel-open', isVisible);
      } else {
        dom.app.classList.remove('panel-open');
      }
    }

    if (!isVisible && breathingState.isActive) {
      stopBreathing();
    }
  }

  function startBreathing() {
    if (breathingState.isActive) return;
    breathingState.isActive = true;
    breathingState.phaseIndex = 0;
    
    const phases = breathingState.technique === 'focus' ? FOCUS_PHASES : RELAX_PHASES;
    breathingState.timeLeft = phases[0].duration;
    
    dom.startBreathingBtn.style.display = 'none';
    dom.stopBreathingBtn.style.display = '';
    dom.breathingReady.style.display = 'none';
    dom.breathingTime.style.display = '';
    
    dom.breathingPhaseText.classList.remove('opacity-0');
    dom.breathingPhaseText.classList.add('opacity-100');
    
    updateBreathingUI();
    
    breathingState.intervalId = setInterval(() => {
      breathingState.timeLeft--;
      if (breathingState.timeLeft < 1) {
        const phases = breathingState.technique === 'focus' ? FOCUS_PHASES : RELAX_PHASES;
        breathingState.phaseIndex = (breathingState.phaseIndex + 1) % phases.length;
        breathingState.timeLeft = phases[breathingState.phaseIndex].duration;
      }
      updateBreathingUI();
    }, 1000);
  }

  function stopBreathing() {
    if (!breathingState.isActive) return;
    breathingState.isActive = false;
    clearInterval(breathingState.intervalId);
    breathingState.intervalId = null;
    
    dom.startBreathingBtn.style.display = '';
    dom.stopBreathingBtn.style.display = 'none';
    dom.breathingReady.style.display = '';
    dom.breathingTime.style.display = 'none';
    
    dom.breathingPhaseText.classList.add('opacity-0');
    dom.breathingPhaseText.classList.remove('opacity-100');
    
    dom.breathingCircleAnim.style.transitionDuration = '0.5s';
    dom.breathingCircleAnim.className = 'breathing-circle-anim scale-100';
  }

  function updateBreathingUI() {
    dom.breathingTime.textContent = breathingState.timeLeft;
    
    const phases = breathingState.technique === 'focus' ? FOCUS_PHASES : RELAX_PHASES;
    const phase = phases[breathingState.phaseIndex];
    dom.breathingPhaseText.textContent = phase.text;
    
    dom.breathingCircleAnim.style.transitionDuration = `${phase.duration}s`;
    dom.breathingCircleAnim.className = `breathing-circle-anim ${phase.scaleClass}`;
  }

  function setBreathingTechnique(type) {
    breathingState.technique = type;
    if (dom.btnFocusBreathing) dom.btnFocusBreathing.classList.toggle('active', type === 'focus');
    if (dom.btnRelaxBreathing) dom.btnRelaxBreathing.classList.toggle('active', type === 'relax');
    
    if (dom.breathingTechniqueLabel) {
      dom.breathingTechniqueLabel.textContent = type === 'focus' ? 'FOCUS (BOX 4-4-4-4)' : 'RELAXATION (4-7-8)';
    }
    
    if (breathingState.isActive) stopBreathing();
  }

  function bindEvents() {
    // Add click sound to all buttons
    document.querySelectorAll('.btn, .btn-icon').forEach(function(btn) {
      btn.addEventListener('mousedown', playClickSound);
    });

    dom.startBtn.addEventListener('click', startTimer);
    dom.pauseBtn.addEventListener('click', pauseTimer);

    if (dom.startBreathingBtn) {
      dom.startBreathingBtn.addEventListener('click', startBreathing);
      dom.stopBreathingBtn.addEventListener('click', stopBreathing);
    }
    if (dom.btnFocusBreathing) dom.btnFocusBreathing.addEventListener('click', () => setBreathingTechnique('focus'));
    if (dom.btnRelaxBreathing) dom.btnRelaxBreathing.addEventListener('click', () => setBreathingTechnique('relax'));
    
    if (dom.breathingModeBtns) {
      dom.breathingModeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          dom.breathingModeBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
        });
      });
    }
    dom.resetBtn.addEventListener('click', attemptReset);
    dom.skipBtn.addEventListener('click', attemptSkip);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.settingsBtn.addEventListener('click', openSettings);
    dom.closeSettings.addEventListener('click', closeSettings);
    
    dom.historyBtn.addEventListener('click', openHistoryModal);
    dom.closeHistory.addEventListener('click', closeHistoryModal);
    dom.clearHistoryBtn.addEventListener('click', clearHistory);
    dom.fullscreenBtn.addEventListener('click', toggleFullscreen);

    let holdTimeout;
    function startHold() {
      dom.punishBtn.classList.add('holding');
      holdTimeout = setTimeout(function() {
        resetTimer();
        closeQuitModal();
      }, 3000);
    }
    function endHold() {
      clearTimeout(holdTimeout);
      dom.punishBtn.classList.remove('holding');
    }
    dom.punishBtn.addEventListener('mousedown', startHold);
    dom.punishBtn.addEventListener('mouseup', endHold);
    dom.punishBtn.addEventListener('mouseleave', endHold);
    dom.punishBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      startHold();
    });
    dom.punishBtn.addEventListener('touchend', endHold);
    dom.punishBtn.addEventListener('touchcancel', endHold);

    dom.cancelQuitBtn.addEventListener('click', closeQuitModal);

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
    dom.volumeSlider.addEventListener('input', function () {
      dom.volumeValue.textContent = this.value + '%';
      masterVolume = parseInt(this.value) / 100;
      settings.volume = masterVolume;
      saveSettings();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (dom.quitModal.classList.contains('open')) {
          closeQuitModal();
          return;
        }
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
      if (e.key === 'r' || e.key === 'R') attemptReset();
      if (e.key === 's' || e.key === 'S') attemptSkip();
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
    updateVolumeSliderState();
    updateDogTags();
    updateDisplay();
    updateButtons();
    updateBreathingVisibility();

    dom.ringProgress.setAttribute('stroke-dasharray', CIRCUMFERENCE);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
