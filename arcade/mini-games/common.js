(() => {
  let audio = null;
  window.arcadeSound = (
    frequency = 440,
    duration = 0.08,
    type = 'sine',
    volume = 0.05,
  ) => {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(frequency, audio.currentTime);
      g.gain.setValueAtTime(volume, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + duration);
    } catch {}
  };
  window.arcadeBest = (key, score) => {
    try {
      const best = Math.max(Number(localStorage.getItem(key)) || 0, score);
      localStorage.setItem(key, String(best));
      return best;
    } catch {
      return score;
    }
  };
  window.arcadeReadBest = (key) => {
    try {
      return Number(localStorage.getItem(key)) || 0;
    } catch {
      return 0;
    }
  };
  window.arcadeSaveRun = (key, value) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ ...value, savedAt: Date.now() }),
      );
    } catch {
      /* Running a game must not depend on storage access. */
    }
  };
  window.arcadeLoadRun = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && Date.now() - value.savedAt < 86400000 ? value : null;
    } catch {
      return null;
    }
  };
  window.arcadeClearRun = (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Storage is optional. */
    }
  };
})();
