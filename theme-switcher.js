/* ============================================================================
   theme-switcher.js — three paint personalities, one click apart
   ----------------------------------------------------------------------------
   - Applies the saved theme BEFORE first paint (avoiding a theme flash):
     this script is loaded in <head> and touches <body> classes only.
   - Injects a small floating dock (bottom-left) to switch live.
   - Persists to localStorage('rpa.theme').

   Themes live in themes.css:
     (none)            = original neon-dark cockpit (default)
     theme-groub       = Group B — flat livery, zero gradients, zero radii
     theme-roadbook    = Paper Roadbook — printed route sheet, light paper
   ============================================================================ */
(function () {
  'use strict';

  var KEY = 'rpa.theme';
  var THEMES = ['theme-street', 'theme-roadbook'];
  var LABELS = { 'theme-street': 'Street', 'theme-roadbook': 'Roadbook' };
  var current = null;

  function apply(name, save) {
    document.body.classList.remove('theme-street', 'theme-roadbook');
    if (name && THEMES.indexOf(name) !== -1) {
      document.body.classList.add(name);
      current = name;
    } else {
      current = null;
    }
    if (save) { try { localStorage.setItem(KEY, current || ''); } catch (e) {} }
    document.documentElement.setAttribute('data-theme', current || 'default');
    syncDock();
    ensureStreetCam();
    ensurePilotCam();
    /* Theme changed mid-selection: the setup screen's garage belongs to the
       theme (Wangan/Dakar/WRC eras), so rebuild the car grid, gimmick banner
       and era-picker visibility — otherwise a WRC car stays selected while
       the dock says Street. Only touches open screens, never a running stage. */
    if (typeof window.rpaOnThemeChanged === 'function') {
      try { window.rpaOnThemeChanged(); } catch (e) {}
    }
  }

  /* --- Street theme: "Shibuya at night" scene.
         HONEST NOTE: a true third-party live cam (YouTube//embed or webcam
         portals) is not reliably embeddable from a static/file:// page —
         channels disable embedding and players need iframes+network+cookies.
         So this is the real Shibuya crossing at night (Commons photo, CC)
         with slow camera-drift + a LIVE clock in real Tokyo time. Always
         works, zero external player dependency. ------------------------ */
  var camClock = null;

  function ensureStreetCam() {
    var host = document.querySelector('#menu .menu-left');
    if (!host) return;
    var cam = document.getElementById('street-cam');
    if (current === 'theme-street') {
      if (!cam) {
        cam = document.createElement('div');
        cam.id = 'street-cam';
        cam.className = 'street-cam';
        cam.innerHTML =
          '<div class="street-cam-shot" role="img" aria-label="Shibuya Scramble Crossing at night"></div>' +
          '<div class="street-cam-live">● SHIBUYA <span class="jst">--:--:--</span> JST</div>';
        host.appendChild(cam);
        var tick = function () {
          var el = cam.querySelector('.jst');
          if (!el) return;
          try {
            el.textContent = new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).format(new Date());
          } catch (e) { el.textContent = new Date().toISOString().slice(11, 19); }
        };
        tick();
        camClock = setInterval(tick, 1000);
      }
    } else if (cam) {
      if (camClock) { clearInterval(camClock); camClock = null; }
      cam.remove();
    }
  }

  /* --- Cockpit theme: pilot-cam telemetry badge on the dashcam inset.
         A blinking REC dot, a running stage clock and a speed readout turn
         the poster's video window into a live co-driver feed. Mirrors
         ensureStreetCam: injects only on the default theme. ------------- */
  var pilotClock = null;

  function ensurePilotCam() {
    var host = document.querySelector('#menu .menu-left');
    if (!host) return;
    var badge = document.getElementById('pilot-cam-live');
    if (current === null || current === undefined || current === '') {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'pilot-cam-live';
        badge.className = 'pilot-cam-live';
        badge.innerHTML =
          '<span class="rec-dot"></span>REC <span class="pilot-clock">00:00:00</span>' +
          '<span class="pilot-sep">·</span><span class="pilot-speed">142 KM/H</span>';
        host.appendChild(badge);
        var t0 = Date.now();
        var tick = function () {
          var clock = badge.querySelector('.pilot-clock');
          if (!clock) return;
          var s = Math.floor((Date.now() - t0) / 1000);
          var hh = String(Math.floor(s / 3600)).padStart(2, '0');
          var mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
          var ss = String(s % 60).padStart(2, '0');
          clock.textContent = hh + ':' + mm + ':' + ss;
        };
        tick();
        pilotClock = setInterval(tick, 1000);
      }
    } else if (badge) {
      if (pilotClock) { clearInterval(pilotClock); pilotClock = null; }
      badge.remove();
    }
  }

  /* --- early apply: run at parse time, before the DOM is ready ---------- */
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved && THEMES.indexOf(saved) !== -1) {
    document.addEventListener('DOMContentLoaded', function () {
      apply(saved, false);
    });
    /* body may already exist if script runs late — handle both */
    if (document.body) apply(saved, false);
  }

  /* --- floating dock ---------------------------------------------------- */
  function buildDock() {
    if (document.getElementById('theme-dock')) return;
    var dock = document.createElement('div');
    dock.id = 'theme-dock';
    dock.className = 'theme-dock';
    dock.innerHTML =
      '<span class="theme-dock-label">THEME</span>' +
      '<button data-theme="" title="Original neon cockpit">Cockpit</button>' +
      '<button data-theme="theme-street" title="JDM night — neon city, video full-bleed, dock menu">Street</button>' +
      '<button data-theme="theme-roadbook" title="Printed route sheet — paper, serif index, ink stamps">Roadbook</button>';

    dock.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-theme]');
      if (!btn) return;
      apply(btn.getAttribute('data-theme') || null, true);
    });

    document.body.appendChild(dock);
    syncDock();
  }

  function syncDock() {
    var dock = document.getElementById('theme-dock');
    if (!dock) return;
    dock.querySelectorAll('button[data-theme]').forEach(function (b) {
      var t = b.getAttribute('data-theme') || '';
      var on = (t === (current || '')) || (t === '' && !current);
      b.classList.toggle('on', on);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildDock();
      /* inject the theme's live element even before the first apply() —
         first visit with the default theme must still get its badge */
      ensureStreetCam();
      ensurePilotCam();
    });
  } else {
    buildDock();
    ensureStreetCam();
    ensurePilotCam();
  }
  if (current === 'theme-street') {
    document.addEventListener('DOMContentLoaded', ensureStreetCam);
  }

  /* --- tiny public API --------------------------------------------------- */
  window.RpaTheme = {
    set: function (name) { apply(name, true); },
    get: function () { return current; },
    cycle: function () {
      var all = [''].concat(THEMES);
      var i = all.indexOf(current || '');
      apply(all[(i + 1) % all.length], true);
    }
  };
})();
