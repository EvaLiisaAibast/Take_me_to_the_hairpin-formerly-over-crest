/* ============================================================================
   night-recon.js — ROADBOOK THEME GAMEPLAY NODE
   ============================================================================

   NIGHT RECON = a night stage run on a fuel budget, with a fire you choose
   to feed or starve before every corner.

   THE FIRE (the gimmick):
     Before each note you pick, during the previous note's feedback delay:
       CONSERVE — normal call. Correct answers refill the fuel tank (+8).
       BURN     — the driver attacks: your answer window shrinks to ~70%,
                  but a correct call under burn scores +50%. Burning costs
                  12 fuel per attempt, and a failed call KILLS THE FIRE
                  (streak penalty already handled by the engine).
     Fuel hits zero → RESERVE: burns disabled until you bank two clean
     conserves. End the stage with the fire alive and fuel in the tank for
     the FLAME ALIVE rating.

   Everything rides the existing pipeline: beginStageWithData/submitAnswer/
   getNoteTimeLimit. No engine forks.
   ============================================================================ */
(function () {
  'use strict';

  var NR = {
    active: false,
    fuel: 60,          // 0..100
    burnNext: false,   // player armed a burn for the upcoming note
    burnIdx: -1,       // which note index the burn applies to
    reserve: 0,        // clean conserves banked while in reserve
    burnsWon: 0,
    burnsLost: 0,
    conserves: 0
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ------------------------------------------------------------------ */
  /* Stage: a night run through the forest road                          */
  /* ------------------------------------------------------------------ */
  var STAGE = {
    name: 'NIGHT RECON — Börnste Forest',
    country: 'Germany',
    surf: 'Wet forest tarmac',
    weather: 'Clear night · 4°C · damp',
    km: '18.9',
    cond: 'Dark. Headlights only. The log piles do not move.',
    notes: [
      { raw: 'L4 80', ans: 'left medium 80 metres', narr: 'Opening cut past the log pile. Damp surface — earlier than you think.', comm: 'Dark stages are won on the first three calls.' },
      { raw: 'R3 CREST', ans: 'right tight over crest', narr: 'Blind over the rise. The beams do not reach the apex.', comm: 'Trust the note, not the headlights.' },
      { raw: 'FLAT R5 120', ans: 'flat right open 120 metres', narr: 'Forest opens into a fast sweep along the treeline.', comm: 'The fire wants feeding. This is where you burn.' },
      { raw: 'L2! NARROW', ans: 'left very tight caution narrows', narr: 'Village lane. Stone walls, no lighting, close.', comm: 'The walls keep the heat in. So does trouble.' },
      { raw: 'R4 LONG TIGHTENS', ans: 'right medium long tightens', narr: 'Long right along the field edge — it pulls tight at the end.', comm: 'A note that changes its mind. Read it to the last word.' },
      { raw: 'HAIRPIN L1 !!', ans: 'left hairpin maximum caution', narr: 'Hairpin by the timber yard. Stack of logs on the exit.', comm: 'Everybody remembers this corner. Nobody enjoys it.' },
      { raw: 'L5 INTO R3 60', ans: 'left open into right tight 60 metres', narr: 'Fast left dives straight into the forest complex.', comm: 'Breathe in, call it, breathe out.' },
      { raw: 'R2 JUNCTION', ans: 'right very tight junction', narr: 'Crossroads. Give-way on the main road — traffic possible.', comm: 'Public road. They never close it fully.' },
      { raw: 'FLAT CREST 100', ans: 'flat over crest 100 metres', narr: 'Final blind over the ridge — then the finish lights.', comm: 'One last act of faith in the dark.' }
    ]
  };

  function openRecon() {
    NR.active = false;
    NR.fuel = 60; NR.burnNext = false; NR.burnIdx = -1;
    NR.reserve = 0; NR.burnsWon = 0; NR.burnsLost = 0; NR.conserves = 0;
    buildBrief();
    if (typeof show === 'function') show('recon');
  }

  function buildBrief() {
    var host = document.getElementById('recon-brief');
    if (!host) return;
    host.innerHTML =
      '<div class="ss-sec"><h3>THE FIRE</h3>' +
      '<p style="color:var(--text2);font-size:13px;line-height:1.6">Night stage, fuel-limited. Before each corner you decide: ' +
      '<b style="color:#ff7a18">BURN</b> — the driver attacks, your answer window shrinks, but a clean call ' +
      'under burn is worth <b style="color:#ffc233">+50%</b> and costs 12 fuel. Or <b>CONSERVE</b> — normal ' +
      'call, +8 fuel back when clean. Fail a burn and <b style="color:#ff4530">the fire dies</b>. Empty tank means ' +
      'reserve only until you bank two clean calls.</p></div>' +
      '<div class="ss-sec"><h3>THE STAGE</h3>' +
      '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:var(--text2);line-height:1.8">' +
      esc(STAGE.name) + '<br>' + esc(STAGE.surf) + ' · ' + esc(STAGE.weather) + ' · ' + STAGE.km + ' km<br>' +
      '<span style="color:var(--text3)">' + esc(STAGE.cond) + '</span></div></div>';
  }

  function startRecon() {
    /* standalone entry: ensure the engine's era/difficulty are set */
    if (typeof G !== 'undefined') {
      if (!G.era) G.era = 'w24';
      if (typeof DIFFS !== 'undefined' && (G.diff == null)) G.diff = 1;
      G.timeLimit = DIFFS[G.diff].s;
    }
    NR.active = true;
    var stage = JSON.parse(JSON.stringify(STAGE));
    if (typeof G !== 'undefined') G.stageName = stage.name; // engine reads this in applyWeatherTempo/ghost keys
    if (typeof beginStageWithData === 'function') beginStageWithData(stage);
    renderHud();
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                */
  /* ------------------------------------------------------------------ */
  function renderHud() {
    var el = document.getElementById('recon-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'recon-hud';
      el.className = 'recon-hud';
      var meta = document.getElementById('g-meta');
      if (meta && meta.parentNode) meta.parentNode.insertBefore(el, meta.nextSibling);
      else { var g = document.getElementById('game'); if (g) g.appendChild(el); }
    }
    var pct = Math.max(0, Math.min(100, NR.fuel));
    var mode = NR.burnNext ? '● BURN ARMED' : (pct <= 0 ? 'RESERVE' : 'CONSERVE');
    el.innerHTML =
      '<span class="rh-label">FUEL</span>' +
      '<span class="rh-bar"><span class="rh-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="rh-pct">' + Math.round(pct) + '%</span>' +
      '<span class="rh-mode ' + (NR.burnNext ? 'rh-burn' : (pct <= 0 ? 'rh-res' : '')) + '">' + mode + '</span>';
    el.style.display = 'flex';
  }
  function hudHide() {
    var el = document.getElementById('recon-hud');
    if (el) el.style.display = 'none';
    var pick = document.getElementById('recon-pick');
    if (pick) pick.style.display = 'none';
  }

  /* ------------------------------------------------------------------ */
  /* The choice overlay — appears during the feedback delay             */
  /* ------------------------------------------------------------------ */
  function showChoice() {
    var host = document.getElementById('recon-pick');
    if (!host) {
      host = document.createElement('div');
      host.id = 'recon-pick';
      host.className = 'recon-pick';
      var g = document.getElementById('game');
      if (g) g.appendChild(host);
    }
    var reserve = NR.fuel < 12;
    host.innerHTML =
      '<span class="rp-label">' + (reserve ? 'RESERVE — CLEAN CALLS REBUILD FUEL' : 'NEXT CORNER') + '</span>' +
      '<button type="button" class="rp-btn rp-conserve" onclick="NightRecon.choose(false)">CONSERVE +8</button>' +
      '<button type="button" class="rp-btn rp-burn" onclick="NightRecon.choose(true)"' +
      (reserve ? ' disabled title="not enough fuel"' : '') + '>BURN −12 · +50%</button>';
    host.style.display = 'flex';
  }

  function choose(burn) {
    if (!NR.active) return;
    if (burn && NR.fuel < 12) return;
    NR.burnNext = !!burn;
    NR.burnIdx = (typeof G !== 'undefined' && G.notes) ? G.idx : -1;
    var pick = document.getElementById('recon-pick');
    if (pick) pick.style.display = 'none';
    renderHud();
    flash(burn ? 'THE FIRE ROARS' : 'CONSERVING', burn ? 'burn' : 'ok');
  }

  /* ------------------------------------------------------------------ */
  /* Engine hooks                                                       */
  /* ------------------------------------------------------------------ */

  /* Called from loadNote hook. Arms the pending burn for THIS note. */
  function onNoteShown(idx) {
    if (!NR.active) return;
    if (NR.burnNext && NR.burnIdx === idx && NR.fuel >= 12) {
      NR.fuel -= 12;
      try { if (typeof posthog !== 'undefined') posthog.capture('recon_burn', { note: idx }); } catch (e) {}
    } else if (NR.burnIdx === idx) {
      NR.burnNext = false; // tank dipped below cost — burn silently downgraded
    }
    renderHud();
  }

  /* Called from the time-budget function: burn = ~70% window. */
  function timeFactor() {
    return (NR.active && NR.burnNext) ? 0.70 : 1.0;
  }

  /* Called from submitAnswer right before processAnswer: +50% on a clean
     burn. Does not flip ok/fail — the risk is the window, not the maths. */
  function adjustScore(idx, finalScore, ok) {
    if (!NR.active) return finalScore;
    if (ok) {
      if (NR.burnNext && NR.burnIdx === idx) {
        NR.burnsWon++;
        NR.burnNext = false;
        finalScore = Math.min(1.0, finalScore * 1.5);
        flash('BURN LANDED — +50%', 'burn');
      } else {
        NR.conserves++;
        if (NR.reserve > 0) NR.reserve--;
        NR.fuel = Math.min(100, NR.fuel + 8);
        flash('CLEAN — FUEL +8', 'ok');
      }
    } else {
      if (NR.burnNext && NR.burnIdx === idx) {
        NR.burnsLost++;
        flash('THE FIRE DIES', 'bad');
      }
    NR.fuel = Math.max(0, NR.fuel - 10);
    NR.burnNext = false;
    NR.reserve = 2; // fail anything → reserve until two clean conserves
  }
  renderHud();
  // offer the fire choice during the feedback window, if a next note exists
  if (typeof G !== 'undefined' && G.notes && G.idx + 1 < G.notes.length && !G.stageEnded) {
    setTimeout(function () {
      if (NR.active && !G.stageEnded) showChoice();
    }, 900);
  }
  return finalScore;
  }

  function onEndStage() {
    if (!NR.active) return;
    NR.active = false;
    hudHide();
    var flameAlive = NR.fuel > 0 && NR.burnsLost === 0;
    try {
      if (typeof Achievements !== 'undefined') {
        if (flameAlive && NR.burnsWon > 0) Achievements.unlock('flame_alive');
        if (NR.burnsWon >= 5) Achievements.unlock('pyromaniac');
      }
    } catch (e) {}
    try {
      var el = document.getElementById('g-comm');
      if (el) {
        el.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:var(--mp-orange);font-family:\'IBM Plex Mono\',monospace;margin-top:6px">NIGHT RECON — FUEL ' +
          Math.round(NR.fuel) + '% · BURNS WON ' + NR.burnsWon + ' · LOST ' + NR.burnsLost +
          (flameAlive && NR.burnsWon > 0 ? ' · <i class="bi bi-star-fill"></i> FLAME ALIVE' : '') + '</div>';
      }
    } catch (e) {}
  }

  function onShow(id) {
    if (id !== 'game' && id !== 'recon') { NR.active = false; hudHide(); }
  }

  function flash(text, kind) {
    var colors = {
      burn: ['#ff7a18', 'rgba(255,122,26,.7)', 'rgba(255,122,26,.3)'],
      ok: ['#ffc233', 'rgba(255,194,51,.6)', 'rgba(255,194,51,.25)'],
      bad: ['#ff4530', 'rgba(255,69,48,.7)', 'rgba(255,69,48,.3)']
    }[kind] || ['#ffc233', 'rgba(255,194,51,.6)', 'rgba(255,194,51,.25)'];
    var el = document.createElement('div');
    el.className = 'recon-flash';
    el.textContent = text;
    el.style.cssText = 'position:fixed;top:24%;left:50%;transform:translateX(-50%);z-index:7200;' +
      'padding:.5rem 1.2rem;color:' + colors[0] + ';border:1px solid ' + colors[1] + ';' +
      'background:rgba(8,5,3,.92);box-shadow:0 0 22px ' + colors[2] + ';' +
      'font-family:\'IBM Plex Mono\',monospace;font-size:13px;letter-spacing:3px;' +
      'font-weight:700;pointer-events:none';
    document.body.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 1500);
    setTimeout(function () { el.remove(); }, 2000);
  }

  window.NightRecon = {
    openRecon: openRecon,
    startRecon: startRecon,
    choose: choose,
    onNoteShown: onNoteShown,
    timeFactor: timeFactor,
    adjustScore: adjustScore,
    onEndStage: onEndStage,
    onShow: onShow,
    isActive: function () { return NR.active; },
    _state: NR
  };
})();
