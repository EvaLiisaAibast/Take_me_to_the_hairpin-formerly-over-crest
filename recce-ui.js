// ============================================================================
// recce-ui.js — UI controller for the Recce & Call-Back screen
// ============================================================================
// Binds RecceMode (recce-mode.js) to the #recce screen in index.html.
// Phase flow: pick → recce (pass 1, auto-advancing) → lint → callback
// (pass 2, timed calls) → summary. Session persists across reloads.
// ============================================================================

const RecceUI = (() => {

  const SECONDS_PER_NOTE = RecceMode.CONFIG.recceSecondsPerNote;
  const CB_BUDGET = 9; // seconds to read each own note back (pass 2)

  let pickTimer = null, pickInterval = null;
  let cbTimer = null, cbInterval = null;
  let scribbleTimer = null;
  let recceIdx = 0;

  function $(id) { return document.getElementById(id); }

  function showPhase(name) {
    ['recce-pick', 'recce-recce', 'recce-lint', 'recce-callback', 'recce-summary'].forEach(p => {
      const el = $(p);
      if (el) el.style.display = (p === name) ? '' : 'none';
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ------------------------------------------------------------------
  // Phase: stage picker
  // ------------------------------------------------------------------
  function renderPick() {
    const list = $('recce-stage-list');
    const rows = [];
    Object.entries(ERAS).forEach(([eraKey, era]) => {
      rows.push(`<div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;color:var(--text3);margin:10px 0 4px">${era.label}</div>`);
      (era.stages || []).forEach(st => {
        const safeName = String(st.name).replace(/'/g, "\\'");
        rows.push(`<div style="display:flex;align-items:center;gap:8px;background:var(--surf2);border:1px solid var(--brd2);padding:8px 10px;border-radius:4px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--text)">${escapeHtml(st.name)}</div>
            <div style="font-size:11px;color:var(--text3)">${escapeHtml(st.country || '')} · ${st.km || '?'} km · ${(st.notes || []).length} notes</div>
          </div>
          <button class="gbtn pri" onclick="recceStartStage('${eraKey}','${safeName}')">Recce →</button>
        </div>`);
      });
    });
    list.innerHTML = rows.join('');

    const resumeRow = $('recce-resume-row');
    const r = RecceMode.resume();
    if (r.ok) {
      const st = RecceMode.getState();
      resumeRow.style.display = '';
      resumeRow.querySelector('button').textContent =
        `Resume saved recce — ${st.stageName} (${st.phase === 'recce' ? 'pass 1 in progress' : st.phase})`;
    } else {
      resumeRow.style.display = 'none';
    }
  }

  // ------------------------------------------------------------------
  // Phase: recce pass (pass 1)
  // ------------------------------------------------------------------
  function startReccePass(eraKey, stageName) {
    const era = ERAS[eraKey];
    if (!era) return;
    const stage = (era.stages || []).find(s => s.name === stageName);
    if (!stage) return;
    const r = RecceMode.start(stage);
    if (r.error) { alert(r.error); return; }
    RecceMode.track('recce_started', { stage: stageName, notes: stage.notes.length });
    showPhase('recce-recce');
    recceIdx = 0;
    showRecceNote();
  }

  function showRecceNote() {
    const st = RecceMode.getState();
    if (recceIdx >= st.notes.length) { finishReccePass(); return; }

    $('recce-progress').textContent = `Note ${recceIdx + 1} / ${st.notes.length}`;
    $('recce-canon-note').textContent = st.notes[recceIdx].raw;
    // Tulip diagram alongside the canonical note (same renderer the game loop uses)
    const tulipEl = $('recce-tulip');
    if (tulipEl) {
      try {
        if (typeof parseNotesForTulip === 'function' && typeof drawTulipSVG === 'function') {
          const res = parseNotesForTulip(st.notes[recceIdx].raw);
          tulipEl.innerHTML = (res && res.notes && res.notes.length)
            ? res.notes.map(n => drawTulipSVG(n)).join('')
            : '';
        } else { tulipEl.innerHTML = ''; }
      } catch (e) { tulipEl.innerHTML = ''; }
    }
    $('recce-scribble').value = st.scribbles[recceIdx] || '';
    $('recce-scribble').disabled = false;
    $('recce-scribble').focus();

    let left = SECONDS_PER_NOTE;
    $('recce-countdown').textContent = left + 's';
    clearInterval(pickInterval); clearTimeout(pickTimer);
    pickInterval = setInterval(() => {
      left--;
      $('recce-countdown').textContent = left + 's';
      if (left <= 0) clearInterval(pickInterval);
    }, 1000);
    // THE core pressure: the car does not wait. Auto-advance, saving whatever
    // is scribbled at that moment.
    pickTimer = setTimeout(() => {
      saveScribbleNow(recceIdx);
      recceIdx++;
      showRecceNote();
    }, SECONDS_PER_NOTE * 1000);
  }

  function saveScribbleNow(idx) {
    if ($('recce-scribble')) RecceMode.setScribble(idx, $('recce-scribble').value);
  }

  function onScribbleInput() {
    clearTimeout(scribbleTimer);
    scribbleTimer = setTimeout(() => saveScribbleNow(recceIdx), 250);
  }

  function finishReccePass() {
    clearInterval(pickInterval); clearTimeout(pickTimer);
    saveScribbleNow(recceIdx);
    const r = RecceMode.finishRecce();
    if (r.error) { alert(r.error); return; }
    renderLint(r.lint);
    showPhase('recce-lint');
    const st = RecceMode.getState();
    RecceMode.track('recce_pass1_complete', { stage: st.stageName, notes: st.notes.length });
  }

  // ------------------------------------------------------------------
  // Phase: lint review
  // ------------------------------------------------------------------
  function renderLint(lint) {
    const st = RecceMode.getState();
    $('recce-lint-list').innerHTML = lint.map((issues, i) => {
      const s = st.scribbles[i] || '';
      const flag = issues.length
        ? `<span style="color:var(--red)"><i class="bi bi-exclamation-triangle"></i></span>`
        : `<span style="color:var(--green)"><i class="bi bi-check-circle"></i></span>`;
      return `<div style="background:var(--surf2);border:1px solid var(--brd2);padding:8px 10px;border-radius:4px;font-size:12px">
        <div>${flag} <b style="font-family:'IBM Plex Mono',monospace">${i + 1}. ${escapeHtml(s || '(blank)')}</b>
          <span style="color:var(--text3)">← the road said: ${escapeHtml(st.notes[i].raw)}</span></div>
        ${issues.map(x => `<div style="color:var(--gold);font-size:11px;margin-top:2px">${escapeHtml(x)}</div>`).join('')}
      </div>`;
    }).join('');
  }

  function backToRecce() {
    recceIdx = 0;
    showPhase('recce-recce');
    showRecceNote();
  }

  // ------------------------------------------------------------------
  // Phase: call-back pass (pass 2)
  // ------------------------------------------------------------------
  function startCallback() {
    const r = RecceMode.confirmToCallback();
    if (r.error) { alert(r.error); return; }
    showPhase('recce-callback');
    showCallbackNote();
  }

  function showCallbackNote() {
    const cur = RecceMode.currentCallbackNote();
    if (!cur) { renderSummary(); showPhase('recce-summary'); return; }

    $('cb-progress').textContent = `Note ${cur.index + 1} / ${cur.total}`;
    $('cb-scribble').textContent = cur.scribble;
    $('cb-input').value = '';
    $('cb-fb').textContent = '';
    $('cb-input').disabled = false;
    $('cb-input').focus();

    let left = CB_BUDGET;
    $('cb-timer').textContent = left + 's';
    $('cb-timer').style.color = 'var(--gold)';
    clearInterval(cbInterval); clearTimeout(cbTimer);
    cbInterval = setInterval(() => {
      left--;
      $('cb-timer').textContent = left + 's';
      if (left <= 3) $('cb-timer').style.color = 'var(--red)';
      if (left <= 0) clearInterval(cbInterval);
    }, 1000);
    cbTimer = setTimeout(cbTimeout, CB_BUDGET * 1000);
  }

  function submitCall() {
    clearTimeout(cbTimer); clearInterval(cbInterval);
    const val = $('cb-input').value.trim();
    const r = RecceMode.submitCallback(val);
    if (r.error) return;
    RecceMode.track('recce_callback_submitted', { ok: r.ok, sim: Math.round(r.sim * 100) / 100, timed_out: false });
    $('cb-fb').innerHTML = r.ok
      ? `<span style="color:var(--green)">OK called — carried ${(r.sim * 100) | 0}% of the information</span>`
      : `<span style="color:var(--red)">X the call didn't carry the corner</span> <span style="color:var(--text3)">canon was: ${escapeHtml(r.result.expected)}</span>`;
    $('cb-input').disabled = true;
    setTimeout(showCallbackNote, 950);
  }

  function cbTimeout() {
    RecceMode.timeoutCallback();
    RecceMode.track('recce_callback_submitted', { ok: false, sim: 0, timed_out: true });
    $('cb-fb').innerHTML = `<span style="color:var(--red)">⏱ too slow — the corner arrived before you called it</span>`;
    $('cb-input').disabled = true;
    setTimeout(showCallbackNote, 950);
  }

  // ------------------------------------------------------------------
  // Phase: summary
  // ------------------------------------------------------------------
  function renderSummary() {
    const sum = RecceMode.summary();
    if (!sum) { $('recce-summary-stats').textContent = 'No data.'; return; }
    RecceMode.track('recce_complete', { stage: sum.stageName, total: sum.total, called: sum.called });
    // Career XP bridge (defined in rally_systems.js): recce performance now
    // feeds progression instead of being a mode the career ignores.
    let xp = null;
    if (typeof awardRecceXP === 'function') { try { xp = awardRecceXP(sum); } catch (e) {} }
    $('recce-summary-stats').innerHTML = `
      <div style="font-size:15px;color:var(--gold)">${sum.called} / ${sum.total} of YOUR notes called back correctly</div>
      <div style="font-size:12px;color:var(--text2)">average information carried: ${(sum.avgSim * 100) | 0}% · blanks left in recce: ${sum.blankScribbles}${xp !== null ? ` · <span style="color:var(--gold)">+${xp} career XP</span>` : ''}</div>`;
    $('recce-summary-table').innerHTML = sum.perNote.map((n, i) => `
      <div style="background:var(--surf2);border:1px solid var(--brd2);padding:8px 10px;border-radius:4px;font-size:12px">
        <div><b style="color:${n.ok ? 'var(--green)' : 'var(--red)'}">${n.ok ? "OK" : "X"}</b>
          <span style="color:var(--text3)">you scribbled:</span>
          <b style="font-family:'IBM Plex Mono',monospace">${escapeHtml(n.scribble || '(blank)')}</b></div>
        <div style="margin-top:2px">
          <span style="color:var(--text3)">you called:</span> ${escapeHtml(n.call || '(nothing)')}
          <span style="color:var(--text3)">· the road said:</span> ${escapeHtml(n.expected)}</div>
      </div>`).join('');
  }

  // ------------------------------------------------------------------
  // Global entry points (menu wiring + phase navigation)
  // ------------------------------------------------------------------
  window.openRecce = function() {
    show('recce');
    showPhase('recce-pick');
    renderPick();
  };
  window.recceStartStage = startReccePass;
  window.recceResume = function() {
    const r = RecceMode.resume();
    if (r.error) { alert('No saved recce found'); return; }
    const phase = r.phase;
    if (phase === 'recce') { recceIdx = 0; showPhase('recce-recce'); showRecceNote(); }
    else if (phase === 'lint') { const rr = RecceMode.finishRecce(); renderLint(rr.lint); showPhase('recce-lint'); }
    else if (phase === 'callback') { showPhase('recce-callback'); showCallbackNote(); }
    else if (phase === 'complete') { renderSummary(); showPhase('recce-summary'); }
  };
  window.recceFinishRecce = finishReccePass;
  window.recceBackToRecce = backToRecce;
  window.recceStartCallback = startCallback;
  window.recceAbortPass = function() {
    clearInterval(pickInterval); clearTimeout(pickTimer);
    clearInterval(cbInterval); clearTimeout(cbTimer);
    RecceMode.abandon();
    window.openRecce();
  };

  // Input wiring (delegated, survives re-renders)
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'recce-scribble') onScribbleInput();
  });
  document.addEventListener('keydown', e => {
    if (e.target && e.target.id === 'cb-input' && e.key === 'Enter') {
      e.preventDefault();
      if (!$('cb-input').disabled) submitCall();
    }
  });

  return { openRecce, startReccePass, finishReccePass, startCallback, renderSummary };
})();

window.RecceUI = RecceUI;
