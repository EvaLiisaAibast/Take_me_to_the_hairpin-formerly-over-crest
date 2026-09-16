/* ============================================================================
   wangan-modes.js — STREET THEME GAMEPLAY NODE
   ============================================================================

   WANGAN RUN = plan your own route, then outrun the police on it.

   Phase 1 — ROUTE PLANNER
     A Wangan stage is 4 segments (Bayshore Ramp → Tunnel → C1 Loop → Final).
     Each segment offers two real branches (A/B) with different hazards,
     pace and risk. You pick one branch per segment. Your picks are the
     stage: hazard branches inject cautions into the notes (shorter answer
     windows via the existing complexity machinery), slow branches buy
     breathing room, risky branches pay a score bonus.

   Phase 2 — THE RUN
     Your pacenote answers score exactly like the base game (similarity +
     real timing pressure). On top of that, police encounters can trigger
     between corners: the note slot is temporarily replaced by an EVASION
     call — type the spotter's word in time to escape. Escape = continue +
     bonus. Fail or time out = BUSTED (+15s, streak reset).

   Everything rides beginStageWithData()/submitAnswer()/processAnswer() —
   no engine forks, no second game loop.
   ============================================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */
  var WE = {
    active: false,        // wangan run in progress
    route: [],            // [{seg, pick, hazard, bonus}]
    planName: '',
    phase: 'patrol',      // 'patrol' | 'pursuit'
    notesTillCheck: 3,    // random 3..6 between encounter rolls
    pursuitNoteIdx: -1,
    savedNote: null,      // the corner note hidden under an encounter
    escapes: 0,
    busted: 0,
    evadeWord: '',
    segCount: 4
  };

  var SEGMENTS = [
    { name: 'BAYSHORE RAMP', km: '4.2' },
    { name: 'YOKOHANE TUNNEL', km: '6.8' },
    { name: 'C1 LOOP', km: '8.1' },
    { name: 'HAMAZAKI SPRINT', km: '5.6' }
  ];

  var BRANCHES = [
    [ // segment 1: Bayshore Ramp
      { id: 'A', label: 'Toll lane 4 — clean surface, wide walls',
        hazard: null, pace: 0, bonus: 0,
        desc: 'The obvious line. Everyone sees you take it.' },
      { id: 'B', label: 'Maintenance gap — cones, cameras, tight walls',
        hazard: '!!', pace: -1, bonus: 0.15,
        desc: 'Cuts 40 seconds. Speed cameras watch the gap.' }
    ],
    [ // segment 2: Yokohane Tunnel
      { id: 'A', label: 'Tunnel bore 1 — long, fast, one junction',
        hazard: null, pace: 0, bonus: 0,
        desc: 'Tunnel: no lift. The echo carries for kilometres.' },
      { id: 'B', label: 'Tunnel bore 2 — junction maze, patrol feeder',
        hazard: '!', pace: 0, bonus: 0.10,
        desc: 'Junction every 200 m. Patrols feed in from the C1 side.' }
    ],
    [ // segment 3: C1 Loop
      { id: 'A', label: 'Outer loop — hairpins over the city',
        hazard: '!', pace: 0, bonus: 0,
        desc: 'Tight but covered. Hard to box someone in up here.' },
      { id: 'B', label: 'Inner loop — flat-out between the trucks',
        hazard: null, pace: 0, bonus: 0.12,
        desc: 'Traffic runs 90. You will not.' }
    ],
    [ // segment 4: Hamazaki Sprint
      { id: 'A', label: 'Ramp merge — commit late, carry speed',
        hazard: null, pace: 0, bonus: 0,
        desc: 'The standard finish. Safe, seen, survivable.' },
      { id: 'B', label: 'Service road drain — narrow, dark, cams at both ends',
        hazard: '!!', pace: -1, bonus: 0.20,
        desc: 'The Blackbird line. Cameras at both ends. Legend or licence loss.' }
    ]
  ];

  var EVADE_WORDS = ['evade', 'ghost', 'breaker', 'split', 'vanish', 'duck'];
  var SPOTTER_LINES = [
    'unmarked skyline, ramp side — do not brake',
    'boxes on the bridge, they are watching your line',
    'patrol feeder merging, 300 metres',
    'radar tripwire ahead — quiet now'
  ];

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function active() { return WE.active; }

  /* ------------------------------------------------------------------ */
  /* Phase 1 — the route planner                                        */
  /* ------------------------------------------------------------------ */
  function buildPlannerUI() {
    var host = document.getElementById('wangan-plan');
    if (!host) return;
    var html = '';
    SEGMENTS.forEach(function (seg, i) {
      html += '<div class="ss-sec"><h3>SEG ' + (i + 1) + ' — ' + esc(seg.name) +
        ' <span style="color:var(--text3);font-size:11px">' + seg.km + ' km</span></h3>';
      html += '<div class="wangan-branches">';
      BRANCHES[i].forEach(function (b) {
        html += '<button type="button" class="wangan-branch" data-seg="' + i + '" data-pick="' + b.id + '"' +
          ' onclick="WanganModes.pickBranch(' + i + ',\'' + b.id + '\')">' +
          '<span class="wb-tag">' + b.id + '</span>' +
          '<span class="wb-label">' + esc(b.label) + '</span>' +
          '<span class="wb-desc">' + esc(b.desc) + '</span>' +
          (b.hazard ? '<span class="wb-hazard">HAZARD +SPEED</span>' : '') +
          (b.bonus ? '<span class="wb-bonus">+' + Math.round(b.bonus * 100) + '% SCORE</span>' : '') +
          '</button>';
      });
      html += '</div></div>';
    });
    host.innerHTML = html;
    syncPlannerPicks();
  }

  function syncPlannerPicks() {
    document.querySelectorAll('.wangan-branch').forEach(function (el) {
      var seg = +el.getAttribute('data-seg'), pick = el.getAttribute('data-pick');
      var chosen = WE.route[seg] && WE.route[seg].pick === pick;
      el.classList.toggle('chosen', chosen);
    });
    /* The start button is ALWAYS alive. Incomplete: it is a guide — shows
       progress, clicking it jumps you to the first segment still missing a
       pick. Complete: it becomes RUN THE ROUTE. A disabled-looking button
       labelled "PICK A BRANCH PER SEGMENT" read as broken before. */
    var okBtn = document.getElementById('wangan-start');
    if (okBtn) {
      var done = SEGMENTS.every(function (_, i) { return WE.route[i]; });
      okBtn.disabled = false;
      if (done) {
        okBtn.textContent = 'RUN THE ROUTE ▸';
        okBtn.classList.remove('wangan-start-guide');
      } else {
        var n = SEGMENTS.filter(function (_, i) { return WE.route[i]; }).length;
        okBtn.textContent = 'PLANNING ' + n + '/' + SEGMENTS.length + ' — TAP FOR HELP';
        okBtn.classList.add('wangan-start-guide');
      }
    }
  }

  /* One entry point for the bottom button: confirm when ready, else guide. */
  function plannerAction() {
    var missing = -1;
    for (var i = 0; i < SEGMENTS.length; i++) { if (!WE.route[i]) { missing = i; break; } }
    if (missing === -1) { confirmRoute(); return; }
    var cards = document.querySelectorAll('.wangan-branch[data-seg="' + missing + '"]');
    if (cards.length) {
      cards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      cards.forEach(function (c) {
        c.classList.remove('nudge');
        void c.offsetWidth;
        c.classList.add('nudge');
      });
      wanganFlash('SEG ' + (missing + 1) + ' — PICK A BRANCH', 'good');
    }
  }

  function pickBranch(seg, pick) {
    var b = BRANCHES[seg].find(function (x) { return x.id === pick; });
    if (!b) return;
    WE.route[seg] = { seg: seg, pick: pick, hazard: b.hazard || null, bonus: b.bonus || 0 };
    try { localStorage.setItem('rpa.wangan.route', JSON.stringify(WE.route)); } catch (e) {}
    syncPlannerPicks();
    var el = document.querySelector('.wangan-branch[data-seg="' + seg + '"][data-pick="' + pick + '"]');
    if (el) {
      el.classList.remove('nudge');
      void el.offsetWidth;
      el.classList.add('flashpick');
      setTimeout(function () { el.classList.remove('flashpick'); }, 450);
    }
    wanganFlash('SEG ' + (seg + 1) + ': ' + b.label.toUpperCase() + ' — LOCKED IN', 'good');
  }

  function openPlanner() {
    WE.route = [];
    try {
      var saved = JSON.parse(localStorage.getItem('rpa.wangan.route') || '[]');
      if (Array.isArray(saved)) WE.route = saved.slice(0, SEGMENTS.length);
    } catch (e) {}
    WE.active = false;
    buildPlannerUI();
    if (typeof show === 'function') show('wangan');
  }

  /* Build the actual stage from the plan. Notes use tokens the existing
     parser already knows (direction+number, FLAT, CREST, LONG, INTO,
     TIGHTENS, JUNCTION, NARROW, distances, !/!! cautions). */
  function buildStage() {
    var hazard = WE.route.some(function (r) { return r && r.hazard === '!!'; });
    var caution = WE.route.some(function (r) { return r && r.hazard === '!'; });
    var notes = [
      { raw: 'FLAT 300', ans: 'flat 300 metres', narr: 'Bayshore ramp. The city opens up. This is what the car was built for.', comm: 'Midnight. The expressway is yours.' },
      { raw: 'R5 LONG', ans: 'right open long', narr: 'Long sweeper along the container yards.', comm: 'Hold the line. Let it breathe.' },
      { raw: (caution ? 'L3 ! CREST' : 'L3 CREST'), ans: caution ? 'left tight caution over crest' : 'left tight over crest', narr: caution ? 'Spotter says cameras on the overpass bridge.' : 'Blind over the port flyover.', comm: caution ? 'Cameras do not chase. They remember.' : 'Commit before the crest or lose the exit.' },
      { raw: 'L5 INTO R4 150', ans: 'left open into right medium 150 metres', narr: 'The Yokohane split. Tunnel bore ahead.', comm: 'Bore choice made on the planner — you own it now.' },
      { raw: hazard ? 'FLAT R6 TUNNEL' : 'R5 TUNNEL', ans: hazard ? 'flat right fast tunnel' : 'right open tunnel', narr: hazard ? 'Coned maintenance gap inside the bore. Walls in close.' : 'Tunnel: no lift. The echo carries for kilometres.', comm: hazard ? 'Gap traffic cones do not forgive.' : 'No lift. Trust the notes.' },
      { raw: 'JUNCTION R3', ans: 'junction right tight', narr: 'Bore junction. Feeder road on the right.', comm: 'This is where patrols join. Check your mirror.' },
      { raw: (caution ? 'L4 ! NARROW' : 'L4 NARROW'), ans: caution ? 'left medium caution narrows' : 'left medium narrows', narr: caution ? 'C1 walls close in over the loop.' : 'C1 inner loop between the barriers.', comm: caution ? 'One tap and the run is a highlight reel for the wrong reasons.' : 'Barriers both sides. Smooth hands.' },
      { raw: hazard ? 'R2!! 100' : 'R3 100', ans: hazard ? 'right very tight maximum caution 100 metres' : 'right tight 100 metres', narr: hazard ? 'Service drain mouth. Cameras at both ends of this one.' : 'Exit ramp tightens under the bridge.', comm: hazard ? 'The Blackbird line. Cameras at both ends.' : 'Almost home.' },
      { raw: 'FLAT FINISH', ans: 'flat finish', narr: 'Hamazaki straight. Douse the lights. Gone.', comm: 'Run complete — if the road lets you.' }
    ];
    return {
      name: 'WANGAN — ' + SEGMENTS.map(function (s) { return s.name.split(' ')[0]; }).join('·'),
      country: 'Shuto Expressway',
      surf: 'Expressway asphalt',
      weather: 'Clear · midnight · dry',
      km: '24.7',
      cond: 'Planned route: ' + WE.route.map(function (r) { return r ? r.pick : '?'; }).join(''),
      notes: notes
    };
  }

  function confirmRoute() {
    var done = SEGMENTS.every(function (_, i) { return WE.route[i]; });
    if (!done) return;
    /* standalone entry: the normal setup flow normally sets these; default
       to Street-appropriate values so beginStageWithData never sees null */
    if (typeof G !== 'undefined') {
      if (!G.era) G.era = 'w24';
      if (typeof DIFFS !== 'undefined' && (G.diff == null)) G.diff = 1;
      G.timeLimit = DIFFS[G.diff].s;
    }
    WE.active = true;
    WE.phase = 'patrol';
    WE.escapes = 0; WE.busted = 0;
    WE.notesTillCheck = 2 + Math.floor(Math.random() * 3);
    WE.pursuitNoteIdx = -1; WE.savedNote = null;
    var stage = buildStage();
    if (typeof G !== 'undefined') G.stageName = stage.name; // engine reads this in applyWeatherTempo/ghost keys
    if (typeof beginStageWithData === 'function') beginStageWithData(stage);
    hud();
  }

  /* ------------------------------------------------------------------ */
  /* Phase 2 — police encounters during the run                         */
  /* ------------------------------------------------------------------ */
  function hud() {
    var el = document.getElementById('wangan-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wangan-hud';
      el.className = 'wangan-hud';
      var meta = document.getElementById('g-meta');
      if (meta && meta.parentNode) meta.parentNode.insertBefore(el, meta.nextSibling);
      else document.getElementById('game').appendChild(el);
    }
    var route = WE.route.map(function (r) { return r ? r.pick : '?'; }).join('');
    var cops = WE.phase === 'pursuit'
      ? '<span class="wh-cops">● POLICE</span>'
      : '<span class="wh-clear">NO VISUAL</span>';
    el.innerHTML = '<span class="wh-route">ROUTE ' + esc(route) + '</span>' +
      '<span class="wh-sep">·</span><span class="wh-esc">ESCAPED ' + WE.escapes + '</span>' +
      '<span class="wh-sep">·</span><span class="wh-bust">BUSTED ' + WE.busted + '</span>' +
      '<span class="wh-sep">·</span>' + cops;
    el.style.display = 'flex';
  }
  function hudHide() {
    var el = document.getElementById('wangan-hud');
    if (el) el.style.display = 'none';
  }

  /* Called right before loadNote renders G.notes[G.idx] (see rally.js hook). */
  function maybeEncounter(idx) {
    if (!WE.active || WE.phase === 'pursuit') return false;
    if (idx <= 0 || idx >= (typeof G !== 'undefined' && G.notes ? G.notes.length - 1 : 99)) return false;
    WE.notesTillCheck--;
    if (WE.notesTillCheck > 0) { hud(); return false; }
    // roll: ~1 in 3 check points becomes a live pursuit
    if (Math.random() > 0.34) { WE.notesTillCheck = 2 + Math.floor(Math.random() * 3); hud(); return false; }
    startPursuit(idx);
    return true;
  }

  function startPursuit(idx) {
    var g = (typeof G !== 'undefined') ? G : null;
    if (!g || !g.notes || !g.notes[idx]) return;
    WE.savedNote = g.notes[idx];
    WE.pursuitNoteIdx = idx;
    WE.phase = 'pursuit';
    WE.evadeWord = EVADE_WORDS[Math.floor(Math.random() * EVADE_WORDS.length)];
    var line = SPOTTER_LINES[Math.floor(Math.random() * SPOTTER_LINES.length)];
    g.notes[idx] = {
      raw: ' POLICE ' + WE.evadeWord.toUpperCase(),
      ans: WE.evadeWord,
      narr: 'SPOTTER: ' + line + ' — TYPE "' + WE.evadeWord.toUpperCase() + '"',
      comm: 'Blue lights in the mirror. Do what the spotter says.',
      wanganEvade: true
    };
    hud();
    try { if (typeof posthog !== 'undefined') posthog.capture('wangan_pursuit', { note: idx }); } catch (e) {}
  }

  /* Called from the submit verdict path — ok=false means the evasion failed */
  function onAnswer(idx, ok) {
    if (!WE.active) return;
    if (WE.phase === 'pursuit' && idx === WE.pursuitNoteIdx) {
      if (ok) {
        WE.escapes++;
        RALLY_STATE.multiplier = Math.min(2.0, RALLY_STATE.multiplier + 0.15);
        wanganFlash('ESCAPED — CLEAN GETAWAY', 'good');
        try { if (typeof Achievements !== 'undefined' && WE.escapes >= 3) Achievements.unlock('ghost_of_the_wangan'); } catch (e) {}
      } else {
        WE.busted++;
        if (typeof G !== 'undefined') { G.totalTimeLost += 15; }
        RALLY_STATE.streak = 0;
        RALLY_STATE.multiplier = 1.0;
        wanganFlash('BUSTED — +15s PENALTY', 'bad');
      }
      // restore the real corner note (its result was already recorded)
      if (typeof G !== 'undefined' && G.notes && WE.pursuitNoteIdx >= 0) {
        G.notes[WE.pursuitNoteIdx] = WE.savedNote;
      }
      WE.phase = 'patrol';
      WE.pursuitNoteIdx = -1; WE.savedNote = null;
      WE.notesTillCheck = 3 + Math.floor(Math.random() * 3);
      hud();
    } else {
      // clean notes: escape streak resets the police clock slightly
      if (ok && WE.notesTillCheck < 2) WE.notesTillCheck = 2;
    }
  }

  function onTimeout(idx) {
    if (WE.active && WE.phase === 'pursuit' && idx === WE.pursuitNoteIdx) {
      onAnswer(idx, false);
    }
  }

  /* Stage summary additions */
  function onEndStage() {
    if (!WE.active) return;
    WE.active = false;
    hudHide();
    try { if (typeof Achievements !== 'undefined' && WE.escapes > 0 && WE.busted === 0) Achievements.unlock('untouchable'); } catch (e) {}
    try {
      var el = document.getElementById('g-comm');
      if (el && WE.escapes + WE.busted > 0) {
        el.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:var(--cyan);font-family:\'IBM Plex Mono\',monospace;margin-top:6px">WANGAN REPORT — ROUTE ' +
          WE.route.map(function (r) { return r ? r.pick : '?'; }).join('') +
          ' · ESCAPED ' + WE.escapes + ' · BUSTED ' + WE.busted + '</div>';
      }
    } catch (e) {}
  }

  function onShow(id) {
    if (id !== 'game') { WE.active = false; hudHide(); }
  }

  /* Floating verdict flash inside the game screen */
  function wanganFlash(text, kind) {
    var el = document.createElement('div');
    el.className = 'wangan-flash ' + (kind === 'good' ? 'wf-good' : 'wf-bad');
    el.textContent = text;
    el.style.cssText = 'position:fixed;top:18%;left:50%;transform:translateX(-50%);z-index:7200;' +
      'padding:.5rem 1.2rem;border:1px solid;font-family:\'IBM Plex Mono\',monospace;' +
      'font-size:13px;letter-spacing:3px;font-weight:700;pointer-events:none';
    if (kind === 'good') {
      el.style.color = '#00f0ff'; el.style.borderColor = 'rgba(0,240,255,.7)';
      el.style.background = 'rgba(5,6,14,.9)'; el.style.boxShadow = '0 0 22px rgba(0,240,255,.35)';
    } else {
      el.style.color = '#ff2ec4'; el.style.borderColor = 'rgba(255,46,196,.7)';
      el.style.background = 'rgba(5,6,14,.9)'; el.style.boxShadow = '0 0 22px rgba(255,46,196,.35)';
    }
    document.body.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 1700);
    setTimeout(function () { el.remove(); }, 2200);
  }

  /* ------------------------------------------------------------------ */
  /* Public API + engine hooks                                          */
  /* ------------------------------------------------------------------ */
  window.WanganModes = {
    openPlanner: openPlanner,
    pickBranch: pickBranch,
    plannerAction: plannerAction,
    confirmRoute: confirmRoute,
    maybeEncounter: maybeEncounter,
    onAnswer: onAnswer,
    onTimeout: onTimeout,
    onEndStage: onEndStage,
    onShow: onShow,
    isActive: active,
    _state: WE
  };
})();
