/* ============================================================================
   audio-mixer.js — one volume surface for the whole game, on every screen
   ----------------------------------------------------------------------------
   Why this exists (honest note): volume controls used to live only on the
   menu and the in-stage top bar, as two pairs of duplicated sliders. There
   was no SFX channel at all — playFlowSound() created an Audio() and never
   played anything. This module:

     1. Injects a floating AUDIO dock (bottom-right, mirror of the theme
        dock) that persists across every .screen — menu, setup, stage,
        results, career, everything.
     2. Owns the three channels:
          MUSIC  — #bg-music element volume
          SFX    — SfxBus, a tiny WebAudio synth (correct/mistake/timeout/
                   achievement chime + UI click ticks). Generated tones, so
                   no assets to load and it works offline.
          VOICE  — CoDriverAudio (the spoken co-driver)
     3. Persists everything to localStorage('rpa.audio') and re-applies it
        before first paint of any audio.
     4. Routes the LEGACY sliders (menu, in-stage, accessibility screen)
        through AudioMixer.set() so every surface stays in sync — one truth.
        (The a11y store is mirrored back directly, never via set(), to keep
        the two systems from chasing each other.)
     5. M = master mute, from anywhere (except while typing in a field).

   Public API: AudioMixer.set(channel, value), AudioMixer.toggleMute(),
               AudioMixer.state() — and SfxBus.play(kind) for any code that
               wants to make a noise.
   ============================================================================ */
(function () {
  'use strict';

  var KEY = 'rpa.audio';
  var state = { music: 0.3, sfx: 0.6, voice: 1.0, muted: false };

  /* --- persisted state --------------------------------------------------- */
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      ['music', 'sfx', 'voice'].forEach(function (k) {
        if (typeof saved[k] === 'number' && saved[k] >= 0 && saved[k] <= 1) state[k] = saved[k];
      });
      if (typeof saved.muted === 'boolean') state.muted = saved.muted;
    }
    /* one-time migration: music default was 0.5, the dev asked it quieter.
       Anyone who never moved the music fader (still exactly 0.5) drops to
       0.3; a deliberate setting is respected. The a11y prefs store is
       patched too — at boot Accessibility.applyAudioVolumes() re-asserts
       its own musicVolume, which would otherwise clobber this back. */
    var MIG = 'rpa.audio.musicv3';
    if (!localStorage.getItem(MIG)) {
      if (state.music === 0.5) {
        state.music = 0.3;
        try {
          var a11y = JSON.parse(localStorage.getItem('rpa_a11y') || '{}');
          if (!a11y.musicVolume || a11y.musicVolume === 0.5) a11y.musicVolume = 0.3;
          localStorage.setItem('rpa_a11y', JSON.stringify(a11y));
        } catch (e) {}
      }
      try { localStorage.setItem(MIG, '1'); } catch (e) {}
    }
  } catch (e) {}

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* --- SfxBus: synthesized UI/game sounds (no assets, works offline) ------ */
  var SfxBus = {
    _ctx: null,
    _gain: null,
    _tones: {
      /* kind -> [waveform, startHz, endHz, ms] */
      correct:     ['sine',   880, 1320,  90],
      mistake:     ['square', 220,  140, 160],
      timeout:     ['sawtooth', 330, 110, 260],
      achievement: ['sine',   660,  990, 140],
      tick:        ['sine',   600,  600,  30]
    },
    _ensureCtx: function () {
      if (this._ctx) {
        if (this._ctx.state === 'suspended') { try { this._ctx.resume(); } catch (e) {} }
        return true;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this._ctx = new AC();
        this._gain = this._ctx.createGain();
        this._gain.connect(this._ctx.destination);
        this._applyGain();
        return true;
      } catch (e) { return false; }
    },
    _applyGain: function () {
      if (this._gain) this._gain.gain.value = state.muted ? 0 : state.sfx;
    },
    play: function (kind) {
      var t = this._tones[kind] || this._tones.tick;
      if (!this._ensureCtx()) return;
      try {
        var osc = this._ctx.createOscillator();
        var env = this._ctx.createGain();
        osc.type = t[0];
        var now = this._ctx.currentTime;
        osc.frequency.setValueAtTime(t[1], now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, t[2]), now + t[3] / 1000);
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.06 : 0.18, now + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, now + t[3] / 1000);
        osc.connect(env); env.connect(this._gain);
        osc.start(now); osc.stop(now + t[3] / 1000 + 0.02);
      } catch (e) {}
    }
  };

  /* --- application to the actual audio graph ------------------------------ */
  var musicEl = null;
  function bindMusic() {
    musicEl = document.getElementById('bg-music');
    if (musicEl && !musicEl.__mixerBound) {
      musicEl.__mixerBound = true;
      /* re-apply whenever something (showMenu, autoplay) starts playback —
         covers the load-order race where volume was set before this ran */
      musicEl.addEventListener('play', applyMusic);
    }
  }
  function applyMusic() {
    bindMusic();
    if (musicEl) musicEl.volume = state.muted ? 0 : state.music;
  }
  function applyVoice() {
    if (typeof CoDriverAudio !== 'undefined' && CoDriverAudio.setVoiceVolume) {
      CoDriverAudio.setVoiceVolume(state.muted ? 0 : state.voice);
    }
  }
  function applyA11y() {
    /* keep the Accessibility screen's own prefs store in step so it renders
       the same numbers next time it opens. Written DIRECTLY (no
       Accessibility.set) — calling set() would run Accessibility.apply()
       -> applyAudioVolumes() and we'd chase our own tail. */
    if (typeof Accessibility !== 'undefined' && Accessibility.prefs) {
      try {
        Accessibility.prefs.musicVolume = state.music;
        Accessibility.prefs.voiceVolume = state.voice;
        localStorage.setItem('rpa_a11y', JSON.stringify(Accessibility.prefs));
      } catch (e) {}
    }
  }
  function applyAll() {
    applyMusic();
    applyVoice();
    SfxBus._applyGain();
  }

  /* --- UI sync: widget + every legacy slider ------------------------------ */
  var els = {};
  function syncUI() {
    if (!els.built) return;
    [['music', 'ad-music'], ['sfx', 'ad-sfx'], ['voice', 'ad-voice']].forEach(function (p) {
      var fader = document.getElementById(p[1]);
      if (fader) {
        fader.value = state[p[0]];
        var pct = fader.parentNode.querySelector('.ad-val');
        if (pct) pct.textContent = Math.round(state[p[0]] * 100) + '%';
      }
    });
    document.querySelectorAll('#music-volume-slider, #game-music-volume-slider').forEach(function (s) { s.value = state.music; });
    document.querySelectorAll('#voice-volume-slider, #game-voice-volume-slider').forEach(function (s) { s.value = state.voice; });
    if (els.toggle) {
      var icon = els.toggle.querySelector('i');
      if (icon) icon.className = state.muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
      els.toggle.classList.toggle('muted', state.muted);
    }
    if (els.dock) els.dock.classList.toggle('muted', state.muted);
  }

  /* --- public API ---------------------------------------------------------- */
  var AudioMixer = {
    set: function (channel, value) {
      if (!(channel in state) || channel === 'muted') return;
      var v = parseFloat(value);
      if (isNaN(v)) return;
      state[channel] = Math.max(0, Math.min(1, v));
      if (state[channel] > 0 && state.muted) state.muted = false; // moving a fader un-mutes
      persist();
      applyAll();
      applyA11y();
      syncUI();
    },
    toggleMute: function () {
      state.muted = !state.muted;
      persist();
      applyAll();
      syncUI();
    },
    state: function () { return JSON.parse(JSON.stringify(state)); }
  };
  window.AudioMixer = AudioMixer;
  window.SfxBus = SfxBus;

  /* --- VoicePicker: ONE natural-voice chooser for every speech call -------
     The old code picked voices at 9 call sites with 3 different preference
     lists (one of which matched 'fe[male]' via includes('male')). This
     ranks what actually sounds human: Edge "Natural" neural voices top,
     then Google's network voices, British English above en-US, and robot
     legacy voices (Desktop/eSpeak/compact) demoted. Optional gender hint
     follows the story's co-driver voice choice. Persists rpa.voiceName. */
  var VoicePicker = {
    KEY: 'rpa.voiceName',
    _name: (function () { try { return localStorage.getItem('rpa.voiceName') || null; } catch (e) { return null; } })(),
    _voices: [],
    FEMALE: ['aria', 'jenny', 'sonia', 'libby', 'emma', 'hazel', 'zira', 'susan', 'michelle', 'ava', 'allison', 'serena', 'kate', 'moira', 'tessa', 'fiona', 'veena', 'karen', 'nicky', 'samantha', 'victoria', 'female'],
    MALE: ['guy', 'david', 'mark', 'daniel', 'george', 'ryan', 'thomas', 'james', 'brian', 'alex', 'fred', 'rishi', 'liam', 'noah', 'oliver', 'arthur', 'christopher', 'eric', 'roger', 'male'],
    refresh: function () {
      if (!window.speechSynthesis) return [];
      this._voices = window.speechSynthesis.getVoices() || [];
      return this._voices;
    },
    score: function (v) {
      var n = (v.name || '').toLowerCase();
      var lang = (v.lang || '').toLowerCase();
      var s = 0;
      if (n.indexOf('natural') !== -1) s += 100;   /* Edge neural — most human */
      if (n.indexOf('google') !== -1) s += 80;     /* Chrome network voices */
      if (n.indexOf('online') !== -1) s += 40;
      if (lang.indexOf('en-gb') === 0) s += 25;    /* rally flavor: British English */
      else if (lang.indexOf('en-us') === 0) s += 12;
      if (n.indexOf('desktop') !== -1) s -= 30;    /* legacy SAPI voices */
      if (n.indexOf('compact') !== -1) s -= 30;    /* macOS compact voices */
      if (n.indexOf('espeak') !== -1) s -= 50;     /* robotic */
      if (n.indexOf('eloquence') !== -1) s -= 40;
      return s;
    },
    _genderScore: function (v, hint) {
      if (!hint) return 0;
      var n = (v.name || '').toLowerCase();
      var list = hint === 'female' ? this.FEMALE : this.MALE;
      for (var i = 0; i < list.length; i++) if (n.indexOf(list[i]) !== -1) return 30;
      return 0;
    },
    get: function (hint) {
      this.refresh();
      if (this._name) {
        var exact = this._voices.find(function (v) { return v.name === this._name; }, this);
        if (exact) return exact;
      }
      var en = this._voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('en') === 0; });
      var pool = en.length ? en : this._voices;
      if (!pool.length) return null;
      var best = null, bs = -1e9;
      var self = this;
      pool.forEach(function (v) {
        var s = self.score(v) + self._genderScore(v, hint);
        if (s > bs) { bs = s; best = v; }
      });
      return best;
    },
    apply: function (utt, hint) {
      var v = this.get(hint);
      if (v) utt.voice = v;
      return v;
    },
    pick: function (name) {
      this._name = name || null;
      try { localStorage.setItem(this.KEY, name || ''); } catch (e) {}
    },
    name: function () { return this._name; }
  };
  function voiceHint() {
    try {
      if (typeof StorySystem !== 'undefined' && StorySystem.state && StorySystem.state.genderRoute) {
        return StorySystem.state.genderRoute;
      }
    } catch (e) {}
    return null;
  }
  if (window.speechSynthesis && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', function () { VoicePicker.refresh(); });
  }
  window.VoicePicker = VoicePicker;

  /* --- the floating dock --------------------------------------------------- */
  function buildDock() {
    if (document.getElementById('audio-dock')) return;
    var dock = document.createElement('div');
    dock.id = 'audio-dock';
    dock.className = 'audio-dock';
    dock.innerHTML =
      '<div class="audio-dock-panel" role="group" aria-label="Audio mixer">' +
        '<div class="ad-head"><span>AUDIO</span>' +
          '<button id="ad-mute" title="Mute everything (M)"><i class="bi bi-volume-mute"></i></button></div>' +
        '<div class="ad-row"><i class="bi bi-music-note-beamed" title="Music"></i>' +
          '<input type="range" id="ad-music" min="0" max="1" step="0.05" aria-label="Music volume">' +
          '<span class="ad-val">--</span></div>' +
        '<div class="ad-row"><i class="bi bi-bell" title="Sound effects"></i>' +
          '<input type="range" id="ad-sfx" min="0" max="1" step="0.05" aria-label="Sound effects volume">' +
          '<span class="ad-val">--</span></div>' +
        '<div class="ad-row"><i class="bi bi-mic" title="Co-driver voice"></i>' +
          '<input type="range" id="ad-voice" min="0" max="1" step="0.05" aria-label="Co-driver voice volume">' +
          '<span class="ad-val">--</span></div>' +
        '<div class="ad-row ad-row-voice"><i class="bi bi-boombox" title="Voice"></i>' +
          '<select id="ad-voice-pick" aria-label="Co-driver voice"></select></div>' +
      '</div>' +
      '<button id="audio-dock-toggle" title="Audio mixer — M mutes"><i class="bi bi-volume-up-fill"></i></button>';
    document.body.appendChild(dock);

    els.dock = dock;
    els.toggle = dock.querySelector('#audio-dock-toggle');
    els.built = true;

    els.toggle.addEventListener('click', function () {
      dock.classList.toggle('expanded');
      SfxBus.play('tick');
    });
    dock.querySelector('#ad-mute').addEventListener('click', function () { AudioMixer.toggleMute(); });
    dock.querySelector('#ad-music').addEventListener('input', function () { AudioMixer.set('music', this.value); });
    dock.querySelector('#ad-sfx').addEventListener('input', function () { AudioMixer.set('sfx', this.value); });
    dock.querySelector('#ad-voice').addEventListener('input', function () { AudioMixer.set('voice', this.value); });
    var vp = dock.querySelector('#ad-voice-pick');
    function fillVoiceList() {
      if (!window.speechSynthesis) { vp.innerHTML = '<option>no speech voices</option>'; return; }
      var list = VoicePicker.refresh().filter(function (v) { return (v.lang || '').toLowerCase().indexOf('en') === 0; });
      if (!list.length) list = VoicePicker.refresh();
      var ranked = list.slice().sort(function (a, b) { return VoicePicker.score(b) - VoicePicker.score(a); });
      vp.innerHTML = ranked.map(function (v) {
        return '<option value="' + v.name.replace(/"/g, '&quot;') + '">' + v.name + '</option>';
      }).join('');
      if (VoicePicker.name()) vp.value = VoicePicker.name();
    }
    fillVoiceList();
    if (window.speechSynthesis && window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', fillVoiceList);
    }
    vp.addEventListener('change', function () {
      VoicePicker.pick(vp.value);
      /* a quick hello so the choice is heard immediately */
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance('Ready. Call the notes.');
        var v = VoicePicker.get(voiceHint());
        if (v) u.voice = v;
        u.volume = state.muted ? 0 : state.voice;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    });
    /* a tiny confirm tone when you let go of a fader — proves the channel works */
    dock.querySelectorAll('.ad-row input').forEach(function (r) {
      r.addEventListener('change', function () { SfxBus.play('tick'); });
    });

    syncUI();
  }

  /* --- M = mute (unless typing) -------------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    AudioMixer.toggleMute();
  });

  /* --- UI click ticks: one delegated listener, all buttons, every screen ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button, .mnbtn, .gbtn, .abtn, .car-btn, .era-card, .si');
    if (!b) return;
    if (b.closest('#audio-dock')) return; // the dock makes its own sounds
    SfxBus.play('tick');
  }, true);

  /* --- boot ----------------------------------------------------------------- */
  applyAll();
  applyA11y();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { buildDock(); applyMusic(); });
  } else {
    buildDock();
    applyMusic();
  }
})();
