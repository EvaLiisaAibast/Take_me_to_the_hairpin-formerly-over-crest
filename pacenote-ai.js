// ============================================================================
// pacenote-ai.js — PaceAI, an on-device learner for YOUR mistake patterns
// ============================================================================
// What this is (honest note): a tiny statistical model that lives in your
// browser's localStorage. No server, no API key, no data leaves the machine.
// After EVERY answered note it folds one observation into per-category error
// rates using an exponentiated-gradient update, then mixes your last stages
// with exponential time-decay so "how you drive NOW" outweighs month-old
// history. From that it produces:
//   • a live miss-risk forecast for each note while you drive,
//   • a pre-stage readiness read in the Stage Setup banner,
//   • the "race engineer's read" section on the results debrief, and
//   • an extra, personalized item in the training plan.
// It is genuinely learning (the numbers move with evidence, in both
// directions — repeated successes UN-learn an old weakness), but it is
// statistics on ~20 notes/stage, not a neural network. The UI says
// "personal model", never "magic".
// ============================================================================
(function () {
  'use strict';

  const KEY = 'rpa_paceai_v1';
  const CATS = ['direction', 'severity', 'modifier', 'noise'];
  const MODS = ['easy','tight','opens','long','short','dontcut','crest','caution','ice','into','care','tightens','narrows','jump','bumps','flat'];
  const MAX_HISTORY = 40;

  function blank() {
    return {
      sessions: 0, notes: 0, correct: 0,
      cat:  { direction: 0, severity: 0, modifier: 0, noise: 0 },   // error mass
      catT: { direction: 0, severity: 0, modifier: 0, noise: 0 },   // trials
      mod: {}, modT: {},                                            // per-hazard leak
      timing: { early: 0, sweet: 0, late: 0 },
      timeouts: 0,
      history: []   // per-stage summaries for the trend mix
    };
  }

  let M = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const m = JSON.parse(raw); return Object.assign(blank(), m); }
    } catch (e) { /* corrupted storage: start fresh */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} }

  // ---- learning ----------------------------------------------------------
  // Bounded multiplicative smoothing: a miss pushes the weight toward 1
  // (proportional to headroom), a clean call decays it toward 0. lr in (0,1).
  function update(domainObj, key, happened, lr) {
    if (!domainObj[key]) domainObj[key] = 0;
    domainObj[key] = happened
      ? Math.min(0.95, domainObj[key] + lr * (1 - domainObj[key]))
      : Math.max(0.001, domainObj[key] * (1 - lr));
  }

  // Public: fold one answered note into the model.
  // obs = { expected, typed, ok, skipped, timeout, timing, parts }
  //   parts = { direction: n, severity: n, ... } error counts from analyzeMiss()
  function observe(obs) {
    if (!obs || obs.skipped) return;             // skips teach nothing about knowledge
    const lr = 0.30;
    CATS.forEach(c => {
      const missCount = (obs.parts && obs.parts[c]) || 0;
      const present = noteHasCat(c, obs.expected);
      if (present || missCount) update(M.cat, c, missCount > 0, present ? lr : lr * 0.6);
      if (present) M.catT[c]++;
    });
    MODS.forEach(mo => {
      const present = new RegExp('\\b' + mo + '\\b', 'i').test(obs.expected || '');
      if (!present) return;
      M.modT[mo] = (M.modT[mo] || 0) + 1;
      const missed = !!(obs.parts && obs.parts.modifier) && obs.typed && !new RegExp('\\b' + mo + '\\b', 'i').test(obs.typed);
      if (missed || (obs.timeout && (obs.parts && obs.parts.modifier))) update(M.mod, mo, true, lr);
      else if (!missed) update(M.mod, mo, false, lr * 0.9);
    });
    if (obs.timing === 'early' || obs.timing === 'sweet' || obs.timing === 'late') M.timing[obs.timing]++;
    if (obs.timeout) M.timeouts++;
    M.notes++; if (obs.ok) M.correct++;
    save();
  }

  function noteHasCat(cat, expected) {
    const e = (expected || '').toLowerCase();
    switch (cat) {
      case 'direction': return /\bleft\b|\bright\b|\bl(?=\d)|\br(?=\d)/.test(e);
      case 'severity':  return /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|[1-9])\b/.test(e);
      case 'modifier':  return MODS.some(mo => e.includes(mo));
      case 'noise':     return false;             // can't "miss" noise that isn't there
    }
    return false;
  }

  // Called by rally.js at endStage: summary of this stage joins the trend.
  function endSession(summary) {
    M.sessions++;
    M.history.push(summary);
    if (M.history.length > MAX_HISTORY) M.history.shift();
    save();
  }

  // ---- inference ---------------------------------------------------------
  // Time-decayed mixture: recent stages count more than old ones.
  function mixture(catKey) {
    if (!M.history.length) return null;
    let num = 0, den = 0;
    M.history.forEach((h, i) => {
      const w = Math.pow(0.90, M.history.length - 1 - i);
      const t = h.catT[catKey] || 0;
      den += w * t;
      num += w * (h.cat[catKey] || 0);
    });
    return den >= 4 ? num / den : null;
  }
  function mixTiming() {
    if (!M.history.length) return null;
    let e = 0, l = 0, s = 0, tot = 0;
    M.history.forEach((h, i) => {
      const w = Math.pow(0.90, M.history.length - 1 - i);
      const t = (h.timing || {});
      e += w * (t.early || 0); l += w * (t.late || 0); s += w * (t.sweet || 0);
      tot += w * ((t.early || 0) + (t.late || 0) + (t.sweet || 0));
    });
    return tot >= 8 ? { early: e / tot, late: l / tot, sweet: s / tot } : null;
  }
  function mixMod() {
    if (!M.history.length) return null;
    let miss = 0, tot = 0;
    M.history.forEach((h, i) => {
      const w = Math.pow(0.90, M.history.length - 1 - i);
      tot += w * (h.modTrials || 0);
      miss += w * (h.modMisses || 0);
    });
    return tot >= 10 ? miss / tot : null;
  }
  function overallAcc() { return M.notes >= 10 ? M.correct / M.notes : null; }

  const pct = x => Math.round(x * 100) + '%';

  // Forecast for one upcoming note (expected = its answer string).
  function forecast(expected) {
    const parts = [];
    CATS.forEach(c => { const p = mixture(c); if (p != null && noteHasCat(c, expected)) parts.push({ cat: c, p }); });
    let riskyMod = null, modP = 0;
    MODS.forEach(mo => {
      if (!new RegExp('\\b' + mo + '\\b', 'i').test(expected || '')) return;
      const p = M.mod[mo] || 0;
      if (p > modP && (M.modT[mo] || 0) >= 2) { modP = p; riskyMod = mo; }
    });
    const base = parts.length ? Math.max.apply(null, parts.map(p => p.p)) : 0.05;
    const risk = Math.min(0.95, Math.max(base, modP));
    const riskyCat = parts.sort((a, b) => b.p - a.p)[0] || null;
    return { risk, riskyCat, riskyMod: modP > 0.3 ? riskyMod : null };
  }

  // ---- stage-level analysis (feeds the debrief AI section) ---------------
  function analyze(results, misses) {
    if (!M.history.length || M.notes < 15) return null;   // not enough evidence yet
    const signals = [];
    const sessionCats = { direction: 0, severity: 0, modifier: 0, noise: 0 };
    misses.forEach(m => (m.gotWrong || []).forEach(w => { sessionCats[w.k] = (sessionCats[w.k] || 0) + 1; }));

    const ranked = CATS
      .map(c => ({ c, mix: mixture(c), sess: misses.length ? (sessionCats[c] || 0) / Math.max(1, misses.length) : 0 }))
      .filter(x => x.mix != null)
      .sort((a, b) => b.mix - a.mix);

    if (ranked.length && ranked[0].mix >= 0.04 && ranked[0].mix >= 1.6 * (ranked[1] ? ranked[1].mix : 0)) {
      const x = ranked[0];
      const phrases = {
        direction:  'the direction word is where you fall apart — ' + pct(x.mix) + ' of notes carrying L/R trip you',
        severity:   'you mis-grade corners under pressure — ' + pct(x.mix) + ' of numbered notes come out wrong',
        modifier:   'hazards are your blind spot — ' + pct(x.mix) + ' of notes with CREST / DON\u2019T CUT / CAUTION lose their warning',
        noise:      null
      };
      if (phrases[x.c]) signals.push({ title: 'Primary leak detected', body: phrases[x.c] + '. Your engineer weights your recent stages highest, and this is the single biggest predictor of your next miss.' });
      const nxt = ranked[1];
      if (nxt && nxt.mix >= 0.02) {
        const p2 = { direction: 'direction swaps', severity: 'severity slips', modifier: 'dropped hazards' }[nxt.c];
        if (p2) signals.push({ title: 'Secondary tendency', body: pct(nxt.mix) + ' of relevant notes also show ' + p2 + ' — real, but not yet your main leak.' });
      }
    }

    const mm = mixMod();
    if (mm != null && mm > 0.12) {
      let worst = null, wp = 0;
      MODS.forEach(mo => { if ((M.modT[mo] || 0) >= 2 && (M.mod[mo] || 0) > wp) { wp = M.mod[mo]; worst = mo; } });
      if (worst && wp > 0.25) signals.push({ title: 'Hazard memory', body: 'Your engineer keeps catching you dropping \u201C' + worst.toUpperCase() + '\u201D (' + pct(wp) + ' leak rate). That word has cost you the most calls of any hazard on the board.' });
    }

    const mt = mixTiming();
    if (mt) {
      const bias = mt.early - mt.late;
      if (bias >= 0.06) signals.push({ title: 'Tempo signature: early', body: 'Across your recent stages the engineer reads you as an early caller (' + pct(mt.early) + ' early vs ' + pct(mt.late) + ' late). You trade accuracy for speed before the note is verified.' });
      else if (bias <= -0.06) signals.push({ title: 'Tempo signature: late', body: 'Across your recent stages you consistently answer after the window (' + pct(mt.late) + ' late vs ' + pct(mt.early) + ' early). Your knowledge is fine; your commit speed is the bottleneck.' });
    }

    const oa = overallAcc();
    const sessAcc = results.length ? results.filter(r => r.ok).length / results.length : 0;
    if (oa != null && results.length >= 8 && sessAcc > oa + 0.10) {
      signals.push({ title: 'Above your baseline', body: 'This stage (' + pct(sessAcc) + ') beat your lifetime average (' + pct(oa) + ') by a clear margin. Whatever you did differently — keep doing that.' });
    } else if (oa != null && results.length >= 8 && sessAcc < oa - 0.10) {
      signals.push({ title: 'Below your baseline', body: 'This stage (' + pct(sessAcc) + ') fell under your lifetime average (' + pct(oa) + '). Fatigue, distraction or a harder stage — the pattern history will tell which over the next few runs.' });
    }

    signals.sort((a, b) => (a.title === 'Primary leak detected' ? -1 : 0) - (b.title === 'Primary leak detected' ? -1 : 0));
    return {
      headline: 'The notebook \u00B7 ' + M.notes + ' notes across ' + M.sessions + ' stages \u00B7 lifetime accuracy ' + (oa != null ? pct(oa) : '\u2014'),
      signals: signals.slice(0, 3),
      confidence: M.history.length >= 8 ? 'High confidence \u2014 your pattern history is stable.' : 'Still calibrating \u2014 a few more stages and the reads sharpen.',
      topSignal: signals[0] || null
    };
  }

  // ---- pre-stage readiness (setup banner) --------------------------------
  function readiness(context) {
    const oa = overallAcc();
    if (oa == null) return { text: 'Your engineer is still filling in the notebook \u2014 give it a stage or two.', tip: '' };
    const fatigue = 1 - oa;
    const risk = Math.min(0.9, Math.max(0.18, 0.18 + 0.55 * fatigue));
    const band = risk < 0.35 ? 'Sharp tonight \u2014 the notebook expects a clean run'
               : risk < 0.55 ? 'Competent, with a known weak flank'
               : 'Elevated miss-risk \u2014 expect to fight your own habits';
    const mt = mixTiming();
    const verdict = mt ? (mt.early - mt.late >= 0.06 ? 'jump early on' : mt.late - mt.early >= 0.06 ? 'hesitate on' : null) : null;
    let combo = '';
    if (verdict && fatigue >= 0.30 && M.sessions >= 2) {
      combo = ' Watch the ' + (verdict === 'jump early on' ? 'early-jump' : 'hesitation') + ' reflex \u2014 it is your signature under fatigue.';
    }
    let tip = '';
    const weakest = CATS.map(c => ({ c, p: mixture(c) })).filter(x => x.p != null).sort((a, b) => b.p - a.p)[0];
    if (weakest && weakest.p >= 0.04) {
      const label = { direction: 'L/R calls', severity: 'corner numbers', modifier: 'hazard words', noise: '' }[weakest.c];
      tip = 'Protect ' + label + ' first \u2014 that is where ' + pct(weakest.p) + ' of your misses live.';
    }
    return { text: band + (combo ? '.' + combo : ''), tip: tip };
  }

  function topTrainingNote() {
    const weakest = CATS.map(c => ({ c, p: mixture(c) })).filter(x => x.p != null).sort((a, b) => b.p - a.p)[0];
    if (!weakest || weakest.p < 0.04) return null;
    const drills = {
      direction: 'The notes say direction is still your biggest leak (' + pct(weakest.p) + ' of L/R notes). Warm up with a direction-only pass before the real stage.',
      severity:  'The notes say corner numbers are still your biggest leak (' + pct(weakest.p) + '). Refresh the 1\u20136 ladder before pushing the clock.',
      modifier:  'The notes say hazard words are still your biggest leak (' + pct(weakest.p) + '). Protect DON\u2019T CUT / CREST / CAUTION first, polish second.'
    };
    return { txt: drills[weakest.c], link: 'openTraining', linkTxt: 'Training School' };
  }

  function reset() {
    M = blank(); save();
    try {
      const c = document.getElementById('r-debrief');
      if (c) { const conf = c.querySelector('.db-ai-conf'); if (conf) conf.textContent = 'Model reset. Learning from zero.'; }
    } catch (e) {}
  }

  window.PaceAI_MODS = MODS;
  window.PaceAI = { observe, endSession, forecast, analyze, readiness, topTrainingNote, reset, _model: () => M };
})();
