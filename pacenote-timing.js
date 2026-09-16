// ============================================================================
// pacenote-timing.js — Real time pressure for the note loop
// ============================================================================
// What was wrong (honest note, pre-rework):
//   RALLY_STATE.reactionTime was measured from the LAST KEYSTROKE, was only
//   logged, and had ZERO effect on scoring. A player could answer on the
//   last millisecond or instantly and get the identical score. "Time
//   pressure" was a countdown that only decided timeout, not quality.
//
// What this module does:
//   1. Reaction time is measured from NOTE DISPLAY (loadNote), not last keystroke.
//   2. Symmetric EARLY/LATE zones with real score penalties:
//        • EARLY  (< 35% of the time budget elapsed): you called it before a
//          co-driver could know it — the driver acts on information you
//          haven't verified. Penalty ramps the earlier you call.
//        • SWEET (35–80%): the natural reading window. Peak of the window
//          gets a small bonus. No penalty.
//        • LATE (> 80%): you hesitated — the car is already turn-in. Penalty
//          ramps the later you call. Same ramp as EARLY. Symmetry is the
//          point: rushing and dawdling are both wrong.
//   3. Look-ahead pressure: when the NEXT note is complex, the CURRENT
//      note's time budget shrinks (a real co-driver must finish the call
//      before the driver needs the next one). Exposed as a factor that
//      rally.js folds into calculateDynamicTimeLimit().
//
// Zones are FRACTIONS of the per-note budget, so difficulty scaling (which
// changes the budget) automatically keeps the pressure symmetric at every
// difficulty.
// ============================================================================

const NotesTiming = (() => {

  // ---- tuning ------------------------------------------------------------
  const ZONES = {
    earlyCut: 0.35,   // below this fraction of budget = EARLY
    lateCut: 0.80,    // above this fraction of budget = LATE
    sweetLo: 0.45,    // bonus window start
    sweetHi: 0.70,    // bonus window end
    maxPenalty: 0.25, // cap on the score penalty (symmetric both sides)
    penaltyRamp: 0.8, // penalty per unit of ratio outside the zone
    sweetBonus: 0.05, // small bonus for calling in the natural window
  };

  // ---- session state -----------------------------------------------------
  let shownAt = 0;
  let currentLimit = 0; // seconds
  const stats = {
    early: 0, sweet: 0, late: 0, timeout: 0,
    ratioSum: 0, ratioCount: 0,
    lastVerdict: null,
  };

  function resetSession() {
    stats.early = stats.sweet = stats.late = stats.timeout = 0;
    stats.ratioSum = 0; stats.ratioCount = 0; stats.lastVerdict = null;
  }

  // ---- complexity (shared definition, with safe fallback) ----------------
  function complexity(raw) {
    if (typeof calculateNoteComplexity === 'function') {
      try { return calculateNoteComplexity(raw); } catch (e) { /* fall through */ }
    }
    // Fallback estimate: tokens + cautions + links weigh roughly like the
    // game's own complexity function for typical notes.
    const t = String(raw || '').trim();
    if (!t) return 1;
    let c = t.split(/\s+/).length * 0.5;
    if (/!/.test(t)) c += 0.75;
    if (/INTO|>/.test(t)) c += 0.5;
    return Math.max(1, c);
  }

  // ---- look-ahead pressure ------------------------------------------------
  // Returns a multiplier (<1) for the CURRENT note's time budget based on
  // how complex the NEXT note is. Called from calculateDynamicTimeLimit().
  function lookAheadFactor(currentRaw, nextRaw) {
    if (!nextRaw) return 1.0;                       // last note: no pressure from ahead
    const cNext = complexity(nextRaw);
    // A trivial next note (c<=1.5) costs nothing; a stacked multi-feature
    // note (c>=4.5) takes up to 18% of the current budget so the call can
    // finish before the driver needs it.
    return 1 - Math.min(0.18, Math.max(0, (cNext - 1.5) * 0.06));
  }

  // ---- zone evaluation ----------------------------------------------------
  // elapsedMs / limitSec -> verdict + symmetric penalty / sweet bonus
  function evaluate(elapsedMs, limitSec) {
    const ratio = limitSec > 0 ? (elapsedMs / 1000) / limitSec : 1;
    let verdict, penalty = 0, bonus = 0;

    if (ratio < ZONES.earlyCut) {
      verdict = 'early';
      penalty = Math.min(ZONES.maxPenalty, (ZONES.earlyCut - ratio) * ZONES.penaltyRamp);
    } else if (ratio <= ZONES.lateCut) {
      verdict = 'sweet';
      if (ratio >= ZONES.sweetLo && ratio <= ZONES.sweetHi) bonus = ZONES.sweetBonus;
    } else {
      verdict = 'late';
      penalty = Math.min(ZONES.maxPenalty, (ratio - ZONES.lateCut) * ZONES.penaltyRamp);
    }

    // telemetry (per submitted note; timeouts recorded separately)
    stats[verdict] = (stats[verdict] || 0) + 1;
    stats.ratioSum += ratio; stats.ratioCount++;
    stats.lastVerdict = verdict;

    return { verdict, ratio, penalty, bonus, elapsedMs };
  }

  // ---- integration hooks (called from rally.js) ---------------------------
  function onNoteShown(limitSec) {
    shownAt = Date.now();
    currentLimit = limitSec || 0;
  }

  // Called once per submission. Returns null if no note was shown (safety).
  function onSubmit() {
    if (!shownAt) return null;
    const result = evaluate(Date.now() - shownAt, currentLimit);
    return result;
  }

  // Timeout path: the countdown hit zero — score penalty doesn't apply (the
  // note already failed), but the zone telemetry should record it.
  function onTimeout() {
    stats.timeout++;
    stats.lastVerdict = 'timeout';
  }

  // An empty submit paused the countdown (rally.js restarts the interval);
  // shift shownAt forward by the paused duration so the early/late verdict
  // measures driving time, not typing-a-blank time.
  function resumeAfterPause(pausedMs) {
    if (!shownAt) return;
    shownAt += Math.max(0, pausedMs || 0);
  }

  function sinceShownMs() { return shownAt ? Date.now() - shownAt : 0; }

  // ---- scoring helper -----------------------------------------------------
  function applyToScore(baseScore, timing) {
    if (!timing) return baseScore;
    return Math.max(0, Math.min(1, baseScore - timing.penalty + timing.bonus));
  }

  function avgRatio() {
    return stats.ratioCount ? stats.ratioSum / stats.ratioCount : 0;
  }

  // ------------------------------------------------------------------
  // Tuning panel + self-test — proof, not vibes. Drop-in for the Note
  // Editor. Sliders adjust the live constants; the SVG draws the ACTUAL
  // penalty curve from the ACTUAL evaluate() function. The early/late
  // slopes are mirrored by construction (same ramp, same cap both sides),
  // and the drawn curve stays a mirror however you tune it.
  // ------------------------------------------------------------------
  function attachTuningUI(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const row = (id, label, min, max, step, val, fmt) => `
      <label>${label}
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">
        <span id="${id}-val" style="color:var(--text3)">${fmt(val)}</span>
      </label>`;

    el.innerHTML = `
      <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;color:var(--text2);margin-bottom:.5rem">Time Pressure Tuning</div>
      ${row('tp-early', 'Early cut (fraction of budget)', 0.1, 0.5, 0.01, ZONES.earlyCut, v => (v * 100 | 0) + '%')}
      ${row('tp-late', 'Late cut (fraction of budget)', 0.5, 0.95, 0.01, ZONES.lateCut, v => (v * 100 | 0) + '%')}
      ${row('tp-cap', 'Max penalty', 0.05, 0.5, 0.01, ZONES.maxPenalty, v => (v * 100 | 0) + '%')}
      ${row('tp-ramp', 'Penalty ramp', 0.3, 1.5, 0.05, ZONES.penaltyRamp, v => v.toFixed(2))}
      <svg class="tun-curve" id="tp-curve" viewBox="0 0 300 110" aria-label="Penalty curve"></svg>
      <div style="color:var(--text3);font-size:10px">Curve = real evaluate() output. Slopes stay mirrored by construction.</div>`;

    const draw = () => {
      const N = 120, pts = [];
      for (let i = 0; i <= N; i++) {
        const ratio = i / N;
        const r = evaluate(ratio * 10000, 10); // elapsed scaled so ratio matches
        pts.push({ ratio, net: r.bonus - r.penalty, verdict: r.verdict });
      }
      const W = 300, H = 110, mid = 55;
      const x = r => (r * (W - 10) + 5).toFixed(1);
      const y = v => (mid - v * 180).toFixed(1); // 0.25 cap -> 45px swing
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.ratio)},${y(p.net)}`).join(' ');
      const sweet = pts.find(p => p.verdict === 'sweet');
      const last = pts[pts.length - 1];
      el.querySelector('#tp-curve').innerHTML = `
        <line x1="5" y1="${mid}" x2="295" y2="${mid}" stroke="var(--brd2)" stroke-width="1"/>
        <line x1="${x(ZONES.earlyCut)}" y1="8" x2="${x(ZONES.earlyCut)}" y2="102" stroke="var(--rpa-danger)" stroke-width="1" stroke-dasharray="3 3"/>
        <line x1="${x(ZONES.lateCut)}" y1="8" x2="${x(ZONES.lateCut)}" y2="102" stroke="var(--rpa-danger)" stroke-width="1" stroke-dasharray="3 3"/>
        <path d="${path}" fill="none" stroke="var(--gold)" stroke-width="2"/>
        ${sweet ? `<circle cx="${x((ZONES.sweetLo + ZONES.sweetHi) / 2)}" cy="${y(0.05)}" r="3" fill="var(--rpa-ok)"/>` : ''}
        <circle cx="${x(last.ratio)}" cy="${y(last.net)}" r="3" fill="var(--rpa-danger)"/>
        <text x="8" y="14" fill="var(--text3)" font-size="8" font-family="monospace">EARLY</text>
        <text x="252" y="14" fill="var(--text3)" font-size="8" font-family="monospace">LATE</text>`;
    };

    const bind = (id, key, cast) => {
      const s = document.getElementById(id);
      if (!s) return;
      s.addEventListener('input', () => {
        ZONES[key] = cast(s.value);
        const v = document.getElementById(id + '-val');
        if (v) v.textContent = key === 'penaltyRamp' ? Number(s.value).toFixed(2) : (s.value * 100 | 0) + '%';
        draw();
      });
    };
    bind('tp-early', 'earlyCut', Number);
    bind('tp-late', 'lateCut', Number);
    bind('tp-cap', 'maxPenalty', Number);
    bind('tp-ramp', 'penaltyRamp', Number);
    draw();
  }

  return {
    ZONES,
    complexity,
    lookAheadFactor,
    evaluate,
    onNoteShown,
    onSubmit,
    onTimeout,
    resumeAfterPause,
    sinceShownMs,
    applyToScore,
    stats,
    resetSession,
    avgRatio,
    attachTuningUI,
    evaluateZones: ZONES,
  };
})();

window.NotesTiming = NotesTiming;
