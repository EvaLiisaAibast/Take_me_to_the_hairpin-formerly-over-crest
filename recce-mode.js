// ============================================================================
// recce-mode.js — Recce-and-call-back: THE co-driver mechanic
// ============================================================================
// The core loop, mirroring what real co-drivers do on a recce run:
//
//   PASS 1 — RECCE: the stage is driven past you note-by-note. Each canonical
//   note is shown briefly (auto-advances — the car doesn't wait for you).
//   You scribble YOUR OWN shorthand into a notepad. You cannot copy the
//   canonical answer; you can only compress what you saw into your own
//   symbols. Textarea stays enabled the whole time — scribbling while the
//   next corner approaches IS the skill.
//
//   PASS 2 — CALL-BACK: your own scribbles come back to you, one at a time,
//   under the standard note timer. You read them aloud (type them) the way
//   you'd call them in the car. Scoring compares the MEANING of your call
//   against the canonical note via similarity() — not your spelling of your
//   own shorthand — so your personal notation is legitimate as long as it
//   carries the information.
//
//   Between passes: a linting review highlights where your shorthand is
//   ambiguous (e.g. a scribble that parses to two different corners under
//   your active convention, or a note you left blank).
//
// Persistence: sessions are saved to localStorage so a recce can be resumed.
// Scoring reuses the game's own similarity()/normaliseAnswer() when present.
// ============================================================================

const RecceMode = (() => {

  // ---- configuration ------------------------------------------------------
  const CONFIG = {
    recceSecondsPerNote: 6,     // how long each canonical note stays visible
    minPass2BudgetSec: 4,
    maxScribbleLen: 60,
  };

  // ---- state --------------------------------------------------------------
  let session = null;   // { stageName, notes:[{raw, ans}], scribbles:[], phase }

  // ---- persistence --------------------------------------------------------
  function saveSession() {
    try { localStorage.setItem('rpa_recce_session', JSON.stringify(session)); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem('rpa_recce_session')); } catch (e) { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem('rpa_recce_session'); } catch (e) {}
  }

  // ---- similarity (reuse game scoring when available) ----------------------
  function scoreCall(typedCall, canonicalAns) {
    if (typeof similarity === 'function') {
      try { return similarity(typedCall, canonicalAns); } catch (e) { /* fall through */ }
    }
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const a = norm(typedCall).split(/\s+/);
    const b = norm(canonicalAns).split(/\s+/);
    const setA = new Set(a), setB = new Set(b);
    let hit = 0;
    setA.forEach(w => { if (setB.has(w)) hit++; });
    return hit / Math.max(setB.size, 1);
  }

  // ---- shorthand linter ----------------------------------------------------
  // Flags scribbles that are blank, or that parse ambiguously under the
  // active convention (e.g. bare numbers with no direction, or a direction
  // with no grade). Display-only aid; never blocks.
  function lintScribble(scribble, canonicalRaw) {
    const issues = [];
    const s = String(scribble || '').trim();
    if (!s) { issues.push('empty — you wrote nothing for this note'); return issues; }
    if (s.length > CONFIG.maxScribbleLen) issues.push('very long — hard to read back at speed');

    const parsed = (typeof PacenoteConventions !== 'undefined')
      ? PacenoteConventions.parse(s) : null;

    if (parsed && parsed.length) {
      const corners = parsed.filter(t => t.type === 'corner').length;
      const canonCorners = (typeof PacenoteConventions !== 'undefined')
        ? PacenoteConventions.parse(canonicalRaw).filter(t => t.type === 'corner').length
        : 1;
      if (corners === 0) issues.push('no corner captured — only features/distances');
      if (corners > 0 && corners < canonCorners) issues.push(`captures ${corners} of ${canonCorners} corners`);
    }
    return issues;
  }

  // ---- session lifecycle ----------------------------------------------------
  function start(stage) {
    if (!stage || !Array.isArray(stage.notes) || stage.notes.length === 0) {
      return { error: 'Stage has no notes' };
    }
    session = {
      stageName: stage.name,
      phase: 'recce',
      notes: stage.notes.map(n => ({ raw: n.raw, ans: n.ans || (typeof PacenoteSystem !== 'undefined' ? PacenoteSystem.translate(n.raw) : n.raw) })),
      scribbles: stage.notes.map(() => ''),
      recceStartedAt: Date.now(),
    };
    saveSession();
    return { ok: true };
  }

  function resume() {
    const s = loadSession();
    if (!s || !s.notes || s.notes.length === 0) return { error: 'No saved recce session' };
    session = s;
    return { ok: true, phase: session.phase };
  }

  function getState() { return session ? { ...session, scribbles: [...session.scribbles] } : null; }

  function setScribble(idx, text) {
    if (!session || idx < 0 || idx >= session.scribbles.length) return;
    session.scribbles[idx] = String(text || '').slice(0, CONFIG.maxScribbleLen * 2);
    saveSession();
  }

  function finishRecce() {
    if (!session) return { error: 'No session' };
    // Lint all scribbles; blanks and ambiguities are reported, not blocked.
    const lint = session.notes.map((n, i) => lintScribble(session.scribbles[i], n.raw));
    session.phase = 'lint';
    saveSession();
    return { ok: true, lint };
  }

  function confirmToCallback() {
    if (!session) return { error: 'No session' };
    session.phase = 'callback';
    session.callIdx = 0;
    session.results = [];
    saveSession();
    return { ok: true };
  }

  function currentCallbackNote() {
    if (!session || session.phase !== 'callback') return null;
    const i = session.callIdx;
    if (i >= session.notes.length) return null;
    return {
      index: i,
      scribble: session.scribbles[i] || '(nothing — you left this blank in recce)',
      total: session.notes.length,
    };
  }

  function submitCallback(callText) {
    if (!session || session.phase !== 'callback') return { error: 'Not in callback phase' };
    const i = session.callIdx;
    const canonical = session.notes[i];
    const sim = scoreCall(callText, canonical.ans);
    const ok = sim >= 0.62; // align with the game's base forgiveness window
    session.results.push({
      index: i, raw: canonical.raw, scribble: session.scribbles[i] || '',
      call: callText, expected: canonical.ans, sim, ok,
    });
    session.callIdx++;
    const done = session.callIdx >= session.notes.length;
    if (done) { session.phase = 'complete'; }
    saveSession();
    return { ok, sim, done, result: session.results[session.results.length - 1] };
  }

  function timeoutCallback() {
    if (!session || session.phase !== 'callback') return { error: 'Not in callback phase' };
    return submitCallback(''); // empty call = miss
  }

  function summary() {
    if (!session || session.phase !== 'complete') return null;
    const r = session.results;
    return {
      stageName: session.stageName,
      total: r.length,
      called: r.filter(x => x.ok).length,
      blankScribbles: session.scribbles.filter(s => !s.trim()).length,
      avgSim: r.reduce((a, x) => a + x.sim, 0) / Math.max(r.length, 1),
      perNote: r.map(x => ({ scribble: x.scribble, call: x.call, expected: x.expected, sim: x.sim, ok: x.ok })),
    };
  }

  function abandon() { session = null; clearSession(); }

  // Telemetry hook — no-op if posthog is absent, silent if blocked.
  function track(event, props) {
    try {
      if (typeof posthog !== 'undefined') posthog.capture(event, props || {});
    } catch (e) {}
  }

  return {
    CONFIG, start, resume, getState, setScribble,
    finishRecce, confirmToCallback,
    currentCallbackNote, submitCallback, timeoutCallback,
    summary, abandon, lintScribble, scoreCall, track,
  };
})();

window.RecceMode = RecceMode;
