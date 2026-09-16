// ============================================================================
// pacenote-conventions.js — Real, named pacenote conventions
// ============================================================================
// What this file is:
//   A data-driven registry of REAL pacenote conventions (Jemba 1/2/3,
//   Gravel Notes numerics, the game's own WRC-style system) with:
//     • a token vocabulary (corner grades, modifiers, distance markers)
//     • a written-shorthand form for each token
//     • a long-form English phrase for each token
//     • a translate() that parses ANY registered convention into English
//     • a writer() that renders a semantic note INTO a convention
//     • team/driver PREFERENCES layered on top (numbering direction,
//       distance units, terminology packs) — the thing real co-driver
//       teams actually customise.
//
// What this file is NOT:
//   It does not replace PacenoteSystem (that stays the game's canonical
//   translator for the existing stage data). Conventions.translate is a
//   SUPERSET parser: it understands everything PacenoteSystem.translate
//   understands, plus the numeric conventions. Existing stages keep working
//   untouched.
//
// Design rules:
//   • Every convention declares `numbering: 'severity1isTightest' | 'number1isTightest'`
//     so the same semantic corner renders differently per convention.
//   • Preferences NEVER change scoring correctness — only what the player
//     sees/writes. Scoring happens on semantic tokens, not on spelling.
// ============================================================================

const PacenoteConventions = (() => {

  // ------------------------------------------------------------------
  // Token vocabulary (semantic, convention-independent)
  // ------------------------------------------------------------------
  // dir:  'L' | 'R'          grade: 1..6 (1 = tightest/hairpin, 6 = fastest)
  // mod:  modifier keys as listed in MODIFIERS below

  const MODIFIERS = {
    tightens:   { en: 'tightens' },
    opens:      { en: 'opens' },
    square:     { en: 'square corner' },
    hairpin:    { en: 'hairpin' },
    crest:      { en: 'over crest' },
    jump:       { en: 'jump' },
    dontcut:    { en: "don't cut" },
    caution:    { en: 'caution' },
    maxCaution: { en: 'max caution' },
    long:       { en: 'long' },
    narrow:     { en: 'narrows' },
    flat:       { en: 'flat out' },
    into:       { en: 'into' },
    bump:       { en: 'bumps' },
    water:      { en: 'water splash' },
    gravel:     { en: 'gravel patch' },
    ice:        { en: 'ice patch' },
    bridge:     { en: 'over bridge' },
    junction:   { en: 'junction' },
    stop:       { en: 'full stop' },
  };

  // ------------------------------------------------------------------
  // Conventions
  // ------------------------------------------------------------------

  const CONVENTIONS = {

    // The game's existing notation (PacenoteSystem vocabulary).
    // Kept registered here so preference rendering works everywhere.
    rpa: {
      label: "RPA Standard (game default)",
      description: "L/R + 1–6 severity (1 = hairpin). ! / !! cautions. INTO, CREST, DONTCUT.",
      numbering: 'standard',   // written digit = semantic grade (1 = tightest)
      distanceStyle: 'bare-metres',     // "150" before/after corner
      tokens: {
        corner:  (dir, grade) => dir + grade,                     // L3
        caution: '!', maxCaution: '!!',
        flat: 'FLAT', into: 'INTO',
        crest: 'CREST', jump: 'JUMP', dontcut: 'DONTCUT',
        tightens: 'TIGHTENS', opens: 'OPENS', square: 'SQUARE',
        hairpin: 'HAIRPIN', long: 'LONG', narrow: 'NARROW',
        bump: 'BUMP', water: 'WATER', gravel: 'GRAVEL', ice: 'ICE',
        bridge: 'BRIDGE', junction: 'JUNCTION', stop: 'STOP',
      },
    },

    // Jemba 1 — classic numeric system, 1 = tightest (hairpin), 6 = flat/kink.
    // Shorthand as written in real Jemba books: "R2( L3" etc.
    jemba1: {
      label: 'Jemba 1 (numeric)',
      description: 'Numeric grades: 1 = hairpin … 6 = flat kink. Brake point before the corner. "R2( L3" style.',
      numbering: 'standard',   // Jemba is also 1 = tightest
      distanceStyle: 'brake-point',     // number BEFORE corner = distance to brake
      tokens: {
        corner:  (dir, grade) => dir + grade,
        caution: '!', maxCaution: '!!',
        // In Jemba, tighteners/opener are written as + / - applied to the grade,
        // but for legibility we use words; brake-point uses ( ) per Jemba style.
        tightens: '+', opens: '-', square: 'sq', hairpin: 'AC',
        flat: '6', into: '>', crest: '^', jump: '^^', dontcut: 'dc',
        long: 'lg', narrow: 'nr', bump: 'bo', water: 'w', gravel: 'g', ice: 'i',
        bridge: 'b', junction: 'j', stop: 'st',
        caution: '!', maxCaution: '!!',
      },
    },

    // Jemba 2/3 variant — same numbering, distance AFTER corner as "metres of
    // straight", loose shorthand favoured by more WRC2/privateer teams.
    jemba2: {
      label: 'Jemba 2 (numeric, loose)',
      description: 'Like Jemba 1 but distances written after the corner; commonly used shorthand.',
      numbering: 'standard',
      distanceStyle: 'after-metres',
      tokens: {
        corner:  (dir, grade) => dir + grade,
        caution: '!', maxCaution: '!!',
        tightens: 't+', opens: 't-', square: 'sq', hairpin: 'AC',
        flat: '6', into: 'into', crest: 'cr', jump: 'jp', dontcut: 'dc',
        long: 'long', narrow: 'nar', bump: 'bmp', water: 'wat', gravel: 'grv',
        ice: 'ice', bridge: 'brg', junction: 'jct', stop: 'st',
      },
    },

    // Gravel-notes style "numerics" as popularised by several UK/EU crews:
    // purely numeric corners written as a two-digit pair (direction implied
    // by 1st digit), famously compact: "34 into 21 max".
    gravelNumeric: {
      label: 'Gravel Numerics (34/21 style)',
      description: 'First digit = direction (3=left, 4=right on this book), second = grade. Ultra compact.',
      numbering: 'standard',
      distanceStyle: 'after-metres',
      // direction digit mapping is part of preferences (see PREFERENCES)
      tokens: {
        corner: null, // handled specially in writer/reader via dirDigits
        caution: 'max', maxCaution: 'max max',
        flat: '6', into: 'into', crest: 'cr', jump: 'jp', dontcut: 'dc',
        long: 'lg', narrow: 'nr', bump: 'bmp', water: 'wt', gravel: 'gr',
        ice: 'ic', bridge: 'br', junction: 'jn', stop: 'st',
        tightens: 'tg', opens: 'op', square: 'sq', hairpin: 'hp',
      },
    },
  };

  // ------------------------------------------------------------------
  // Team / driver preferences (the "rigid notation" fix)
  // ------------------------------------------------------------------

  const PREFERENCE_KEYS = {
    numbering: 'Which end of the scale is tightest (flips rendering, never scoring)',
    distanceUnits: 'Metres vs yards for distance calls',
    distancePosition: 'Where distance markers go relative to the corner',
    terminology: 'Named terminology pack (word choices for the same meaning)',
  };

  const TERMINOLOGY_PACKS = {
    standard: {
      label: 'Standard WRC English',
      map: {}, // identity
    },
    uk: {
      label: 'UK championship flavour',
      map: {
        'flat out': 'flat',
        'max caution': 'care max',
        'over crest': 'summit',
        "don't cut": 'keep in',
      },
    },
    fi: {
      label: 'Finnish crew flavour',
      map: {
        'max caution': 'care full',
        'over crest': 'nousee', // literal: rises
        "don't cut": 'ei leikkaa',
      },
    },
  };

  const DEFAULT_PREFERENCES = {
    convention: 'rpa',
    numbering: 'standard',              // 'standard' = 1 is tightest (game + Jemba canon)
                                        // 'inverted' = 6 is tightest (some teams count the other way)
    distanceUnits: 'metres',            // or 'yards'
    distancePosition: 'before',         // or 'after'
    terminology: 'standard',
    // gravel-numerics digit assignment (which first-digit means left)
    dirDigitLeft: '3',                  // => right is '4'; classic book choice
  };

  let prefs = { ...DEFAULT_PREFERENCES };
  try {
    const saved = localStorage.getItem('rpa_note_prefs');
    if (saved) prefs = { ...prefs, ...JSON.parse(saved) };
  } catch (e) { /* private mode etc. */ }

  function savePrefs() {
    try { localStorage.setItem('rpa_note_prefs', JSON.stringify(prefs)); } catch (e) {}
  }

  function setPreference(key, value) {
    if (!(key in DEFAULT_PREFERENCES)) return false;
    prefs[key] = value;
    savePrefs();
    return true;
  }

  function getPreferences() { return { ...prefs }; }

  function setConvention(id) {
    if (!CONVENTIONS[id]) return false;
    prefs.convention = id;
    // Conventions carry a natural numbering; adopting a convention adopts
    // its numbering unless the user has explicitly flipped it afterwards.
    prefs.numbering = CONVENTIONS[id].numbering;
    savePrefs();
    return true;
  }

  // ------------------------------------------------------------------
  // Grade conversion between semantic grade (FIXED internally: 1 = tightest
  // hairpin … 6 = fastest — matches the game's canonical data) and what the
  // player writes/reads. The 'numbering' preference is a USER flip on top:
  //   standard  -> written digit == semantic grade  (L1 = hairpin)
  //   inverted  -> written digit == 7 - grade       (L6 = hairpin)
  // The flip changes DISPLAY/WRITING only; parse() inverts it symmetrically,
  // so scoring meaning is preserved in both directions.
  // ------------------------------------------------------------------

  function gradeToWritten(grade) {
    return prefs.numbering === 'inverted' ? 7 - grade : grade;
  }

  function writtenToGrade(w) {
    const n = parseInt(w, 10);
    if (isNaN(n) || n < 1 || n > 6) return null;
    return prefs.numbering === 'inverted' ? 7 - n : n;
  }

  // ------------------------------------------------------------------
  // WRITER: semantic note -> convention shorthand
  // ------------------------------------------------------------------

  // note = { dir:'L'|'R', grade:1..6, mods:[...], dist: {value, position} }
  function writeCorner(note, convId = prefs.convention) {
    const conv = CONVENTIONS[convId] || CONVENTIONS.rpa;
    const parts = [];

    if (convId === 'gravelNumeric') {
      const dirDigit = note.dir === 'L' ? prefs.dirDigitLeft : (prefs.dirDigitLeft === '3' ? '4' : '3');
      parts.push(dirDigit + gradeToWritten(note.grade, convId));
    } else {
      parts.push(conv.tokens.corner(note.dir, gradeToWritten(note.grade, convId)));
    }

    // caution BEFORE other mods reads most naturally
    if (note.mods.includes('maxCaution')) parts.push(conv.tokens.maxCaution);
    else if (note.mods.includes('caution')) parts.push(conv.tokens.caution);

    for (const m of note.mods) {
      if (m === 'caution' || m === 'maxCaution') continue;
      const tok = conv.tokens[m];
      if (tok) parts.push(tok);
    }

    // distance
    const distTok = note.dist ? String(Math.round(note.dist.value)) : null;
    if (distTok) {
      const units = prefs.distanceUnits === 'yards'
        ? ' ' + Math.round(note.dist.value * 1.09361) + 'y'
        : '';
      if ((note.dist.position || prefs.distancePosition) === 'before') {
        const tok = units ? distTok + units : distTok;
        // Jemba 1 brake-point books write the braking distance followed by
        // the classic "(" corner-entry bracket: "100 ( R3".
        parts.unshift(convId === 'jemba1' ? tok + ' (' : tok);
      } else {
        parts.push(units ? distTok + units : distTok);
      }
    }

    return parts.join(' ');
  }

  // ------------------------------------------------------------------
  // READER/PARSER: raw note string -> semantic tokens
  // Superset of PacenoteSystem.translate; understands all registered
  // conventions' shorthand plus the full English vocabulary.
  // ------------------------------------------------------------------

  const GRADE_WORDS = {
    '1': 'hairpin', '2': 'very tight', '3': 'tight', '4': 'medium',
    '5': 'open', '6': 'fast sweep',
  };

  // shorthand tokens shared across numeric conventions -> semantic mod
  const SHORTHAND_MODS = {
    '+': 'tightens', '-': 'opens', 't+': 'tightens', 't-': 'opens',
    'sq': 'square', 'AC': 'hairpin', 'dc': 'dontcut', '^': 'crest',
    '^^': 'jump', 'cr': 'crest', 'jp': 'jump', 'lg': 'long', 'nr': 'narrow',
    'bmp': 'bump', 'bo': 'bump', 'w': 'water', 'wt': 'water', 'g': 'gravel',
    'gr': 'gravel', 'i': 'ice', 'ic': 'ice', 'b': 'bridge', 'br': 'bridge',
    'j': 'junction', 'jn': 'junction', 'st': 'stop', 'tg': 'tightens',
    'op': 'opens',
  };

  // Full-word mods (RPA vocabulary + English)
  const WORD_MODS = {
    TIGHTENS: 'tightens', OPENS: 'opens', SQUARE: 'square',
    HAIRPIN: 'hairpin', CREST: 'crest', JUMP: 'jump', DONTCUT: 'dontcut',
    LONG: 'long', NARROW: 'narrow', BUMP: 'bump', BUMPS: 'bump',
    WATER: 'water', GRAVEL: 'gravel', ICE: 'ice', BRIDGE: 'bridge',
    JUNCTION: 'junction', STOP: 'stop',
  };

  function parse(raw) {
    const tokens = String(raw).trim().toUpperCase().split(/\s+/);
    const semantic = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // corner with optional trailing cautions: L3, L3!, R4!!
      let m = t.match(/^([LR])([1-6])(!!|!)?$/);
      if (m) {
        semantic.push({
          type: 'corner',
          dir: m[1] === 'L' ? 'L' : 'R',
          grade: writtenToGrade(m[2]) ?? parseInt(m[2], 10),
          cautions: m[3] === '!!' ? 2 : m[3] === '!' ? 1 : 0,
        });
        continue;
      }

      // gravel numeric: 34 / 21 …
      m = t.match(/^([34])([1-6])$/);
      if (m) {
        const dir = m[1] === prefs.dirDigitLeft ? 'L' : 'R';
        semantic.push({ type: 'corner', dir, grade: writtenToGrade(m[2]), cautions: 0 });
        continue;
      }

      // bare distance
      if (/^\d{2,4}$/.test(t)) { semantic.push({ type: 'distance', value: parseInt(t, 10) }); continue; }

      // cautions standalone
      if (t === '!!' || t === 'CC' || t === 'MAX MAX') { semantic.push({ type: 'mod', mod: 'maxCaution' }); continue; }
      if (t === '!' || t === 'C' || t === 'MAX') { semantic.push({ type: 'mod', mod: 'caution' }); continue; }

      // into / flat
      if (t === 'INTO' || t === '>') { semantic.push({ type: 'mod', mod: 'into' }); continue; }
      if (t === 'FLAT' || t === 'FLT') { semantic.push({ type: 'mod', mod: 'flat' }); continue; }

      // shorthand mods
      if (SHORTHAND_MODS[t]) { semantic.push({ type: 'mod', mod: SHORTHAND_MODS[t] }); continue; }

      // word mods
      if (WORD_MODS[t]) { semantic.push({ type: 'mod', mod: WORD_MODS[t] }); continue; }

      // unknown — keep as-is so nothing is silently dropped
      semantic.push({ type: 'raw', value: t.toLowerCase() });
    }

    return semantic;
  }

  // semantic -> long English (compatible in spirit with PacenoteSystem.translate)
  function toEnglish(semantic) {
    const out = [];
    for (const s of semantic) {
      if (s.type === 'corner') {
        let phrase = (s.dir === 'L' ? 'left ' : 'right ') + (GRADE_WORDS[s.grade] || ('grade ' + s.grade));
        if (s.cautions === 1) phrase += ', caution';
        if (s.cautions === 2) phrase += ', max caution';
        out.push(phrase);
      } else if (s.type === 'distance') {
        out.push(s.value + ' metres');
      } else if (s.type === 'mod') {
        out.push(MODIFIERS[s.mod].en);
      } else {
        out.push(s.value);
      }
    }
    return out.join(', ');
  }

  // convenience: raw -> English
  function translate(raw) {
    return toEnglish(parse(raw));
  }

  // ------------------------------------------------------------------
  // Preference-aware rendering for UI (display only; scoring unchanged)
  // ------------------------------------------------------------------

  function renderForDisplay(raw) {
    // Parse, then re-render in the ACTIVE convention shorthand.
    try {
      const semantic = parse(raw);
      const conv = CONVENTIONS[prefs.convention] || CONVENTIONS.rpa;
      const out = [];
      let pendingDist = null;

      for (const s of semantic) {
        if (s.type === 'distance') { pendingDist = s; continue; }
        if (s.type === 'corner') {
          const mods = [];
          // mods collected between corners get attached here (approximation
          // for display only)
          if (pendingDist) {
            out.push(writeCorner({ dir: s.dir, grade: s.grade, mods, dist: pendingDist }, prefs.convention));
            pendingDist = null;
          } else {
            out.push(writeCorner({ dir: s.dir, grade: s.grade, mods }, prefs.convention));
          }
          continue;
        }
        if (s.type === 'mod') {
          const tok = conv.tokens[s.mod];
          out.push(typeof tok === 'string' ? tok : s.mod);
          continue;
        }
        out.push(s.value);
      }
      if (pendingDist) out.push(String(pendingDist.value));
      return out.join(' ');
    } catch (e) {
      return raw; // never break the game on display path
    }
  }

  // ------------------------------------------------------------------
  // Preferences UI — drop-in panel for the Note Editor screen.
  // Renders selects for every preference; saves instantly; never throws.
  // ------------------------------------------------------------------
  function attachPreferencesUI(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const opts = (pairs, current) => pairs.map(([v, label]) =>
      `<option value="${v}" ${v === current ? 'selected' : ''}>${label}</option>`).join('');

    el.innerHTML = `
      <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:1px;color:var(--text2);margin-bottom:.5rem">Driver Style Preferences</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
        <label>Notation convention
          <select id="npc-conv" style="width:100%;background:var(--surf2);border:1px solid var(--brd2);color:var(--text);padding:5px">
            ${opts(Object.entries(CONVENTIONS).map(([k, c]) => [k, c.label]), prefs.convention)}
          </select></label>
        <label>Numbering direction
          <select id="npc-num" style="width:100%;background:var(--surf2);border:1px solid var(--brd2);color:var(--text);padding:5px">
            ${opts([['standard', '1 = tightest (game & Jemba canon)'], ['inverted', '6 = tightest (inverted books)']], prefs.numbering)}
          </select></label>
        <label>Distance units
          <select id="npc-units" style="width:100%;background:var(--surf2);border:1px solid var(--brd2);color:var(--text);padding:5px">
            ${opts([['metres', 'Metres'], ['yards', 'Yards']], prefs.distanceUnits)}
          </select></label>
        <label>Distance position
          <select id="npc-pos" style="width:100%;background:var(--surf2);border:1px solid var(--brd2);color:var(--text);padding:5px">
            ${opts([['before', 'Before corner'], ['after', 'After corner']], prefs.distancePosition)}
          </select></label>
        <label>Terminology pack
          <select id="npc-term" style="width:100%;background:var(--surf2);border:1px solid var(--brd2);color:var(--text);padding:5px">
            ${opts(Object.entries(TERMINOLOGY_PACKS).map(([k, t]) => [k, t.label]), prefs.terminology)}
          </select></label>
        <div style="color:var(--text3);font-size:10px">Display/writing only — what counts as a correct call never changes.</div>
      </div>`;

    const bind = (id, fn) => {
      const s = document.getElementById(id);
      if (s) s.addEventListener('change', () => { fn(s.value); attachPreferencesUI(containerId); });
    };
    bind('npc-conv', v => setConvention(v));
    bind('npc-num', v => setPreference('numbering', v));
    bind('npc-units', v => setPreference('distanceUnits', v));
    bind('npc-pos', v => setPreference('distancePosition', v));
    bind('npc-term', v => setPreference('terminology', v));
  }

  // ------------------------------------------------------------------
  // Registry API
  // ------------------------------------------------------------------

  return {
    CONVENTIONS,
    TERMINOLOGY_PACKS,
    PREFERENCE_KEYS,
    getPreferences,
    setPreference,
    setConvention,
    parse,
    toEnglish,
    translate,
    writeCorner,
    gradeToWritten,
    writtenToGrade,
    renderForDisplay,
    attachPreferencesUI,
    GRADE_WORDS,
  };
})();

// Expose globally (game uses plain script tags, no bundler)
window.PacenoteConventions = PacenoteConventions;
