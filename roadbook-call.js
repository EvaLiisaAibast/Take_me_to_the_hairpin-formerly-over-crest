/* ============================================================================
   roadbook-call.js — ROADBOOK THEME GAMEPLAY NODE
   ============================================================================

   ROAD CALL = read the route from the BOOK, not from heard words.

   Every other mode hands you the co-driver's spoken shorthand. This one is
   the paper: each corner arrives as a roadbook row — the TULIP DIAGRAM
   (the game's own corner renderer), the DISTANCE chip, and CAUTION markers
   markers — with the shorthand text hidden. You are the co-driver with the
   book on your lap: read the entry and call the corner in full English
   before the car arrives. The stage runs on the classic 90s WRC era.

   Everything rides beginStageWithData/submitAnswer. The only visual change
   is inside #g-note (shorthand → roadbook row) and #g-tulip (enlarged).
   ============================================================================ */
(function () {
  'use strict';

  var RB = { active: false, pending: -1, rows: 0, obs: null };

  /* Blind row for the CURRENT note: caution + distance only. The tulip
     diagram (already rendered by the engine) carries the corner itself. */
  function blindRowFor(idx) {
    var n = (typeof G !== 'undefined' && G.notes) ? G.notes[idx] : null;
    if (!n) return '';
    var distMatch = n.raw.match(/\b(\d{2,3})\b/);
    var caution = /!!/.test(n.raw) ? '!! ' : (/!/.test(n.raw) ? '! ' : '');
    return caution + (distMatch ? distMatch[1] + ' M' : '');
  }

  /* A MutationObserver, not a timer: loadNote rewrites the note text on
     several paths (initial render, the 150ms fade rewrite, post-feedback),
     and a scheduled redraw loses that race — full shorthand would flash
     through in blind mode. The observer rewrites every change instead.
     It settles after one extra pass (our own write re-fires it, the
     computed row then equals the current text, and it stops). */
  function startObserver() {
    if (RB.obs) return;
    var noteEl = document.getElementById('g-note');
    if (!noteEl) return;
    RB.obs = new MutationObserver(function () {
      if (!RB.active || typeof G === 'undefined' || G.stageEnded) return;
      var idx = G.idx;
      var n = G.notes && G.notes[idx];
      if (!n) return;
      var row = blindRowFor(idx);
      if (noteEl.textContent !== row) {
        noteEl.textContent = row;
        return; // our write re-fires the observer; next pass it settles
      }
      noteEl.classList.add('rb-blind');
      var tul = document.getElementById('g-tulip');
      if (tul) tul.classList.add('rb-blind');
    });
    RB.obs.observe(noteEl, { childList: true, characterData: true, subtree: true });
  }

  function stopObserver() {
    if (RB.obs) { RB.obs.disconnect(); RB.obs = null; }
    var noteEl = document.getElementById('g-note');
    var tulEl = document.getElementById('g-tulip');
    if (noteEl) noteEl.classList.remove('rb-blind');
    if (tulEl) tulEl.classList.remove('rb-blind');
  }

  /* ------------------------------------------------------------------ */
  /* Brief + launch                                                     */
  /* ------------------------------------------------------------------ */
  function openCall() {
    RB.active = false;
    buildBrief();
    if (typeof show === 'function') show('roadcall');
  }

  function buildBrief() {
    var host = document.getElementById('roadcall-brief');
    if (!host) return;
    host.innerHTML =
      '<div class="ss-sec"><h3>THE BOOK</h3>' +
      '<p style="color:var(--text2);font-size:13px;line-height:1.6">No spoken shorthand this time. Each corner arrives as a <b style="color:var(--gold)">roadbook row</b> — ' +
      'the tulip diagram of the corner, the distance after it, and the CAUTION mark for cautions. The shorthand words are hidden. ' +
      'Read the entry like a real co-driver with the book on your lap and <b style="color:var(--gold)">call the corner in full English</b> — ' +
      "“left tight over crest”, “square right don't cut”, whatever the row says. The diagram carries direction, severity and modifiers; " +
      'the chips carry everything else.</p></div>' +
      '<div class="ss-sec"><h3>HOW TO READ A TULIP</h3>' +
      '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:var(--text2);line-height:1.8">' +
      'Arrow into the corner = your entry line · the bend = direction + severity (1 hairpin … 6 flat sweep)<br>' +
      '<span style="color:var(--text3)">DISTANCE chip = metres until the next entry · CAUTION = caution the diagram can not show</span></div></div>';
  }

  function startCall() {
    /* standalone entry: classic 90s WRC era fits the paper book */
    if (typeof G !== 'undefined') {
      G.era = 'w90';
      if (typeof DIFFS !== 'undefined' && (G.diff == null)) G.diff = 1;
      G.timeLimit = DIFFS[G.diff].s;
    }
    var stage = JSON.parse(JSON.stringify(ERAS.w90.stages[0]));
    RB.active = true;
    RB.rows = 0;
    if (typeof G !== 'undefined') G.stageName = stage.name;
    if (typeof beginStageWithData === 'function') beginStageWithData(stage);
    startObserver();
  }

  /* ------------------------------------------------------------------ */
  /* The blind row: replace shorthand with the roadbook entry           */
  /* ------------------------------------------------------------------ */
  /* Bookkeeping only — the observer does the actual blinding. */
  function onNoteShown(idx) {
    if (!RB.active) return;
    RB.pending = idx;
    RB.rows++;
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                          */
  /* ------------------------------------------------------------------ */
  function onEndStage() {
    if (!RB.active) return;
    RB.active = false;
    stopObserver();
    /* gimmick achievements: volume + quality reads */
    try {
      if (typeof Achievements !== 'undefined') {
        if (RB.rows >= 10) Achievements.unlock('bookworm');
        if (RB.rows > 0 && typeof G !== 'undefined' && G.notes && typeof G.correct !== 'undefined' && (G.correct / G.notes.length) >= 0.8) Achievements.unlock('first_read');
      }
    } catch (e) {}
    try {
      var el = document.getElementById('g-comm');
      if (el) {
        el.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:var(--gold);font-family:\'IBM Plex Mono\',monospace;margin-top:6px">ROAD CALL — ' +
          RB.rows + ' ENTRIES READ FROM THE BOOK</div>';
      }
    } catch (e) {}
  }

  function onShow(id) {
    if (id !== 'game' && id !== 'roadcall') { RB.active = false; stopObserver(); }
  }

  window.RoadCall = {
    openCall: openCall,
    startCall: startCall,
    onNoteShown: onNoteShown,
    onEndStage: onEndStage,
    onShow: onShow,
    isActive: function () { return RB.active; },
    _state: RB
  };
})();
