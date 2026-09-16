/* ============================================================================
   groupb-survival.js — COCKPIT THEME GAMEPLAY NODE
   ============================================================================

   KILLER B = a real Group B monster where the CAR degrades under pressure
   and can genuinely die mid-stage. The only node with a true fail state.

   THE STRAIN SYSTEM:
     Every failed or timed-out call adds +18 STRAIN — late or wrong calls
     mean the driver is reacting, not driving, and the car pays for it.
     Every clean call bleeds 4 STRAIN back off.

     ≥50 STRAIN  — BOOST OVERHEATING: answer windows shrink to 90%.
     ≥75 STRAIN  — TYRES GONE: windows shrink to 80%. Everything hurts.
                   THE INTERCOM: above 75, the driver's radio starts breaking
                   up — each new note arrives STATIC-GARBLED (some letters
                   swap for neighbours on the same keyboard row) and you
                   must decode the call through the noise. It cleans itself
                   up once you claw back under 70.
     100 STRAIN  — the car lets go. Stage over, classified DNF. No rescue.

   The stage is the real Manta Road (ERAS.grpb) — the actual Group B era:
   its vocabulary, its commentator, its crash severity. Clean, early calls
   are survival; hesitation is terminal.
   ============================================================================ */
(function () {
  'use strict';

  var KS = {
    active: false,
    strain: 0,
    peak: 0,
    warned50: false,
    warned75: false,
    calls: 0,
    gremlin: false,      // mechanical gremlin event fired (one per run)
    gremlinArm: -1       // note index the gremlin attaches to
  };

  var THRESH = [
    { at: 50, label: 'BOOST OVERHEATING', factor: 0.90 },
    { at: 75, label: 'TYRES GONE', factor: 0.80 }
  ];
  var STRAIN_PER_FAIL = 18;
  var RELIEF_PER_CLEAN = 4;
  var FAIL_LIMIT = 100;
  var INTERCOM_AT = 75;   // static begins
  var INTERCOM_OFF = 70;  // repaired once back under this

  /* The intercom garble: deterministic per (raw text + strain bucket), so a
     note always garbles identically within a bucket (fair to learn), but
     re-garbles as strain deepens. Only letters swap, and only to keyboard-
     row neighbours — always decodable by eye. */
  var KBD_ROW_NEIGHBOURS = {
    q: 'wa', w: 'qe', e: 'wr', r: 'et', t: 'ry', y: 'tu', u: 'yi', i: 'uo', o: 'ip', p: 'o',
    a: 's', s: 'ad', d: 'sf', f: 'dg', g: 'fh', h: 'gj', j: 'hk', k: 'jl', l: 'k',
    z: 'x', x: 'zc', c: 'v', v: 'b', b: 'n', n: 'm', m: 'n'
  };
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  function garble(raw, strain) {
    if (strain < INTERCOM_AT) return null; // clean
    var bucket = strain >= 90 ? 3 : (strain >= 80 ? 2 : 1);
    var seed = hashStr(raw + ':' + bucket);
    var out = '';
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      var low = ch.toLowerCase();
      if (KBD_ROW_NEIGHBOURS[low]) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        /* swap probability: bucket 1 = 22%, 2 = 34%, 3 = 46% */
        if ((seed % 100) < bucket * 12 + 10) {
          var opts = KBD_ROW_NEIGHBOURS[low];
          var rep = opts[seed % opts.length];
          out += (ch === low ? rep : rep.toUpperCase());
          continue;
        }
      }
      out += ch;
    }
    return out;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ------------------------------------------------------------------ */
  /* Brief + launch                                                     */
  /* ------------------------------------------------------------------ */
  function openSurvival() {
    KS.active = false;
    buildBrief();
    if (typeof show === 'function') show('survival');
  }

  function buildBrief() {
    var host = document.getElementById('survival-brief');
    if (!host) return;
    host.innerHTML =
      '<div class="ss-sec"><h3>THE STRAIN</h3>' +
      '<p style="color:var(--text2);font-size:13px;line-height:1.6">A real Group B stage, the real Manta Road. Every failed or timed-out call adds ' +
      '<b style="color:var(--mp-red)">+18 STRAIN</b> — the driver is reacting instead of driving, and the car pays. ' +
      'Clean calls bleed <b style="color:var(--gold)">4 STRAIN</b> back off. At 50 the boost overheats and your windows shrink. ' +
      'At 75 the tyres go AND THE INTERCOM STARTS BREAKING UP — notes arrive garbled with radio static and you must decode the call by eye ' +
      '(it repairs itself if you claw back under 70). Somewhere mid-stage a mechanical gremlin may bite: damage then compounds ×1.5 ' +
      'until you string clean calls together. At <b style="color:var(--mp-red)">100 the car lets go</b> — stage over, classified DNF. No recovery, no rescue.</p></div>' +
      '<div class="ss-sec"><h3>THE STAGE</h3>' +
      '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:var(--text2);line-height:1.8">' +
      esc(ERAS.grpb.stages[0].name) + ' — ' + esc(ERAS.grpb.label) + '<br>' +
      esc(ERAS.grpb.stages[0].surf) + ' · ' + esc(ERAS.grpb.stages[0].weather) + ' · ' + ERAS.grpb.stages[0].km + ' km<br>' +
      '<span style="color:var(--text3)">' + esc(ERAS.grpb.desc) + '</span></div></div>';
  }

  function startSurvival() {
    /* standalone entry: ensure the engine's era/difficulty are set — this
       stage IS Group B, so the era must be grpb for vocab/atmosphere */
    if (typeof G !== 'undefined') {
      G.era = 'grpb';
      if (typeof DIFFS !== 'undefined' && (G.diff == null || G.diff < 2)) G.diff = 2; // Hard — it's Group B
      G.timeLimit = DIFFS[G.diff].s;
    }
    var stage = JSON.parse(JSON.stringify(ERAS.grpb.stages[0]));
    KS.active = true;
    KS.strain = 0; KS.peak = 0; KS.calls = 0;
    KS.gremlin = false; KS.gremlinArm = 3 + Math.floor(Math.random() * 4); // a mid-stage note
    KS.warned50 = false; KS.warned75 = false;
    if (typeof G !== 'undefined') G.stageName = stage.name;
    if (typeof beginStageWithData === 'function') beginStageWithData(stage);
    renderHud();
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                */
  /* ------------------------------------------------------------------ */
  function renderHud() {
    var el = document.getElementById('survival-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'survival-hud';
      el.className = 'survival-hud';
      var meta = document.getElementById('g-meta');
      if (meta && meta.parentNode) meta.parentNode.insertBefore(el, meta.nextSibling);
      else { var g = document.getElementById('game'); if (g) g.appendChild(el); }
    }
    var pct = Math.max(0, Math.min(100, KS.strain));
    var state = pct >= 75 ? 'CRITICAL' : (pct >= 50 ? 'STRAINED' : 'RUNNING');
    el.innerHTML =
      '<span class="sh-label">STRAIN</span>' +
      '<span class="sh-bar"><span class="sh-fill' + (pct >= 75 ? ' sh-crit' : (pct >= 50 ? ' sh-warn' : '')) +
      '" style="width:' + pct + '%"></span></span>' +
      '<span class="sh-pct">' + Math.round(pct) + '%</span>' +
      '<span class="sh-state ' + (pct >= 75 ? 'sh-crit-txt' : '') + '">' + state + '</span>';
    el.style.display = 'flex';
  }
  function hudHide() {
    var el = document.getElementById('survival-hud');
    if (el) el.style.display = 'none';
  }

  /* ------------------------------------------------------------------ */
  /* Engine hooks                                                       */
  /* ------------------------------------------------------------------ */

  /* Answer window multiplier from current strain thresholds. */
  function timeFactor() {
    if (!KS.active) return 1.0;
    if (KS.strain >= 75) return 0.80;
    if (KS.strain >= 50) return 0.90;
    return 1.0;
  }

  function onAnswer(idx, ok) {
    if (!KS.active) return;
    KS.calls++;
    if (ok) {
      var relief = RELIEF_PER_CLEAN;
      if (KS.gremlin) relief = Math.round(RELIEF_PER_CLEAN * 1.5); // after the gremlin, clean driving pays better
      KS.strain = Math.max(0, KS.strain - relief);
    } else {
      var dmg = STRAIN_PER_FAIL;
      if (KS.gremlin) dmg = Math.round(STRAIN_PER_FAIL * 1.5); // mechanical damage compounds
      KS.strain = Math.min(FAIL_LIMIT, KS.strain + dmg);
      checkThresholds();
    }
    if (KS.strain >= 75) KS._crossed75 = true;
    if (KS.strain > KS.peak) KS.peak = KS.strain;
    renderHud();
    if (KS.strain >= FAIL_LIMIT) killCar();
  }

  function onTimeout(idx) {
    if (!KS.active) return;
    onAnswer(idx, false);
  }

  function checkThresholds() {
    for (var i = 0; i < THRESH.length; i++) {
      var t = THRESH[i];
      if (KS.strain >= t.at && !t._warned) {
        t._warned = true;
        flash(t.label + ' — WINDOWS −' + Math.round((1 - t.factor) * 100) + '%', 'warn');
      }
    }
    if (KS.strain >= INTERCOM_AT && !KS._intercomOn) {
      KS._intercomOn = true;
      flash('INTERCOM BREAKING UP — DECODE THE CALLS', 'warn');
    }
    if (KS.strain < INTERCOM_OFF && KS._intercomOn) {
      KS._intercomOn = false;
      flash('INTERCOM REPAIRED', 'ok');
    }
  }

  /* Called by the engine right before each note renders. Above 75 strain
     the note text the player SEES is the garbled version — their answer is
     still scored against the real one. Also fires the one-shot gremlin. */
  function onNoteShown(idx, raw) {
    if (!KS.active) return { raw: raw };
    if (!KS.gremlin && idx === KS.gremlinArm && KS.strain > 20) {
      KS.gremlin = true;
      flash('MECHANICAL GREMLIN — DAMAGE COMPOUNDS', 'dead');
    }
    var g = garble(raw, KS.strain);
    if (g && g !== raw) return { raw: g, garbled: true };
    return { raw: raw };
  }

  /* The true fail state: the car gives up mid-stage. endStage fires the
     normal debrief; onEndStage (called by the engine hook) deactivates us
     and reports the verdict. */
  function killCar() {
    if (typeof G === 'undefined') return;
    if (G.dnf || G.stageEnded) return;
    flash('THE CAR LETS GO', 'dead');
    G.dnf = true;
    G.stageEnded = false; // endStage guards on this; make sure it runs
    if (typeof endStage === 'function') setTimeout(endStage, 900);
  }

  function onEndStage() {
    if (!KS.active) return;
    KS.active = false;
    hudHide();
    THRESH.forEach(function (t) { t._warned = false; });
    /* gimmick achievements */
    try {
      if (typeof Achievements !== 'undefined') {
        if (G && !G.dnf && KS.peak > 0 && KS.peak < 25 && KS.calls >= 5) Achievements.unlock('strain_master');
        if (!G || !G.dnf) { if (KS._crossed75 && KS.peak < FAIL_LIMIT) Achievements.unlock('edge_runner'); }
      }
    } catch (e) {}
    try {
      var el = document.getElementById('g-comm');
      if (el) {
        var verdict = KS.peak >= 100 ? 'THE CAR LETS GO' : (KS.peak < 50 ? 'MACHINE INTACT' : (KS.peak < 75 ? 'SURVIVED ON THE EDGE' : 'BARELY ALIVE'));
        el.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:var(--mp-red);font-family:\'IBM Plex Mono\',monospace;margin-top:6px">KILLER B — PEAK STRAIN ' +
          Math.round(KS.peak) + '% · ' + verdict + '</div>';
      }
    } catch (e) {}
  }

  function onShow(id) {
    if (id !== 'game' && id !== 'survival') { KS.active = false; hudHide(); }
  }

  function flash(text, kind) {
    var colors = {
      warn: ['#ff7a18', 'rgba(255,122,26,.7)', 'rgba(255,122,26,.3)'],
      dead: ['#ff2e2e', 'rgba(255,46,46,.75)', 'rgba(255,46,46,.35)']
    }[kind] || ['#ff7a18', 'rgba(255,122,26,.7)', 'rgba(255,122,26,.3)'];
    var el = document.createElement('div');
    el.className = 'survival-flash';
    el.textContent = text;
    el.style.cssText = 'position:fixed;top:21%;left:50%;transform:translateX(-50%);z-index:7200;' +
      'padding:.5rem 1.2rem;color:' + colors[0] + ';border:1px solid ' + colors[1] + ';' +
      'background:rgba(10,8,6,.94);box-shadow:0 0 26px ' + colors[2] + ';' +
      'font-family:\'IBM Plex Mono\',monospace;font-size:13px;letter-spacing:3px;' +
      'font-weight:700;pointer-events:none';
    document.body.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 1900);
    setTimeout(function () { el.remove(); }, 2400);
  }

  window.GroupBSurvival = {
    openSurvival: openSurvival,
    startSurvival: startSurvival,
    onAnswer: onAnswer,
    onTimeout: onTimeout,
    timeFactor: timeFactor,
    onNoteShown: onNoteShown,
    onEndStage: onEndStage,
    onShow: onShow,
    isActive: function () { return KS.active; },
    _state: KS
  };
})();
