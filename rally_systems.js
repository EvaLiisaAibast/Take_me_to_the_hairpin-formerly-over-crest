/* ═══════════════════════════════════════════════════════════════════════════
   RALLY PACENOTE ACADEMY — SYSTEMS ENGINE v3.0
   Covers: Analytics, Coaching (statistical, on-device), Adaptive Difficulty, Replay, Pacenote Editor,
           Extended Tutorial, Mode Toggle, Export, Audio System, Accessibility,
           Training Programs, Damage Physics, Pro Layer
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════════════
// 0. GLOBAL MODE STATE
// ═══════════════════════════════════════════════════════════════

const MODE = {
  pro: false, // toggled by user — Training Mode vs Game Mode
  get isPro() { return this.pro; },
  toggle() {
    this.pro = !this.pro;
    try { localStorage.setItem('rpa_pro_mode', this.pro ? '1' : '0'); } catch(e){}
    document.body.classList.toggle('pro-mode', this.pro);
    renderModeToggle();
    if (typeof renderAnalyticsOverlay === 'function') renderAnalyticsOverlay();
  },
  load() {
    try { this.pro = localStorage.getItem('rpa_pro_mode') === '1'; } catch(e){}
    document.body.classList.toggle('pro-mode', this.pro);
  }
};

// ═══════════════════════════════════════════════════════════════
// 1. ANALYTICS ENGINE — #024
// ═══════════════════════════════════════════════════════════════

const Analytics = {
  sessions: [],          // All completed stages
  currentSession: null,  // Live session being recorded

  startSession(era, stage, car, difficulty) {
    this.currentSession = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      era, stage, car, difficulty,
      notes: [],           // Per-note records
      totalNotes: 0,
      correct: 0,
      reactionTimes: [],   // ms from note display to first keypress
      inputStartTimes: {}, // noteIdx -> note display timestamp
      mistakes: [],        // { noteIdx, raw, ans, typed, category, timeLost }
      crashes: 0,
      dnf: false,
      stageTime: null,
      splitTimes: [],
      startTime: Date.now()
    };
  },

  noteDisplayed(noteIdx) {
    if (!this.currentSession) return;
    this.currentSession.inputStartTimes[noteIdx] = performance.now();
  },

  recordFirstKeypress(noteIdx) {
    if (!this.currentSession) return;
    const t0 = this.currentSession.inputStartTimes[noteIdx];
    if (t0) {
      const rt = Math.round(performance.now() - t0);
      this.currentSession.reactionTimes.push({ noteIdx, ms: rt });
    }
  },

  recordNote(noteIdx, raw, ans, typed, ok, score, timeLost) {
    if (!this.currentSession) return;
    const t0 = this.currentSession.inputStartTimes[noteIdx] || performance.now();
    const responseTime = Math.round(performance.now() - t0);

    const record = {
      noteIdx, raw, ans, typed, ok, score,
      responseTime,    // ms total response time
      timeLost: ok ? 0 : timeLost || 0,
      category: this._categorise(raw, typed, ok)
    };

    this.currentSession.notes.push(record);
    this.currentSession.totalNotes++;
    if (ok) this.currentSession.correct++;
    else this.currentSession.mistakes.push(record);
  },

  _categorise(raw, typed, ok) {
    if (ok) return 'correct';
    if (!typed || typed.trim() === '') return 'timeout';
    const r = raw.toUpperCase();
    const t = (typed || '').toLowerCase();
    if (r.includes('!!') && !t.includes('max')) return 'missed_double_caution';
    if (r.includes('!') && !t.includes('caut')) return 'missed_caution';
    if (r.includes('DONTCUT') && !t.includes('cut')) return 'missed_dontcut';
    if (r.includes('INTO') && !t.includes('into')) return 'missed_link';
    if (r.includes('FLAT') && !t.includes('flat')) return 'missed_flat';
    if (r.includes('CREST') && !t.includes('crest')) return 'missed_crest';
    if (r.includes('JUMP') && !t.includes('jump')) return 'missed_jump';
    if (r.includes('JUNCTION') && !t.includes('junct')) return 'missed_junction';

    // Enhanced sequence detection: check if corners are present but in wrong order
    // This leverages the new order-aware matcher's ability to detect reversals
    const cornerPattern = /[LR]\d/g;
    const corners = r.match(cornerPattern) || [];
    if (corners.length > 1) {
      // Check if typed has multiple corners but in different order than raw
      const typedCorners = t.match(/[lr]\d/g) || [];
      if (typedCorners.length > 1) {
        // Extract corner sequences from both
        const rawSequence = corners.map(c => c.toLowerCase());
        const typedSequence = typedCorners.map(c => c.toLowerCase());
        // Check if they're different (reversed or scrambled)
        if (JSON.stringify(rawSequence) !== JSON.stringify(typedSequence)) {
          return 'missed_sequence';
        }
      }
      // If typed has fewer corners than raw, it's a missed sequence
      if (typedCorners.length < corners.length) {
        return 'missed_sequence';
      }
    }
    return 'wrong_translation';
  },

  recordCrash() {
    if (this.currentSession) this.currentSession.crashes++;
  },

  recordSplit(sectorIdx, timeS) {
    if (this.currentSession) this.currentSession.splitTimes.push({ sector: sectorIdx, time: timeS });
  },

  endSession(dnf, stageTimeMs) {
    if (!this.currentSession) return null;
    const s = this.currentSession;
    s.dnf = dnf;
    s.stageTime = stageTimeMs;
    s.duration = Date.now() - s.startTime;
    s.accuracy = s.totalNotes > 0 ? Math.round((s.correct / s.totalNotes) * 100) : 0;
    s.avgReactionTime = s.reactionTimes.length
      ? Math.round(s.reactionTimes.reduce((a,b)=>a+b.ms,0) / s.reactionTimes.length)
      : 0;
    s.consistency = this._consistencyScore(s.reactionTimes.map(r=>r.ms));

    // Category breakdown
    s.mistakeBreakdown = {};
    s.mistakes.forEach(m => {
      s.mistakeBreakdown[m.category] = (s.mistakeBreakdown[m.category] || 0) + 1;
    });

    this.sessions.push(s);
    this._persist();
    const session = s;
    this.currentSession = null;
    return session;
  },

  _consistencyScore(times) {
    if (times.length < 2) return 100;
    const mean = times.reduce((a,b)=>a+b,0) / times.length;
    const variance = times.reduce((a,b)=>a+(b-mean)**2,0) / times.length;
    const stdDev = Math.sqrt(variance);
    // Lower stdDev relative to mean = more consistent
    const cv = mean > 0 ? (stdDev / mean) : 0;
    return Math.max(0, Math.round(100 - cv * 100));
  },

  _persist() {
    try {
      // Keep last 50 sessions
      const toSave = this.sessions.slice(-50);
      localStorage.setItem('rpa_analytics', JSON.stringify(toSave));
    } catch(e) { /* storage full — silently skip */ }
  },

  load() {
    try {
      const saved = localStorage.getItem('rpa_analytics');
      if (saved) this.sessions = JSON.parse(saved);
    } catch(e) { this.sessions = []; }
  },

  // Aggregated stats across all sessions
  getLifetimeStats() {
    const all = this.sessions;
    if (!all.length) return null;
    const totalNotes = all.reduce((a,s)=>a+s.totalNotes,0);
    const totalCorrect = all.reduce((a,s)=>a+s.correct,0);
    const allRT = all.flatMap(s=>s.reactionTimes.map(r=>r.ms));
    const allMistakes = all.flatMap(s=>s.mistakes);
    const breakdown = {};
    allMistakes.forEach(m => {
      breakdown[m.category] = (breakdown[m.category] || 0) + 1;
    });
    return {
      sessions: all.length,
      totalNotes,
      totalCorrect,
      lifetime_accuracy: totalNotes ? Math.round(totalCorrect/totalNotes*100) : 0,
      avg_reaction_ms: allRT.length ? Math.round(allRT.reduce((a,b)=>a+b,0)/allRT.length) : 0,
      best_reaction_ms: allRT.length ? Math.min(...allRT) : 0,
      worst_reaction_ms: allRT.length ? Math.max(...allRT) : 0,
      consistency: this._consistencyScore(allRT),
      mistakeBreakdown: breakdown,
      topMistake: Object.entries(breakdown).sort((a,b)=>b[1]-a[1])[0]?.[0] || null,
      dnfCount: all.filter(s=>s.dnf).length,
      bestAccuracy: Math.max(...all.map(s=>s.accuracy)),
      recentTrend: this._trend(all.slice(-5).map(s=>s.accuracy))
    };
  },

  _trend(vals) {
    if (vals.length < 2) return 'neutral';
    const first = vals.slice(0, Math.ceil(vals.length/2));
    const last = vals.slice(Math.floor(vals.length/2));
    const avgFirst = first.reduce((a,b)=>a+b,0)/first.length;
    const avgLast = last.reduce((a,b)=>a+b,0)/last.length;
    if (avgLast > avgFirst + 3) return 'improving';
    if (avgLast < avgFirst - 3) return 'declining';
    return 'stable';
  },

  exportJSON() {
    return JSON.stringify({ exported: new Date().toISOString(), sessions: this.sessions }, null, 2);
  },

  exportCSV() {
    const headers = ['session_id','timestamp','era','stage','car','difficulty','accuracy','avg_reaction_ms','consistency','correct','total','crashes','dnf','stage_time_ms','top_mistake'];
    const rows = this.sessions.map(s => [
      s.id, s.timestamp, s.era, s.stage, s.car, s.difficulty,
      s.accuracy, s.avgReactionTime, s.consistency,
      s.correct, s.totalNotes, s.crashes, s.dnf ? 1 : 0,
      s.stageTime || '', s.mistakeBreakdown ? Object.entries(s.mistakeBreakdown).sort((a,b)=>b[1]-a[1])[0]?.[0] || '' : ''
    ].map(v => `"${v}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  }
};

// ═══════════════════════════════════════════════════════════════
// 2. COACHING ENGINE (pattern statistics — no AI) — #025
// ═══════════════════════════════════════════════════════════════

const Coach = {
  // Pattern detection thresholds
  THRESHOLDS: {
    consistent_mistake: 3,    // same category 3+ times = pattern
    late_reaction: 7000,      // >7s avg reaction = "reacting late"
    fast_reaction: 3000,      // <3s avg = "reading ahead well"
    low_consistency: 60,      // CV consistency below 60 = erratic
    crash_rate: 0.3,          // >30% of stages with crash = systemic
  },

  TIPS: {
    missed_caution: {
      title: "You're missing caution marks",
      tips: [
        "The ! symbol always comes after the corner severity — e.g. 'R3!' not 'R3'.",
        "Scan the whole note before starting to type. Cautions are often at the end.",
        "In real co-driving, the ! is said with emphasis — try reading the note aloud."
      ]
    },
    missed_double_caution: {
      title: "Double caution (!!): you're not calling max caution",
      tips: [
        "!! is not the same as !. Type 'maximum caution' or 'max caution' — not just 'caution'.",
        "Double exclamation means something was found in recce that scared the crew. Treat it with more weight.",
        "If you see !!, slow down your reading — make sure both the corner AND the caution are in your answer."
      ]
    },
    missed_link: {
      title: "You're dropping the INTO connection",
      tips: [
        "INTO means the second corner follows immediately with no gap. The driver needs both.",
        "Write the sequence: 'left three into right four' — don't write just one corner.",
        "When you see INTO, always read the note to the end before typing."
      ]
    },
    missed_flat: {
      title: "You're missing FLAT calls",
      tips: [
        "FLAT means full throttle — no braking at all. It's one of the most important calls.",
        "Look for FLAT near the end of complex notes — it modifies the whole corner.",
        "In your answer, include 'flat out' or 'flat' to register the call."
      ]
    },
    missed_crest: {
      title: "Crest calls are being skipped",
      tips: [
        "CREST means the corner is over a blind rise — the driver can't see the apex until they're committed.",
        "Say 'over crest' before the corner: 'over crest right four'.",
        "Crests on fast notes (R5 CREST, R6 CREST) are particularly dangerous if missed."
      ]
    },
    missed_sequence: {
      title: "Multi-corner sequences — you're only calling one",
      tips: [
        "When a note has two corners, both need translating: 'left three, right four'.",
        "Read the full note before starting to type. Count the corners first.",
        "Linked sequences (L3 INTO R4) and spaced ones (L3 100 R4) both need both corners."
      ]
    },
    timeout: {
      title: "You're running out of time",
      tips: [
        "Read the note immediately when it appears — don't wait for your brain to process it fully.",
        "Type the direction first (left/right), then the number. You can finish the rest mid-type.",
        "On Easy difficulty there are 12 seconds — that's plenty. On Hard, you need 2-3 seconds per segment."
      ]
    },
    wrong_translation: {
      title: "Translation accuracy needs work",
      tips: [
        "Check the vocabulary panel on the right — it lists what each abbreviation means.",
        "Focus on the most common pattern: [direction][number] + any modifiers.",
        "L = left, R = right. 1 = hairpin, 6 = fast sweep. Everything else adds detail."
      ]
    }
  },

  // In-character tips when driver trust is low (StorySystem integration)
  CHARACTER_TIPS: {
    mikko: {
      missed_caution: {
        title: "Mikko doesn't hear the caution",
        tips: [
          "Mikko: 'I can't drive blind. If you see !, say it like you mean it.'",
          "Mikko: 'Caution marks aren't optional. That's how we stay on the road.'",
          "Mikko: 'Call it early, call it loud. I need to hear it before the corner.'"
        ]
      },
      missed_link: {
        title: "Mikko needs the full sequence",
        tips: [
          "Mikko: 'Don't give me half a note. INTO means both corners, now.'",
          "Mikko: 'If you stop at the first corner, I'm braking for the wrong one.'",
          "Mikko: 'Read it all the way through. I trust complete calls, not half measures.'"
        ]
      },
      timeout: {
        title: "Mikko is waiting on the call",
        tips: [
          "Mikko: 'I'm holding the line. What's the note?'",
          "Mikko: 'We don't have time to think. Read and call.'",
          "Mikko: 'If you're late, I'm already committed. Be faster.'"
        ]
      }
    },
    reko: {
      missed_caution: {
        title: "Reko expects the C notation",
        tips: [
          "Reko: 'That's a C, not an exclamation. WRC2 style, remember?'",
          "Reko: 'In my system, C means caution. Don't translate it to !.'",
          "Reko: 'I trained with the factory team. C is what I know.'"
        ]
      },
      missed_link: {
        title: "Reko uses > for INTO",
        tips: [
          "Reko: 'That's a greater-than sign. > means INTO in my book.'",
          "Reko: 'Don't write INTO. Use > like we practiced.'",
          "Reko: 'My notation is compact. >, not INTO. Learn it.'"
        ]
      }
    },
    elin: {
      missed_caution: {
        title: "Elin wants full words",
        tips: [
          "Elin: 'No shorthand. Say the full word — caution.'",
          "Elin: 'Road rally style — we speak in complete sentences.'",
          "Elin: 'I don't do abbreviations. Call it properly.'"
        ]
      },
      wrong_translation: {
        title: "Elin doesn't use numbers",
        tips: [
          "Elin: 'That's a Hairpin, not a 1. Say the word.'",
          "Elin: 'No digit codes. Use the full severity names.'",
          "Elin: 'I came up on road rallies. We speak English, not code.'"
        ]
      }
    }
  },

  analyse(session) {
    if (!session || !session.mistakes.length) return [];
    const tips = [];

    // Check for in-character tips based on driver trust (StorySystem integration)
    let useCharacterTips = false;
    let activeDriverId = null;
    if (typeof StorySystem !== 'undefined' && StorySystem.state) {
      const stats = StorySystem.state.stats;
      // Low driver trust triggers in-character dialogue instead of generic tips
      if (stats.driverTrust < 40) {
        useCharacterTips = true;
        // Get active driver profile
        activeDriverId = DriverProfileSystem.activeProfile;
      }
    }

    // Pattern detection
    const cats = session.mistakeBreakdown || {};
    const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]);

    // Top mistake pattern
    if (sorted[0] && sorted[0][1] >= 2) {
      const cat = sorted[0][0];
      let tip = this.TIPS[cat];
      // Use in-character tips if driver trust is low and character-specific tip exists
      if (useCharacterTips && activeDriverId && this.CHARACTER_TIPS[activeDriverId]?.[cat]) {
        tip = this.CHARACTER_TIPS[activeDriverId][cat];
      }
      if (tip) tips.push({ priority: 'high', category: cat, ...tip });
    }

    // Secondary pattern
    if (sorted[1] && sorted[1][1] >= 2) {
      const cat = sorted[1][0];
      let tip = this.TIPS[cat];
      // Use in-character tips if driver trust is low and character-specific tip exists
      if (useCharacterTips && activeDriverId && this.CHARACTER_TIPS[activeDriverId]?.[cat]) {
        tip = this.CHARACTER_TIPS[activeDriverId][cat];
      }
      if (tip) tips.push({ priority: 'medium', category: cat, ...tip });
    }

    // Reaction time analysis
    const avgRT = session.avgReactionTime;
    if (avgRT > this.THRESHOLDS.late_reaction) {
      tips.push({
        priority: 'high',
        category: 'slow_reaction',
        title: "You're consistently reacting late",
        tips: [
          `Your average reaction time is ${(avgRT/1000).toFixed(1)}s. Target is under 5s.`,
          "Start reading the note the moment it appears — don't wait for the timer to start dropping.",
          "On harder difficulties, the timer is 4-5 seconds. Train your eyes to go to the start of the note instantly."
        ]
      });
    }

    // Consistency
    if (session.consistency < this.THRESHOLDS.low_consistency) {
      tips.push({
        priority: 'medium',
        category: 'inconsistency',
        title: "Your timing is erratic",
        tips: [
          "Some notes you answer very fast, others very slow. Try to develop a consistent reading rhythm.",
          "If you're fast on simple notes but slow on complex ones, focus on multi-element notes specifically.",
          "Consistency is what separates good co-drivers from great ones — the driver needs to trust the pace."
        ]
      });
    }

    // Crash frequency
    if (session.crashes > 2) {
      tips.push({
        priority: 'medium',
        category: 'crashes',
        title: "High crash rate this stage",
        tips: [
          "Crashes happen when notes with danger marks (!, !!, DONTCUT) are missed.",
          "Prioritise reading the caution symbols — they appear at the end of notes.",
          "At lower difficulties there's more time to spot hazards. Use Easy mode to build the habit."
        ]
      });
    }

    return tips;
  },

  // Lifetime pattern analysis
  analyseLifetime(stats) {
    if (!stats) return [];
    const tips = [];
    const top = stats.topMistake;
    if (top && this.TIPS[top]) tips.push({ priority: 'high', ...this.TIPS[top] });
    if (stats.avg_reaction_ms > this.THRESHOLDS.late_reaction) {
      tips.push({
        priority: 'high', category: 'slow_reaction',
        title: `Lifetime reaction time: ${(stats.avg_reaction_ms/1000).toFixed(1)}s average`,
        tips: ["Your long-term reaction time is above the recommended threshold. Practise the Training School timed quiz."]
      });
    }
    if (stats.recentTrend === 'declining') {
      tips.push({
        priority: 'medium', category: 'trend',
        title: "Recent performance dropping",
        tips: ["Your last 5 sessions show a declining trend. Return to an easier difficulty and rebuild fundamentals."]
      });
    }
    return tips;
  }
};

// ═══════════════════════════════════════════════════════════════
// 3. ADAPTIVE DIFFICULTY — #019
// ═══════════════════════════════════════════════════════════════

const AdaptiveDifficulty = {
  enabled: false,
  baseTime: 9,
  currentTime: 9,
  windowSize: 4,     // Notes to look back
  recentResults: [], // true/false per note

  reset(baseTimeS) {
    this.baseTime = baseTimeS;
    this.currentTime = baseTimeS;
    this.recentResults = [];

    // Wire to StorySystem: adjust base time based on driver state
    if (typeof StorySystem !== 'undefined' && StorySystem.state) {
      const driverState = StorySystem.state.driverState;
      const stats = StorySystem.state.stats;

      // Drunk driver: slower reaction time, give more time
      if (driverState.drunk) {
        this.baseTime += 2;
        this.currentTime = this.baseTime;
      }

      // High mental stress: tighter window (more pressure)
      if (stats.mentalStress > 70) {
        this.baseTime -= 0.5;
        this.currentTime = Math.max(4, this.baseTime);
      }
    }
  },

  recordResult(correct) {
    this.recentResults.push(correct);
    if (this.recentResults.length > this.windowSize) {
      this.recentResults.shift();
    }
    this._adjust();
  },

  _adjust() {
    if (!this.enabled || this.recentResults.length < this.windowSize) return;
    const recentCorrect = this.recentResults.filter(Boolean).length;
    const ratio = recentCorrect / this.recentResults.length;

    if (ratio === 1.0) {
      // Perfect last 4 — tighten by 1s (harder)
      this.currentTime = Math.max(4, this.currentTime - 1);
    } else if (ratio <= 0.25) {
      // Only 0-1 of last 4 correct — ease by 1.5s
      this.currentTime = Math.min(15, this.currentTime + 1.5);
    } else if (ratio >= 0.75) {
      // 3-4 of last 4 correct — slight tighten
      this.currentTime = Math.max(4, this.currentTime - 0.5);
    }
    // Round to 1dp
    this.currentTime = Math.round(this.currentTime * 10) / 10;
  },

  getTimeLimit() {
    return this.enabled ? this.currentTime : G.timeLimit;
  },

  getLabel() {
    const t = this.currentTime;
    if (t <= 5) return 'ADAPTING — HARD';
    if (t <= 7) return 'ADAPTING — MEDIUM';
    return 'ADAPTING — EASY';
  }
};

// ═══════════════════════════════════════════════════════════════
// 4. REPLAY ENGINE — #016
// ═══════════════════════════════════════════════════════════════

const Replay = {
  recording: null,
  recordings: [],

  startRecording(stageId) {
    this.recording = {
      stageId, startTime: Date.now(),
      events: [], // { t, type, data }
      notes: []   // note sequence
    };
  },

  logEvent(type, data) {
    if (!this.recording) return;
    this.recording.events.push({
      t: Date.now() - this.recording.startTime,
      type, data
    });
  },

  logNote(note) {
    if (!this.recording) return;
    this.recording.notes.push({ t: Date.now() - this.recording.startTime, note });
  },

  logInput(char) { this.logEvent('input', { char }); },
  logSubmit(typed, ok, score) { this.logEvent('submit', { typed, ok, score }); },
  logTimeout() { this.logEvent('timeout', {}); },
  logCrash(type) { this.logEvent('crash', { type }); },

  endRecording(result) {
    if (!this.recording) return;
    this.recording.result = result;
    this.recording.duration = Date.now() - this.recording.startTime;
    // Tag mistake events
    this.recording.events.forEach(ev => {
      if (ev.type === 'submit' && !ev.data.ok) ev.isMistake = true;
      if (ev.type === 'timeout') ev.isMistake = true;
      if (ev.type === 'crash') ev.isMistake = true;
    });
    this.recordings.push(this.recording);
    if (this.recordings.length > 10) this.recordings.shift();
    try { localStorage.setItem('rpa_replays', JSON.stringify(this.recordings.slice(-5))); } catch(e){}
    const rec = this.recording;
    this.recording = null;
    return rec;
  },

  getTimeline(rec) {
    if (!rec) return [];
    const maxT = rec.duration;
    return rec.events.map(ev => ({
      ...ev,
      pct: maxT > 0 ? (ev.t / maxT) * 100 : 0
    }));
  },

  renderTimeline(rec, containerId) {
    const el = document.getElementById(containerId);
    if (!el || !rec) return;
    const timeline = this.getTimeline(rec);
    el.innerHTML = `
      <div class="replay-timeline-wrap">
        <div class="replay-bar">
          ${timeline.map(ev => `
            <div class="replay-event replay-event--${ev.type}${ev.isMistake?' replay-event--mistake':''}"
              style="left:${ev.pct.toFixed(1)}%"
              title="${ev.type}: ${JSON.stringify(ev.data)}">
            </div>`).join('')}
        </div>
        <div class="replay-legend">
          <span class="rleg rleg--submit">Submit</span>
          <span class="rleg rleg--timeout">Timeout</span>
          <span class="rleg rleg--crash">Crash</span>
          <span class="rleg rleg--mistake">Mistake</span>
        </div>
      </div>
    `;
  }
};

// ═══════════════════════════════════════════════════════════════
// 5. TRAINING PROGRAM PROGRESSION — #018 #027
// ═══════════════════════════════════════════════════════════════

const TrainingProgram = {
  LEVELS: [
    {
      id: 'beginner', label: 'Beginner', icon: '<i class="bi bi-circle-fill" style="color:#2eaf64"></i>',
      requirement: null,
      description: 'Learn the core pacenote vocabulary. No timer pressure.',
      drills: [
        { id: 'b1', name: 'Direction Recognition',      target: { accuracy: 80 }, timeLimit: 15, notes: 'basic_lr' },
        { id: 'b2', name: 'Corner Severity 1–6',        target: { accuracy: 80 }, timeLimit: 15, notes: 'severity' },
        { id: 'b3', name: 'Basic Full Notes',           target: { accuracy: 75 }, timeLimit: 12, notes: 'full_basic' },
      ],
      certification: { accuracy: 75, sessions: 2, label: 'Beginner Certified' }
    },
    {
      id: 'intermediate', label: 'Intermediate', icon: '<i class="bi bi-circle-fill" style="color:#ffb000"></i>',
      requirement: 'beginner',
      description: 'Caution marks, links, and distances. Time pressure increases.',
      drills: [
        { id: 'i1', name: 'Caution Mark Recognition',  target: { accuracy: 80 }, timeLimit: 10, notes: 'cautions' },
        { id: 'i2', name: 'Linked Corners (INTO)',      target: { accuracy: 75 }, timeLimit: 10, notes: 'into_links' },
        { id: 'i3', name: 'Distance Calls',            target: { accuracy: 75 }, timeLimit: 10, notes: 'distances' },
        { id: 'i4', name: 'Mixed Stage Notes',         target: { accuracy: 70 }, timeLimit: 9,  notes: 'mixed' },
      ],
      certification: { accuracy: 70, sessions: 3, label: 'Intermediate Certified' }
    },
    {
      id: 'advanced', label: 'Advanced', icon: '<i class="bi bi-circle-fill" style="color:#e8291c"></i>',
      requirement: 'intermediate',
      description: 'Era-specific vocabulary, GRAVEL, CREST, JUMP. Tight timers.',
      drills: [
        { id: 'a1', name: 'Group B Vocabulary',        target: { accuracy: 70 }, timeLimit: 8, notes: 'grpb_vocab' },
        { id: 'a2', name: 'WRC 90s Sequences',         target: { accuracy: 68 }, timeLimit: 7, notes: 'w90_seq' },
        { id: 'a3', name: 'Modern WRC + Hybrid Calls', target: { accuracy: 65 }, timeLimit: 7, notes: 'w24_hybrid' },
        { id: 'a4', name: 'Full Stage Simulation',     target: { accuracy: 65 }, timeLimit: 7, notes: 'full_stage' },
      ],
      certification: { accuracy: 65, sessions: 4, label: 'Advanced Certified' }
    },
    {
      id: 'expert', label: 'Expert', icon: '<i class="bi bi-star-fill"></i>',
      requirement: 'advanced',
      description: 'Maximum pressure. All eras. Chaos mode available.',
      drills: [
        { id: 'e1', name: 'Speed Run — 4s Timer',      target: { accuracy: 60 }, timeLimit: 4, notes: 'full_stage' },
        { id: 'e2', name: 'Chaos Mode',                target: { accuracy: 55 }, timeLimit: 4, notes: 'chaos' },
        { id: 'e3', name: 'Certification Stage',       target: { accuracy: 70 }, timeLimit: 6, notes: 'certification_stage' },
      ],
      certification: { accuracy: 70, sessions: 3, label: 'Expert Co-Driver' }
    }
  ],

  progress: {}, // { levelId: { certified: bool, drillsCompleted: [], sessions: [] } }

  load() {
    try {
      const saved = localStorage.getItem('rpa_training_progress');
      if (saved) this.progress = JSON.parse(saved);
    } catch(e) { this.progress = {}; }
    // Ensure beginner unlocked
    if (!this.progress.beginner) this.progress.beginner = { certified: false, drillsCompleted: [], sessions: [] };
  },

  save() {
    try { localStorage.setItem('rpa_training_progress', JSON.stringify(this.progress)); } catch(e){}
  },

  isUnlocked(levelId) {
    const level = this.LEVELS.find(l => l.id === levelId);
    if (!level) return false;
    if (!level.requirement) return true;
    return this.progress[level.requirement]?.certified === true;
  },

  isCertified(levelId) {
    return this.progress[levelId]?.certified === true;
  },

  recordDrillResult(levelId, drillId, accuracy, sessionId) {
    if (!this.progress[levelId]) {
      this.progress[levelId] = { certified: false, drillsCompleted: [], sessions: [] };
    }
    const p = this.progress[levelId];
    const level = this.LEVELS.find(l => l.id === levelId);
    const drill = level?.drills.find(d => d.id === drillId);

    if (drill && accuracy >= drill.target.accuracy) {
      if (!p.drillsCompleted.includes(drillId)) p.drillsCompleted.push(drillId);
    }
    p.sessions.push({ drillId, accuracy, sessionId, ts: Date.now() });
    this._checkCertification(levelId);
    this.save();
  },

  _checkCertification(levelId) {
    const level = this.LEVELS.find(l => l.id === levelId);
    const p = this.progress[levelId];
    if (!level || !p || p.certified) return;

    const cert = level.certification;
    const qualifyingSessions = p.sessions.filter(s => s.accuracy >= cert.accuracy);
    if (qualifyingSessions.length >= cert.sessions) {
      p.certified = true;
      p.certifiedAt = Date.now();
      // Unlock next level
      const idx = this.LEVELS.findIndex(l => l.id === levelId);
      if (idx < this.LEVELS.length - 1) {
        const next = this.LEVELS[idx + 1];
        if (!this.progress[next.id]) {
          this.progress[next.id] = { certified: false, drillsCompleted: [], sessions: [] };
        }
      }
      this._showCertificationBanner(level);
    }
  },

  _showCertificationBanner(level) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:99999;background:#000;border:2px solid #f5c518;
      padding:2rem 3rem;text-align:center;animation:certPop .3s ease;
    `;
    banner.innerHTML = `
      <div style="font-size:48px;margin-bottom:.5rem">${level.icon}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:3px;color:#f5c518">${level.certification.label}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#9090a8;margin-top:.5rem">Next level unlocked</div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3500);
  },

  getCurrentLevel() {
    // Highest certified level
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (this.isCertified(this.LEVELS[i].id)) return this.LEVELS[i];
    }
    return this.LEVELS[0];
  }
};

// ═══════════════════════════════════════════════════════════════
// 6. ADVANCED CO-DRIVER AUDIO SYSTEM — #014 #026
// ═══════════════════════════════════════════════════════════════

const CoDriverAudio = {
  style: 'calm',    // 'calm' | 'aggressive' | 'mcrae'
  baseOffset: 0,    // ms lead/lag vs note display
  humanRandom: 80,  // ±ms randomness to prevent robotic feel
  currentUtterance: null,
  voiceVolume: 1.0, // 0.0 to 1.0

  STYLES: {
    calm: {
      label: 'Calm & Precise',
      rate: 1.1, pitch: 1.0,
      preDelay: 200, description: 'Clear, measured calls. Like Nicky Grist.',
      // Pace note generation modifiers
      noteIntensity: 0.7,           // Less aggressive notes
      cautionFrequency: 1.0,        // Standard caution usage
      distanceVerbosity: 'high',    // Detailed distance calls
      linkWord: 'into',             // Gentle linking
      // Story/voice character
      voiceCharacter: 'measured',
      storyTone: 'professional',      // Professional, analytical post-stage comments
      commPhrases: ['Good pace', 'Measured approach', 'Clean execution', 'Precise notes'],
      narratorStyle: 'analytical'   // Analytical stage descriptions
    },
    aggressive: {
      label: 'Aggressive',
      rate: 1.45, pitch: 1.15,
      preDelay: 100, description: 'Fast, sharp calls. High pressure.',
      // Pace note generation modifiers
      noteIntensity: 1.3,           // More aggressive notes, higher stakes
      cautionFrequency: 1.3,        // More cautions (aggressive driving needs warnings)
      distanceVerbosity: 'low',     // Minimal distance calls - just corners
      linkWord: 'INTO',             // Urgent linking
      // Story/voice character
      voiceCharacter: 'intense',
      storyTone: 'aggressive',      // Intense, attacking post-stage comments
      commPhrases: ['Push harder', 'Attack the stage', 'Maximum commitment', 'Flat out everywhere'],
      narratorStyle: 'dramatic'     // Dramatic, high-tension descriptions
    },
    mcrae: {
      label: 'McRae Pace',
      rate: 1.6, pitch: 1.05,
      preDelay: 50, description: 'Maximum urgency. For the brave.',
      // Pace note generation modifiers
      noteIntensity: 1.5,           // Extreme intensity
      cautionFrequency: 0.8,      // Fewer cautions - trust the driver
      distanceVerbosity: 'minimal', // Very sparse calls
      linkWord: '>>',               // Very urgent linking
      // Story/voice character
      voiceCharacter: 'fearless',
      storyTone: 'bold',            // Fearless, legendary post-stage comments
      commPhrases: ['Flat to the floor', 'Give it everything', 'No fear', 'Maximum attack'],
      narratorStyle: 'legendary'    // Legendary, heroic descriptions
    }
  },

  setStyle(s) {
    if (this.STYLES[s]) this.style = s;
    try { localStorage.setItem('rpa_audio_style', s); } catch(e){}
  },

  setOffset(ms) {
    this.baseOffset = Math.max(-500, Math.min(1000, ms));
  },

  loadPrefs() {
    try {
      const s = localStorage.getItem('rpa_audio_style');
      if (s && this.STYLES[s]) this.style = s;
      const o = localStorage.getItem('rpa_audio_offset');
      if (o) this.baseOffset = parseInt(o);
      const v = localStorage.getItem('rpa_voice_volume');
      if (v) this.voiceVolume = parseFloat(v);
    } catch(e){}
  },

  setVoiceVolume(vol) {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
    try { localStorage.setItem('rpa_voice_volume', this.voiceVolume.toString()); } catch(e){}
  },

  _getDelay() {
    const style = this.STYLES[this.style];
    const human = (Math.random() - 0.5) * this.humanRandom * 2;
    return Math.max(0, style.preDelay + this.baseOffset + human);
  },

  speak(text, intensity = 1.0) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const delay = this._getDelay();
    setTimeout(() => {
      const style = this.STYLES[this.style];
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = style.rate * (0.95 + intensity * 0.1);
      utt.pitch = style.pitch;
      utt.volume = this.voiceVolume;

      /* Shared natural-voice picker (audio-mixer.js). Falls back to the
         old heuristic if the mixer isn't loaded. The old match on
         name.includes('male') also caught 'fe[male]' — fixed upstream. */
      if (typeof VoicePicker !== 'undefined') {
        VoicePicker.apply(utt);
      } else {
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v =>
          v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('george'))
        );
        if (pref) utt.voice = pref;
      }

      this.currentUtterance = utt;
      window.speechSynthesis.speak(utt);
    }, delay);
  },

  speakNote(rawNote, era) {
    const eraData = typeof ERAS !== 'undefined' ? ERAS[era] : null;
    const vocab = eraData?.vocab || {};
    const parts = rawNote.split(/\s+/).map(t => {
      if (t in vocab) return vocab[t];
      if (t.match(/^[LR][1-6]$/)){ const sevMap={'1':'hairpin','2':'very tight','3':'tight','4':'medium','5':'open','6':'fast sweep'}; return (t[0]==='L'?'left':'right')+' '+sevMap[t[1]]; }
      if (t.match(/^\d+$/)) return t+' metres';
      return t.toLowerCase();
    });
    // Intensity scales with timer remaining
    const intensity = typeof G !== 'undefined' ? (G.remaining / G.timeLimit) : 1.0;
    this.speak(parts.join(', '), 1.0 - intensity * 0.2);
  },

  speakCommentary(text, ok) {
    const style = this.STYLES[this.style];
    const delay = this._getDelay() + 200;
    setTimeout(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.88;
      utt.pitch = ok ? 1.05 : 0.85;
      utt.volume = 0.85;
      if (typeof VoicePicker !== 'undefined') VoicePicker.apply(utt);
      window.speechSynthesis.speak(utt);
    }, delay);
  },

  // Get style-specific commentary phrase
  getCommPhrase() {
    const style = this.STYLES[this.style];
    const phrases = style.commPhrases || ['Good pace'];
    return phrases[Math.floor(Math.random() * phrases.length)];
  },

  // Get style-specific link word for pace notes
  getLinkWord() {
    const style = this.STYLES[this.style];
    return style.linkWord || 'into';
  },

  // Get story tone for post-stage reports
  getStoryTone() {
    const style = this.STYLES[this.style];
    return style.storyTone || 'professional';
  },

  // Get narrator style for stage descriptions
  getNarratorStyle() {
    const style = this.STYLES[this.style];
    return style.narratorStyle || 'analytical';
  },

  // Get note intensity modifier (for generating notes)
  getNoteIntensity() {
    const style = this.STYLES[this.style];
    return style.noteIntensity || 1.0;
  },

  // Get caution frequency modifier
  getCautionFrequency() {
    const style = this.STYLES[this.style];
    return style.cautionFrequency || 1.0;
  },

  // Get distance verbosity level
  getDistanceVerbosity() {
    const style = this.STYLES[this.style];
    return style.distanceVerbosity || 'high';
  },

  // Get voice character type
  getVoiceCharacter() {
    const style = this.STYLES[this.style];
    return style.voiceCharacter || 'measured';
  }
};

// ═══════════════════════════════════════════════════════════════
// 7. PACENOTE SYSTEMS — #022 #023
// ═══════════════════════════════════════════════════════════════

const PacenoteSystem = {
  // Multiple notation formats
  FORMATS: {
    wrc_standard: {
      label: 'WRC Standard',
      description: 'L/R + severity (1–6). INTO, CREST, JUMP, !, !!',
      cornerLeft: 'L', cornerRight: 'R',
      hairpin: '1', fastSweep: '6',
      caution: '!', maxCaution: '!!',
      flat: 'FLAT', link: 'INTO'
    },
    jemba: {
      label: 'Jemba/Navitrace',
      description: 'Numeric system with modifier codes. Used in some WRC2 teams.',
      cornerLeft: 'L', cornerRight: 'R',
      hairpin: '1', fastSweep: '6',
      caution: 'C', maxCaution: 'CC',
      flat: 'FLT', link: '>'
    },
    roadbook: {
      label: 'Road Book Style',
      description: 'Written-word style with explicit descriptions.',
      cornerLeft: 'Left', cornerRight: 'Right',
      hairpin: 'Hairpin', fastSweep: 'Sweeper',
      caution: 'Caution', maxCaution: 'Max Caution',
      flat: 'Flat out', link: 'into'
    }
  },

  activeFormat: 'wrc_standard',

  setFormat(f) {
    if (this.FORMATS[f]) { this.activeFormat = f; }
    try { localStorage.setItem('rpa_note_format', f); } catch(e){}
  },

  // Display-only symbol remap for the active driver profile. Turns
  // wrc_standard-written raw notes into their jemba equivalents for
  // on-screen display (!!→CC, !→C, INTO→>, FLAT→FLT) when a Career
  // driver profile prefers that format. This is purely cosmetic: the
  // pre-written English 'ans' string used for scoring is untouched, and
  // translate()/normaliseAnswer already treat both symbol sets as the
  // same meaning, so switching this never changes what counts as correct.
  // Roadbook profiles are left as-is here (full-word notation doesn't
  // have a safe 1:1 shorthand substitution without a much bigger rewrite).
  applyFormatToRaw(raw) {
    if (this.activeFormat !== 'jemba') return raw;
    return raw
      .replace(/!!/g, ' CC')
      .replace(/!/g, ' C')
      .replace(/\bINTO\b/g, '>')
      .replace(/\bFLAT\b/g, 'FLT')
      .replace(/\s+/g, ' ')
      .trim();
  },

  translate(rawNote) {
    // Convert any format to plain English
    const r = rawNote.trim().toUpperCase();
    const out = [];
    const tokens = r.split(/\s+/);

    for (const tok of tokens) {
      if (tok.match(/^[LR][1-6]$/)) {
        const dir = tok[0]==='L'?'left':'right';
        const sevMap = {'1':'hairpin','2':'very tight','3':'tight','4':'medium','5':'open','6':'fast sweep'};
        out.push(dir+' '+sevMap[tok[1]]);
      }
      else if (tok.match(/^[LR][1-6]!!$/)) { const dir=tok[0]==='L'?'left':'right'; const sevMap={'1':'hairpin','2':'very tight','3':'tight','4':'medium','5':'open','6':'fast sweep'}; out.push(dir+' '+sevMap[tok[1]]+' maximum caution'); }
      else if (tok.match(/^[LR][1-6]!$/)) { const dir=tok[0]==='L'?'left':'right'; const sevMap={'1':'hairpin','2':'very tight','3':'tight','4':'medium','5':'open','6':'fast sweep'}; out.push(dir+' '+sevMap[tok[1]]+' caution'); }
      else if (tok === '!!' || tok === 'CC') out.push('maximum caution');
      else if (tok === '!' || tok === 'C') out.push('caution');
      else if (tok.match(/^\d+$/) ) out.push(tok + ' metres');
      else if (tok === 'INTO' || tok === '>') out.push('into');
      else if (tok === 'FLAT' || tok === 'FLT') out.push('flat out');
      else if (tok === 'CREST') out.push('over crest');
      else if (tok === 'JUMP') out.push('jump');
      else if (tok === 'DONTCUT') out.push("don't cut");
      else if (tok === 'HAIRPIN') out.push('hairpin');
      else if (tok === 'NARROW') out.push('narrows');
      else if (tok === 'STOP') out.push('stop');
      else if (tok === 'LONG') out.push('long');
      else if (tok === 'JUNCTION') out.push('junction');
      else if (tok === 'TIGHTENS') out.push('tightens');
      else if (tok === 'OPENS') out.push('opens');
      else if (tok === 'SQUARE') out.push('square corner');
      else if (tok === 'ICE') out.push('ice patch');
      else if (tok === 'GRAVEL') out.push('gravel patch');
      else if (tok === 'WATER') out.push('water splash');
      else if (tok === 'MUD') out.push('mud');
      else if (tok === 'BUMP' || tok === 'BUMPS') out.push('bumps');
      else if (tok === 'REGEN') out.push('regen zone');
      else if (tok === 'HYBRID') out.push('hybrid boost');
      else if (tok === 'FINISH') out.push('finish');
      else out.push(tok.toLowerCase());
    }
    return out.join(', ');
  }
};

// Custom Stage Editor state
const StageEditor = {
  notes: [],
  stageName: 'My Custom Stage',
  country: 'Custom',

  addNote(raw) {
    const translated = PacenoteSystem.translate(raw);
    this.notes.push({
      id: Date.now() + Math.random(),
      raw: raw.toUpperCase().trim(),
      ans: translated,
      narr: 'Custom note from editor.',
      comm: 'Custom stage — practise your own routes.'
    });
  },

  removeNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
  },

  moveNote(id, dir) {
    const idx = this.notes.findIndex(n => n.id === id);
    if (dir === 'up' && idx > 0) {
      [this.notes[idx], this.notes[idx-1]] = [this.notes[idx-1], this.notes[idx]];
    } else if (dir === 'down' && idx < this.notes.length - 1) {
      [this.notes[idx], this.notes[idx+1]] = [this.notes[idx+1], this.notes[idx]];
    }
  },

  exportStage() {
    return JSON.stringify({
      name: this.stageName, country: this.country,
      notes: this.notes, createdAt: new Date().toISOString()
    }, null, 2);
  },

  importStage(json) {
    try {
      const data = JSON.parse(json);
      this.notes = data.notes || [];
      this.stageName = data.name || 'Imported Stage';
      this.country = data.country || 'Unknown';
      return true;
    } catch(e) { return false; }
  },

  toGameStage() {
    return {
      name: `Custom — ${this.stageName}`,
      country: this.country,
      surf: 'Custom', weather: 'Unknown', km: '??.?',
      cond: 'Custom stage from editor.',
      notes: this.notes
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// 8. EXPORT SYSTEM — #028
// ═══════════════════════════════════════════════════════════════

const ExportSystem = {
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  exportAnalyticsJSON() {
    const data = Analytics.exportJSON();
    this.downloadFile(data, `rally_analytics_${Date.now()}.json`, 'application/json');
  },

  exportAnalyticsCSV() {
    const data = Analytics.exportCSV();
    this.downloadFile(data, `rally_analytics_${Date.now()}.csv`, 'text/csv');
  },

  exportStage(stage) {
    const data = StageEditor.exportStage();
    this.downloadFile(data, `${StageEditor.stageName.replace(/\s/g,'_')}.json`, 'application/json');
  },

  exportTrainingReport() {
    const stats = Analytics.getLifetimeStats();
    const prog = TrainingProgram.progress;
    const report = {
      generated: new Date().toISOString(),
      driver: typeof G !== 'undefined' ? G.driver : 'Unknown',
      lifetimeStats: stats,
      trainingProgress: prog,
      certifications: TrainingProgram.LEVELS.filter(l => TrainingProgram.isCertified(l.id)).map(l => ({
        level: l.label, certifiedAt: prog[l.id]?.certifiedAt
      })),
      coachingTips: stats ? Coach.analyseLifetime(stats) : []
    };
    this.downloadFile(JSON.stringify(report, null, 2), `rally_training_report_${Date.now()}.json`, 'application/json');
  }
};

// ═══════════════════════════════════════════════════════════════
// 9. ACCESSIBILITY — #021
// ═══════════════════════════════════════════════════════════════

const Accessibility = {
  prefs: {
    timerAssist: false,      // extra +3s on timer
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    keyboardMode: false,     // show keyboard shortcuts prominently
    timerColor: '#39ff14',   // custom timer color
    theme: 'dark',            // 'dark' or 'light'
    musicVolume: 0.5,        // 0.0 to 1.0
    voiceVolume: 1.0         // 0.0 to 1.0
  },

  load() {
    try {
      const saved = localStorage.getItem('rpa_a11y');
      if (saved) Object.assign(this.prefs, JSON.parse(saved));
    } catch(e){}
    this.apply();
  },

  set(key, val) {
    this.prefs[key] = val;
    this.apply();
    try { localStorage.setItem('rpa_a11y', JSON.stringify(this.prefs)); } catch(e){}
  },

  apply() {
    const b = document.body;
    b.classList.toggle('a11y-high-contrast', this.prefs.highContrast);
    b.classList.toggle('a11y-large-text', this.prefs.largeText);
    b.classList.toggle('a11y-reduced-motion', this.prefs.reducedMotion);
    b.classList.toggle('a11y-keyboard-mode', this.prefs.keyboardMode);
    b.classList.toggle('light-theme', this.prefs.theme === 'light');
    this.applyAudioVolumes();
  },

  applyAudioVolumes() {
    /* Accessibility-screen sliders route through AudioMixer when present —
       one shared, persisted audio state instead of two competing stores. */
    if (typeof AudioMixer !== 'undefined' && AudioMixer.set) {
      AudioMixer.set('music', this.prefs.musicVolume);
      AudioMixer.set('voice', this.prefs.voiceVolume);
      return;
    }
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
      bgMusic.volume = this.prefs.musicVolume;
    }
    if (typeof CoDriverAudio !== 'undefined') {
      CoDriverAudio.setVoiceVolume(this.prefs.voiceVolume);
    }
  },

  getTimeBonus() {
    return this.prefs.timerAssist ? 3 : 0;
  }
};

// ═══════════════════════════════════════════════════════════════
// 10. EXTENDED TUTORIAL — ALL CONCEPTS + GRAVEL/SURFACE + MODE CHOICE
// ═══════════════════════════════════════════════════════════════

const EXTENDED_TUTORIAL_STEPS = [
  // ── INTRO ──
  {
    id: 'intro', phase: 'intro',
    title: "Read the pacenotes. Keep the driver alive.",
    body: "You're the co-driver. Your driver is going flat-out and can't see what's coming. You read handwritten shorthand notes before every corner. Get it right — they survive. Get it wrong — you're in the trees.",
    highlight: null, note: null, needsInput: false, nextLabel: "I'm ready →"
  },

  // ── CORNERS ──
  {
    id: 'corner_lr', phase: 'corners',
    title: "Direction: L and R",
    body: "Every note starts with a direction. <strong>L = Left, R = Right.</strong> Simple. Fast. Always comes first.",
    highlight: "L = Left turn\nR = Right turn\n\nThe driver needs to hear this before everything else.",
    note: null, needsInput: false, nextLabel: "Got it →"
  },
  {
    id: 'corner_severity', phase: 'corners',
    title: "Severity: 1 to 6",
    body: "<strong>1 = tightest hairpin. 6 = fast sweep.</strong> Think of it as how open the corner is — not how sharp. A 6 might be flat-out. A 1 is a U-turn.",
    highlight: "1 = Hairpin (U-turn)\n2 = Very tight\n3 = Tight\n4 = Medium\n5 = Open\n6 = Fast sweep (maybe flat)\nFLAT = Full throttle, no braking",
    note: null, needsInput: false, nextLabel: "Try one →"
  },
  {
    id: 'corner_l3', phase: 'corners',
    title: "Try it: L3",
    body: "Direction + severity. That's a medium-speed left corner. Type the translation below.",
    highlight: "L = Left\n3 = Tight\nSo: L3 = ?",
    note: "L3",
    needsInput: true, prompt: "Translate:", hint: "left tight",
    accept: ["left tight","l3"],
    successMsg: "OK â CORRECT — Clean read", nextLabel: "Next →"
  },
  {
    id: 'corner_r5', phase: 'corners',
    title: "Now try a fast one: R5",
    body: "A right 5 is quite fast — light braking or maybe no braking at all.",
    highlight: "R = Right\n5 = Open",
    note: "R5",
    needsInput: true, prompt: "Translate:", hint: "right open",
    accept: ["right open","r5"],
    successMsg: "OK â GOOD — Open corner read", nextLabel: "Next →"
  },

  // ── CAUTIONS ──
  {
    id: 'caution_intro', phase: 'hazards',
    title: "Caution marks: ! and !!",
    body: "These are the most important symbols. They appear when something dangerous was found in recce that the driver can't see from the entry. Missing them is how drivers get hurt.",
    highlight: "!  = Caution — something to watch for\n!! = MAXIMUM caution — do NOT deviate from the line\n\nAlways read caution marks. Always say them.",
    note: null, needsInput: false, nextLabel: "Try one →"
  },
  {
    id: 'caution_single', phase: 'hazards',
    title: "Single caution: R3!",
    body: "The ! comes after the severity. Say the corner first, then the caution.",
    highlight: "R3! = Right tight — caution\nSay: 'right tight caution'",
    note: "R3!",
    needsInput: true, prompt: "Translate:", hint: "right tight caution",
    accept: ["right tight caution","right 3!","r3"],
    successMsg: "OK â HAZARD NOTED", nextLabel: "Next →"
  },
  {
    id: 'caution_double', phase: 'hazards',
    title: "Double caution: L2!!",
    body: "Two exclamation marks means maximum caution. The line here is critical — wrong line and you're off the stage. Must say 'maximum caution' not just 'caution'.",
    highlight: "!! = MAXIMUM caution\nNot just 'caution' — the driver needs to know this is extreme.",
    note: "L2!!",
    needsInput: true, prompt: "Translate:", hint: "left very tight maximum caution",
    accept: ["left very tight maximum caution","left very tight max caution","l2!!"],
    successMsg: "OK â MAX CAUTION CALLED — Driver lives", nextLabel: "Next →"
  },

  // ── SURFACE HAZARDS ──
  {
    id: 'surface_dontcut', phase: 'hazards',
    title: "Surface & line hazards: DONTCUT",
    body: "DONTCUT means there's a rock, ditch, or drop on the inside of the corner. If the driver cuts the apex they hit it. The note tells them to stay on the outside.",
    highlight: "DONTCUT = Stay on the outside line\nUsed when: rock on inside, drop-off, drainage channel",
    note: "R4 DONTCUT",
    needsInput: true, prompt: "Translate:", hint: "right medium don't cut",
    accept: ["right medium don't cut","right medium dontcut","r4 dontcut"],
    successMsg: "OK â Inside hazard called", nextLabel: "Next →"
  },
  {
    id: 'surface_gravel', phase: 'hazards',
    title: "Surface: GRAVEL patch",
    body: "Gravel patches appear on tarmac stages or transitions — a patch of loose gravel that can throw the car wide. Particularly dangerous on corner exits.",
    highlight: "GRAVEL = Loose gravel on road\nCommon on tarmac/gravel transitions\nCan cause sudden oversteer on corner exit",
    note: "R3 GRAVEL INTO L4",
    needsInput: true, prompt: "Translate:", hint: "right tight gravel patch into left medium",
    accept: ["right tight gravel into left medium","right tight gravel patch into left medium"],
    successMsg: "OK â Surface hazard noted", nextLabel: "Next →"
  },
  {
    id: 'surface_ice', phase: 'hazards',
    title: "Surface: ICE",
    body: "On winter and mountain stages, ice patches appear — often inside corners where the sun doesn't reach. These must be called with the distance before them.",
    highlight: "ICE = Ice patch on road\nOften used with distance: 'L3 ICE 50'\nNight stages on Monte Carlo: most dangerous note type",
    note: "L3 ICE 50",
    needsInput: true, prompt: "Translate:", hint: "left tight ice 50 metres",
    accept: ["left tight ice 50","left tight ice 50 metres"],
    successMsg: "OK â Ice called — Monte Carlo mode", nextLabel: "Next →"
  },

  // ── DISTANCES & LINKING ──
  {
    id: 'distance_intro', phase: 'distances',
    title: "Distance calls",
    body: "Numbers like 50, 100, 200 are distances in metres to the next corner. They give the driver time to brake. Without a distance, the next corner appears at whatever speed they're doing.",
    highlight: "50 = 50 metres (very close)\n100 = one braking zone away\n200 = time to breathe\n\nThe bigger the distance, the more time to brake.",
    note: null, needsInput: false, nextLabel: "Try one →"
  },
  {
    id: 'distance_example', phase: 'distances',
    title: "Distance: L4 100 R3",
    body: "Left medium, then 100 metres to a right tight. The driver takes the left, then has 100m to set up for the right.",
    highlight: "L4 = Left medium\n100 = 100 metres\nR3 = Right tight\n\nSay all three parts.",
    note: "L4 100 R3",
    needsInput: true, prompt: "Translate all three:", hint: "left medium 100 metres right tight",
    accept: ["left medium 100 right tight","left medium 100 metres right tight"],
    successMsg: "OK â Full sequence called", nextLabel: "Next →"
  },
  {
    id: 'into_intro', phase: 'distances',
    title: "INTO — linked corners",
    body: "<strong>INTO</strong> means the second corner follows immediately — no gap, no recovery. Both corners need to be in one call. The driver plans for both at once.",
    highlight: "L3 INTO R4\n= Left tight, directly into right medium\n\nINTO = no gap between corners\nBoth must be called together",
    note: "L3 INTO R4",
    needsInput: true, prompt: "Translate the linked sequence:", hint: "left tight into right medium",
    accept: ["left tight into right medium","l3 into r4"],
    successMsg: "OK â GOOD FLOW — Both corners read", nextLabel: "Next →"
  },

  // ── CREST / JUMP ──
  {
    id: 'crest', phase: 'advanced',
    title: "CREST — blind entry",
    body: "CREST means the corner is over a rise — the driver can't see the apex until they're committed. It's one of the most dangerous notes because the entry is completely blind.",
    highlight: "CREST = Corner over a blind rise\nSay: 'over crest'\nDriver is committed before seeing the apex — notes are everything",
    note: "CREST R4",
    needsInput: true, prompt: "Translate:", hint: "over crest right medium",
    accept: ["over crest right medium","crest right medium"],
    successMsg: "OK â Crest called — driver can commit", nextLabel: "Next →"
  },
  {
    id: 'jump', phase: 'advanced',
    title: "JUMP — airborne",
    body: "On Finnish stages especially, JUMP means the car goes airborne. The driver needs to know what corner follows the landing. You call the jump, then the landing corner.",
    highlight: "JUMP = Car leaves ground\nMust always say what comes after\nExample: 'jump into right tight'\nFinland: 30–40m jumps at 180 km/h",
    note: "JUMP R3 LONG",
    needsInput: true, prompt: "Translate:", hint: "jump into right tight long",
    accept: ["jump right tight long","jump into right tight long"],
    successMsg: "OK â Jump called — landing right tight", nextLabel: "Next →"
  },

  // ── FULL COMPLEX NOTE ──
  {
    id: 'complex', phase: 'advanced',
    title: "Full complex note",
    body: "Real pacenotes combine everything at once. Read the whole note before you start typing. Count the corners, spot the hazards, then translate.",
    highlight: "Strategy:\n1. Read the whole note first\n2. Count the corners\n3. Spot any ! or hazard words\n4. Type direction + severity for each part",
    note: "L3 !2 INTO R4 DONTCUT",
    needsInput: true, prompt: "Translate the full note:", hint: "left tight caution hairpin into right medium don't cut",
    accept: ["left tight caution hairpin into right medium don't cut","left tight caution hairpin into right medium dontcut"],
    successMsg: "OK â PERFECT — Full note read", nextLabel: "Almost done →"
  },

  // ── TIMED PRESSURE ──
  {
    id: 'timed', phase: 'pressure',
    title: "Now feel the real pressure",
    body: "In a stage you have seconds. The timer starts when the note appears. There's no pause. The driver is already at speed.",
    highlight: "8 seconds. Translate this.\nDon't think too long — start typing.",
    note: "R5 CREST L3!",
    needsInput: true, timedStep: true, timeLimit: 8,
    prompt: "Translate fast:", hint: "right open over crest left tight caution",
    accept: ["right open crest left tight caution","right open over crest left tight caution"],
    successMsg: "OK â RAPID READ — Under pressure", nextLabel: "Final step →"
  },

  // ── MODE CHOICE ──
  {
    id: 'mode_choice', phase: 'complete',
    title: "You're ready. Choose your mode.",
    body: "Two ways to play. Both are valid.",
    highlight: null, note: null, needsInput: false,
    isModeChoice: true,
    nextLabel: null
  }
];

// Replace the existing TUTORIAL_STEPS with the extended version
if (typeof window !== 'undefined') {
  window.TUTORIAL_STEPS_EXTENDED = EXTENDED_TUTORIAL_STEPS;
}

// ═══════════════════════════════════════════════════════════════
// 11. MODE TOGGLE UI — "Game Mode" vs "Training Mode"
// ═══════════════════════════════════════════════════════════════

function renderModeToggle() {
  const el = document.getElementById('mode-toggle-btn');
  if (!el) return;
  el.innerHTML = MODE.isPro ? '<i class="bi bi-lightbulb"></i> Training Mode' : '<i class="bi bi-controller"></i> Game Mode';
  el.style.borderColor = MODE.isPro ? '#f5c518' : '#252530';
  el.style.color = MODE.isPro ? '#f5c518' : '#9090a8';
}

// ═══════════════════════════════════════════════════════════════
// 12. ANALYTICS OVERLAY (PRO MODE ONLY) — #024
// ═══════════════════════════════════════════════════════════════

function renderAnalyticsOverlay() {
  const el = document.getElementById('pro-analytics-overlay');
  if (!el) return;
  el.style.display = MODE.isPro ? 'flex' : 'none';
  if (!MODE.isPro) return;

  const stats = Analytics.getLifetimeStats();
  if (!stats) {
    el.innerHTML = '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#5a5a70">No data yet — complete a stage</div>';
    return;
  }

  const trendIcon = { improving: '↑', declining: '↓', stable: '→' }[stats.recentTrend] || '→';
  const trendColor = { improving: '#39ff14', declining: '#e8291c', stable: '#f5c518' }[stats.recentTrend];

  el.innerHTML = `
    <div class="pro-stat"><span class="pro-stat-lbl">Lifetime accuracy</span><span class="pro-stat-val">${stats.lifetime_accuracy}%</span></div>
    <div class="pro-stat"><span class="pro-stat-lbl">Avg reaction</span><span class="pro-stat-val">${(stats.avg_reaction_ms/1000).toFixed(1)}s</span></div>
    <div class="pro-stat"><span class="pro-stat-lbl">Consistency</span><span class="pro-stat-val">${stats.consistency}/100</span></div>
    <div class="pro-stat"><span class="pro-stat-lbl">Trend</span><span class="pro-stat-val" style="color:${trendColor}">${trendIcon} ${stats.recentTrend}</span></div>
    <div class="pro-stat"><span class="pro-stat-lbl">Sessions</span><span class="pro-stat-val">${stats.sessions}</span></div>
    ${stats.topMistake ? `<div class="pro-stat"><span class="pro-stat-lbl">Top mistake</span><span class="pro-stat-val" style="color:#e8291c;font-size:10px">${stats.topMistake.replace(/_/g,' ')}</span></div>` : ''}
  `;
}

// ═══════════════════════════════════════════════════════════════
// 13. POST-STAGE PRO SUMMARY — #024 #025
// ═══════════════════════════════════════════════════════════════

function renderProSummary(session) {
  const el = document.getElementById('pro-summary');
  if (!el || !session) return;
  el.style.display = MODE.isPro ? 'block' : 'none';
  if (!MODE.isPro) return;

  const tips = Coach.analyse(session);
  const topTip = tips[0];

  // Reaction time sparkline
  const rts = session.reactionTimes.map(r => r.ms);
  const maxRT = Math.max(...rts, 1);
  const sparkline = rts.map(rt => {
    const h = Math.round((rt / maxRT) * 30);
    const col = rt > 8000 ? '#e8291c' : rt > 5000 ? '#f5c518' : '#39ff14';
    return `<span style="display:inline-block;width:8px;height:${h}px;background:${col};margin:0 1px;vertical-align:bottom"></span>`;
  }).join('');

  el.innerHTML = `
    <div class="pro-section-hdr"><i class="bi bi-graph-up"></i> Performance Analysis</div>
    <div class="pro-stats-grid">
      <div class="ps-card"><div class="ps-val">${session.accuracy}%</div><div class="ps-lbl">Accuracy</div></div>
      <div class="ps-card"><div class="ps-val">${(session.avgReactionTime/1000).toFixed(1)}s</div><div class="ps-lbl">Avg Reaction</div></div>
      <div class="ps-card"><div class="ps-val">${session.consistency}/100</div><div class="ps-lbl">Consistency</div></div>
      <div class="ps-card"><div class="ps-val">${session.crashes}</div><div class="ps-lbl">Incidents</div></div>
    </div>
    ${rts.length > 0 ? `<div class="pro-sparkline-wrap"><div class="pro-slbl">Reaction times per note</div><div style="padding:.5rem 0">${sparkline}</div></div>` : ''}
    ${Object.keys(session.mistakeBreakdown||{}).length > 0 ? `
      <div class="pro-mistake-breakdown">
        <div class="pro-slbl">Mistake breakdown</div>
        ${Object.entries(session.mistakeBreakdown).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>`
          <div class="pmb-row">
            <span class="pmb-cat">${cat.replace(/_/g,' ')}</span>
            <div class="pmb-bar-wrap"><div class="pmb-bar" style="width:${Math.min(100,n*25)}%"></div></div>
            <span class="pmb-count">×${n}</span>
          </div>`).join('')}
      </div>` : ''}
    ${topTip ? `
      <div class="pro-coach-tip">
        <div class="pro-slbl"><i class="bi bi-lightbulb"></i> Coach says</div>
        <div class="pct-title">${topTip.title}</div>
        <ul class="pct-tips">${topTip.tips.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>` : ''}
    <div class="pro-export-row">
      <button class="pro-export-btn" onclick="ExportSystem.exportAnalyticsCSV()"><i class="bi bi-filetype-csv pe-ico"></i><span class="pe-body"><span class="pe-title">CSV</span><span class="pe-sub">spreadsheet of every stage</span></span></button>
      <button class="pro-export-btn" onclick="ExportSystem.exportAnalyticsJSON()"><i class="bi bi-filetype-json pe-ico"></i><span class="pe-body"><span class="pe-title">JSON</span><span class="pe-sub">raw data for tools &amp; scripts</span></span></button>
      <button class="pro-export-btn" onclick="ExportSystem.exportTrainingReport()"><i class="bi bi-clipboard-data pe-ico"></i><span class="pe-body"><span class="pe-title">FULL REPORT</span><span class="pe-sub">stats, coach tips, certifications</span></span></button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 14. HOOK INTO EXISTING GAME FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const __RPA_HOOKS = window.__RPA_HOOKS || (window.__RPA_HOOKS = {});

// Hook beginStageWithData
if (typeof window.beginStageWithData === 'function' && !window.beginStageWithData.__rpaWrapped) {
  const _sys_origBeginStageWithData = window.beginStageWithData;
  __RPA_HOOKS.beginStageWithData = _sys_origBeginStageWithData;
  const wrappedBeginStageWithData = function(stage) {
    if (__RPA_HOOKS._beginBusy) {
      return _sys_origBeginStageWithData(stage);
    }
    __RPA_HOOKS._beginBusy = true;
    try {
      Analytics.startSession(G.era, stage.name, G.car?.n || 'Unknown', DIFFS[G.diff]?.n || 'Normal');
      Replay.startRecording(stage.name);
      AdaptiveDifficulty.reset(G.timeLimit);
      resetSplitGap?.();
      return _sys_origBeginStageWithData(stage);
    } finally {
      __RPA_HOOKS._beginBusy = false;
    }
  };
  wrappedBeginStageWithData.__rpaWrapped = true;
  window.beginStageWithData = wrappedBeginStageWithData;
}

// Hook loadNote to record display time
if (typeof window.loadNote === 'function' && !window.loadNote.__rpaWrapped) {
  const _sys_origLoadNote = window.loadNote;
  __RPA_HOOKS.loadNote = _sys_origLoadNote;
  const wrappedLoadNote = function() {
    const out = _sys_origLoadNote();
    if (typeof G !== 'undefined' && G.idx < (G.notes?.length || 0)) {
      Analytics.noteDisplayed(G.idx);
      Replay.logNote(G.notes[G.idx]);
    }
    return out;
  };
  wrappedLoadNote.__rpaWrapped = true;
  window.loadNote = wrappedLoadNote;
}

// Hook input for reaction time tracking
document.addEventListener('keydown', e => {
  if (e.target.id === 'g-input' && e.key.length === 1) {
    if (typeof G !== 'undefined') Analytics.recordFirstKeypress(G.idx);
    Replay.logInput(e.key);
  }
});

// Hook submitAnswer
if (typeof window.submitAnswer === 'function' && !window.submitAnswer.__rpaWrapped) {
  const _sys_origSubmit = window.submitAnswer;
  __RPA_HOOKS.submitAnswer = _sys_origSubmit;
  const wrappedSubmitAnswer = function() {
    if (__RPA_HOOKS._submitBusy) {
      return _sys_origSubmit();
    }
    __RPA_HOOKS._submitBusy = true;
    try {
      const preIdx = typeof G !== 'undefined' ? G.idx : 0;
      const out = _sys_origSubmit();
      if (typeof G !== 'undefined' && G.results.length > 0) {
        const lastResult = G.results[G.results.length - 1];
        Analytics.recordNote(preIdx, lastResult.raw, lastResult.ans, lastResult.typed, lastResult.ok, lastResult.score, 0);
        AdaptiveDifficulty.recordResult(lastResult.ok);
        Replay.logSubmit(lastResult.typed, lastResult.ok, lastResult.score);
        if (lastResult.ok) {
          TrainingProgram.recordDrillResult?.(TrainingProgram.getCurrentLevel?.()?.id, 'session', G.correct / Math.max(1, G.notes.length) * 100, Analytics.currentSession?.id);
        }
      }
      return out;
    } finally {
      __RPA_HOOKS._submitBusy = false;
    }
  };
  wrappedSubmitAnswer.__rpaWrapped = true;
  window.submitAnswer = wrappedSubmitAnswer;
}

// Hook endStage
if (typeof window.endStage === 'function' && !window.endStage.__rpaWrapped) {
  const _sys_origEndStage = window.endStage;
  __RPA_HOOKS.endStage = _sys_origEndStage;
  const wrappedEndStage = function() {
    const out = _sys_origEndStage();
    const session = Analytics.endSession(G.dnf, null);
    Replay.endRecording(session);
    if (session && MODE.isPro) {
      setTimeout(() => renderProSummary(session), 800);
    }
    return out;
  };
  wrappedEndStage.__rpaWrapped = true;
  window.endStage = wrappedEndStage;
}

// ═══════════════════════════════════════════════════════════════
// 15. EXTENDED TUTORIAL RENDER — replaces original
// ═══════════════════════════════════════════════════════════════

function renderExtendedTutStep() {
  const steps = window.TUTORIAL_STEPS_EXTENDED;
  if (!steps) return;
  const currentStep = (typeof tutStep !== 'undefined') ? tutStep : 0;
  // Use existing tutStep counter
  const step = steps[currentStep];
  if (!step) { endExtendedTutorial(); return; }

  const total = steps.length;
  const pct = (currentStep / (total - 1)) * 100;

  document.getElementById('tut-prog-fill').style.width = pct + '%';
  document.getElementById('tut-step-label').textContent = `${step.phase?.toUpperCase() || 'TUTORIAL'} · Step ${currentStep + 1} of ${total}`;
  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-body').innerHTML = step.body;

  const noteEl = document.getElementById('tut-note-display');
  noteEl.style.display = step.note ? 'block' : 'none';
  if (step.note) noteEl.textContent = step.note;

  const hlEl = document.getElementById('tut-highlight-box');
  hlEl.style.display = step.highlight ? 'block' : 'none';
  if (step.highlight) hlEl.textContent = step.highlight;

  const inputWrap = document.getElementById('tut-input-wrap');
  const inputEl = document.getElementById('tut-input');
  const hintEl = document.getElementById('tut-input-hint');
  const feedbackEl = document.getElementById('tut-feedback-line');
  const nextBtn = document.getElementById('tut-next');

  if (step.isModeChoice) {
    inputWrap.style.display = 'none';
    nextBtn.style.display = 'none';
    // Inject mode choice buttons
    const existingChoice = document.getElementById('tut-mode-choice');
    if (!existingChoice) {
      const choiceDiv = document.createElement('div');
      choiceDiv.id = 'tut-mode-choice';
      choiceDiv.style.cssText = 'display:flex;gap:10px;margin-top:1rem;';
      choiceDiv.innerHTML = `
        <button onclick="chooseTutMode('game')" style="flex:1;padding:1.1rem;background:#111116;border:1px solid #252530;color:#f0f0f0;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;transition:all .15s">
          <i class="bi bi-controller"></i> GAME MODE<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#9090a8;font-weight:400;letter-spacing:.05em;margin-top:.35rem;text-transform:none">Play instantly · Simple feedback · Fun first</div>
        </button>
        <button onclick="chooseTutMode('pro')" style="flex:1;padding:1.1rem;background:#1a1400;border:1px solid #f5c518;color:#f5c518;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;transition:all .15s">
          <i class="bi bi-lightbulb"></i> TRAINING MODE<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#9090a8;font-weight:400;letter-spacing:.05em;margin-top:.35rem;text-transform:none">Analytics · Coaching · Structured drills</div>
        </button>
      `;
      document.getElementById('tut-box').querySelector('div').appendChild(choiceDiv);
    }
    return;
  }

  // Remove mode choice if present
  const mc = document.getElementById('tut-mode-choice');
  if (mc) mc.remove();

  if (step.needsInput) {
    inputWrap.style.display = 'block';
    if (inputEl) { inputEl.value = ''; inputEl.disabled = false; }
    if (hintEl) hintEl.textContent = step.prompt || 'Type your translation';
    if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.style.color = ''; }
    nextBtn.style.display = 'none';
    setTimeout(() => inputEl?.focus(), 80);

    if (step.timedStep && step.timeLimit) {
      if (typeof tutTimer !== 'undefined') clearInterval(tutTimer);
      let remaining = step.timeLimit;
      if (hintEl) { hintEl.textContent = `${remaining}s remaining`; hintEl.style.color = '#5a5a70'; }
      window.tutTimer = setInterval(() => {
        remaining--;
        if (hintEl) {
          hintEl.textContent = `${remaining}s remaining`;
          hintEl.style.color = remaining <= 3 ? '#e8291c' : '#5a5a70';
        }
        if (remaining <= 0) {
          clearInterval(window.tutTimer);
          if (feedbackEl) { feedbackEl.textContent = 'Time up. Press Continue to retry the next step.'; feedbackEl.style.color = '#f5c518'; }
          if (inputEl) inputEl.disabled = true;
          nextBtn.style.display = 'block';
        }
      }, 1000);
    }
  } else {
    inputWrap.style.display = 'none';
    nextBtn.style.display = 'block';
    nextBtn.textContent = step.nextLabel || 'Continue';
  }
}

function chooseTutMode(mode) {
  MODE.pro = (mode === 'pro');
  try { localStorage.setItem('rpa_pro_mode', MODE.isPro ? '1' : '0'); } catch(e){}
  document.body.classList.toggle('pro-mode', MODE.isPro);
  renderModeToggle();
  document.getElementById('tut-overlay').style.display = 'none';
  if (typeof tutTimer !== 'undefined') clearInterval(tutTimer);
  // Go to quick stage or career depending on what they know
  openSetupFresh?.() || openSetup?.();
}

function endExtendedTutorial() {
  document.getElementById('tut-overlay').style.display = 'none';
  if (typeof tutTimer !== 'undefined') clearInterval(tutTimer);
  // Show mode choice screen if not already chosen
  openSetupFresh?.() || openSetup?.();
}

// Override renderTutStep to use extended steps
window.renderTutStep = function() {
  if (window.TUTORIAL_STEPS_EXTENDED) {
    renderExtendedTutStep();
  }
};

// Override tutNext to use extended steps
window.tutNext = function() {
  const steps = window.TUTORIAL_STEPS_EXTENDED;
  if (!steps) return;
  if (typeof tutStep === 'undefined') return;
  tutStep++;
  if (tutStep >= steps.length) { endExtendedTutorial(); return; }
  renderExtendedTutStep();
};

// Override checkTutInput to use extended accept lists
window.checkTutInput = function() {
  const steps = window.TUTORIAL_STEPS_EXTENDED;
  if (!steps) return;
  if (typeof tutStep === 'undefined') return;
  const step = steps[tutStep];
  if (!step || !step.needsInput) return;

  const inputEl = document.getElementById('tut-input');
  const feedbackEl = document.getElementById('tut-feedback-line');
  if (!inputEl || !feedbackEl) return;

  const val = inputEl.value.trim().toLowerCase().replace(/[^a-z0-9 ']/g,'');
  if (!val) return;

  const accepted = step.accept || [];
  let matched = false;
  for (const a of accepted) {
    const aClean = a.toLowerCase().replace(/[^a-z0-9 ']/g,'');
    const wordsVal = new Set(val.split(/\s+/));
    const wordsAns = new Set(aClean.split(/\s+/));
    let hits = 0; wordsAns.forEach(w => { if (wordsVal.has(w)) hits++; });
    if (hits / wordsAns.size >= 0.6) { matched = true; break; }
  }

  if (typeof tutTimer !== 'undefined') clearInterval(tutTimer);

  if (matched) {
    feedbackEl.textContent = 'OK â ' + (step.successMsg || 'Correct');
    feedbackEl.style.color = '#39ff14';
    inputEl.disabled = true;
    document.getElementById('tut-next').style.display = 'block';
    document.getElementById('tut-next').textContent = step.nextLabel || 'Next →';
  } else {
    feedbackEl.textContent = 'Not quite — read the note again and try once more.';
    feedbackEl.style.color = '#ff9090';
    inputEl.style.animation = 'none';
    requestAnimationFrame(() => { inputEl.style.animation = 'tutShake .3s ease'; });
  }
};

// ═══════════════════════════════════════════════════════════════
// 16. INITIALISATION
// ═══════════════════════════════════════════════════════════════

function initSystems() {
  Analytics.load();
  TrainingProgram.load();
  CoDriverAudio.loadPrefs();
  Accessibility.load();
  MODE.load();
  renderModeToggle();
  renderAnalyticsOverlay();

  // Wire up mode toggle button if exists
  const modeBtn = document.getElementById('mode-toggle-btn');
  if (modeBtn) modeBtn.addEventListener('click', () => MODE.toggle());

  // Wire adaptive difficulty to game
  AdaptiveDifficulty.enabled = MODE.isPro;

  console.log('[RPA Systems] v3.0 initialised. Pro mode:', MODE.isPro);
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSystems);
} else {
  setTimeout(initSystems, 100);
}

// ═══════════════════════════════════════════════════════════════
// SCREEN OPEN FUNCTIONS FOR NEW SCREENS
// ═══════════════════════════════════════════════════════════════

function openAnalytics() {
  show('analytics');
  renderAnalyticsDashboard();
}

function openPrograms() {
  show('programs');
  renderTrainingPrograms();
}

function openEditor() {
  show('editor');
  renderEditorUI();
}

function openAccessibility() {
  show('accessibility');
  renderAccessibilitySettings();
}

function openSetupFresh() {
  // Called after tutorial — show mode choice first if needed
  openSetup?.();
}

// ── ANALYTICS DASHBOARD RENDER ──
function renderAnalyticsDashboard() {
  const body = document.getElementById('analytics-body');
  if (!body) return;
  const stats = Analytics.getLifetimeStats();
  const tips = stats ? Coach.analyseLifetime(stats) : [];

  if (!stats) {
    body.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--text2);padding:2rem;text-align:center">
      No sessions recorded yet.<br><br>Complete a stage to begin tracking.
    </div>`;
    return;
  }

  const trendColors = { improving:'#39ff14', declining:'#e8291c', stable:'#f5c518' };
  const trendIcons  = { improving:'↑', declining:'↓', stable:'→' };

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1.25rem">
      ${[
        ['Lifetime Accuracy', stats.lifetime_accuracy+'%', stats.lifetime_accuracy>70?'#39ff14':stats.lifetime_accuracy>50?'#f5c518':'#e8291c'],
        ['Sessions', stats.sessions, 'var(--text)'],
        ['Avg Reaction', (stats.avg_reaction_ms/1000).toFixed(1)+'s', stats.avg_reaction_ms<5000?'#39ff14':stats.avg_reaction_ms<8000?'#f5c518':'#e8291c'],
        ['Consistency', stats.consistency+'/100', stats.consistency>70?'#39ff14':stats.consistency>50?'#f5c518':'#e8291c'],
        ['Best Accuracy', stats.bestAccuracy+'%', '#39ff14'],
        ['Best Reaction', (stats.best_reaction_ms/1000).toFixed(2)+'s', '#39ff14'],
        ['DNF Count', stats.dnfCount, stats.dnfCount>3?'#e8291c':'var(--text)'],
        ['Trend', trendIcons[stats.recentTrend]+' '+stats.recentTrend, trendColors[stats.recentTrend]]
      ].map(([l,v,c])=>`<div style="background:var(--surf);border:1px solid var(--brd2);padding:.75rem;text-align:center">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:${c};letter-spacing:1px">${v}</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);text-transform:uppercase;margin-top:2px">${l}</div>
      </div>`).join('')}
    </div>

    ${Object.keys(stats.mistakeBreakdown).length > 0 ? `
    <div style="background:var(--surf);border:1px solid var(--brd2);padding:1rem;margin-bottom:1rem">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:var(--text2);margin-bottom:.75rem">Mistake Heatmap</div>
      ${Object.entries(stats.mistakeBreakdown).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>{
        const maxN = Math.max(...Object.values(stats.mistakeBreakdown));
        const pct = Math.round((n/maxN)*100);
        const col = pct>70?'#e8291c':pct>40?'#f5c518':'#39ff14';
        return `<div style="display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid var(--brd)">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2);min-width:180px">${cat.replace(/_/g,' ')}</span>
          <div style="flex:1;height:6px;background:var(--brd2);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .5s"></div>
          </div>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:${col};min-width:24px;text-align:right">×${n}</span>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${tips.length > 0 ? `
    <div style="background:var(--surf);border:1px solid var(--brd2);padding:1rem;margin-bottom:1rem">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:var(--gold);margin-bottom:.75rem"><i class="bi bi-lightbulb"></i> Coach's Tips</div>
      ${tips.map(tip=>`<div style="background:${tip.priority==='high'?'#1a0a0a':'#1a1400'};border:1px solid ${tip.priority==='high'?'var(--red)':'var(--gold)'};padding:.75rem 1rem;margin-bottom:.5rem">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:${tip.priority==='high'?'#ff7070':'var(--gold)'};margin-bottom:.5rem">${tip.title}</div>
        <ul style="padding-left:1.1rem;margin:0">${tip.tips.map(t=>`<li style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:.2rem">${t}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>` : ''}

    <div class="pro-export-row" style="margin-top:.75rem">
      <button class="pro-export-btn" onclick="ExportSystem.exportAnalyticsCSV()"><i class="bi bi-filetype-csv pe-ico"></i><span class="pe-body"><span class="pe-title">CSV</span><span class="pe-sub">every stage, every note</span></span></button>
      <button class="pro-export-btn" onclick="ExportSystem.exportAnalyticsJSON()"><i class="bi bi-filetype-json pe-ico"></i><span class="pe-body"><span class="pe-title">JSON</span><span class="pe-sub">raw data for tools</span></span></button>
      <button class="pro-export-btn" onclick="ExportSystem.exportTrainingReport()"><i class="bi bi-clipboard-data pe-ico"></i><span class="pe-body"><span class="pe-title">TRAINING REPORT</span><span class="pe-sub">lifetime summary</span></span></button>
    </div>
  `;
}

// ── TRAINING PROGRAMS RENDER ──
function renderTrainingPrograms() {
  const body = document.getElementById('programs-body');
  if (!body) return;
  const currentLevel = TrainingProgram.getCurrentLevel();

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:1rem;font-family:'IBM Plex Mono',monospace">
      Current level: <strong style="color:var(--gold)">${currentLevel.label}</strong>
    </div>
    ${TrainingProgram.LEVELS.map(level => {
      const unlocked = TrainingProgram.isUnlocked(level.id);
      const certified = TrainingProgram.isCertified(level.id);
      const prog = TrainingProgram.progress[level.id] || {};
      return `
      <div class="training-level ${!unlocked?'locked':''} ${certified?'certified':''}">
        <div class="tl-hdr">
          <span class="tl-icon">${level.icon}</span>
          <span class="tl-label">${level.label}</span>
          <span class="tl-badge ${certified?'cert':!unlocked?'locked':'active'}">
            ${certified ? 'OK â CERTIFIED' : !unlocked ? 'LOCKED' : 'IN PROGRESS'}
          </span>
        </div>
        <div style="padding:.5rem 1rem;font-size:12px;color:var(--text2);border-bottom:1px solid var(--brd)">${level.description}</div>
        <div class="tl-drills">
          ${level.drills.map(drill => {
            const done = (prog.drillsCompleted||[]).includes(drill.id);
            return `<div class="tl-drill ${done?'done':''}">
              <span class="tl-drill-status">${done?'<i class="bi bi-check-lg"></i>':'<i class="bi bi-circle"></i>'}</span>
              <span class="tl-drill-name">${drill.name}</span>
              <span class="tl-drill-target">Target: ${drill.target.accuracy}% · ${drill.timeLimit}s</span>
            </div>`;
          }).join('')}
        </div>
        <div style="padding:.5rem 1rem;font-size:11px;color:var(--text3);font-family:'IBM Plex Mono',monospace;border-top:1px solid var(--brd)">
          Certification: ${level.certification.accuracy}% accuracy across ${level.certification.sessions} sessions
          ${prog.sessions ? ` · ${prog.sessions.filter(s=>s.accuracy>=level.certification.accuracy).length}/${level.certification.sessions} qualifying runs` : ''}
        </div>
      </div>`;
    }).join('')}
  `;
}

// ── EDITOR FUNCTIONS ──
// ============================================================================
// Recce career bridge — recce performance now feeds progression instead of
// being a mode the career ignores. XP is stored locally (works offline,
// no account needed) and mirrored into the server savefile when one exists.
// Level curve: 1 level per 250 XP. XP per session:
//   10 per successfully-called note  +  round(20 × average information)
//   + 25 perfect-session bonus.
// ============================================================================
const RecceCareer = {
  XP_PER_LEVEL: 250,
  _key: 'rpa_recce_xp',
  _load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || { total: 0, sessions: 0 }; }
    catch (e) { return { total: 0, sessions: 0 }; }
  },
  _save(d) { try { localStorage.setItem(this._key, JSON.stringify(d)); } catch (e) {} },
  getLevel() { const d = this._load(); return 1 + Math.floor(d.total / this.XP_PER_LEVEL); },
  getTotal() { return this._load().total; },
  award(summary) {
    if (!summary) return 0;
    const xp = summary.called * 10 + Math.round((summary.avgSim || 0) * 20) +
      (summary.total > 0 && summary.called === summary.total ? 25 : 0);
    const d = this._load();
    d.total += xp; d.sessions += 1;
    this._save(d);
    // Fire-and-forget server mirror (read-modify-write so we don't clobber
    // the rest of the training savefile section).
    if (typeof AccountSystem !== 'undefined' && AccountSystem.token && AccountSystem.savefile) {
      (async () => {
        try {
          const cur = await AccountSystem.loadSavefile();
          const training = (cur && AccountSystem.savefile && AccountSystem.savefile.training) || {};
          training.recce = { xpTotal: d.total, sessions: d.sessions };
          await AccountSystem.saveSavefile({ training });
        } catch (e) { /* offline / no account — local XP still counts */ }
      })();
    }
    return xp;
  },
  toast(xp) {
    const t = document.createElement('div');
    t.className = 'rpa-toast';
    t.textContent = `RECCE +${xp} XP · level ${this.getLevel()}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
};

// Called by RecceUI.renderSummary(); returns the XP earned this session.
function awardRecceXP(summary) {
  const xp = RecceCareer.award(summary);
  if (xp > 0 && typeof RecceCareer.toast === 'function') RecceCareer.toast(xp);
  return xp;
}

function renderEditorUI() {
  // Driver-style preferences panel (convention, numbering direction, units,
  // terminology — the team/driver-specific layer, saved to localStorage)
  if (typeof PacenoteConventions !== 'undefined' && PacenoteConventions.attachPreferencesUI) {
    PacenoteConventions.attachPreferencesUI('note-conventions-panel');
  }
  if (typeof NotesTiming !== 'undefined' && NotesTiming.attachTuningUI) {
    NotesTiming.attachTuningUI('timing-tuning-panel');
  }
  // Format buttons
  const fmtEl = document.getElementById('editor-format-btns');
  if (fmtEl) {
    fmtEl.innerHTML = Object.entries(PacenoteSystem.FORMATS).map(([k,f])=>`
      <button class="audio-style-btn ${PacenoteSystem.activeFormat===k?'on':''}" onclick="PacenoteSystem.setFormat('${k}');renderEditorUI()">
        ${f.label}<div style="font-size:9px;color:var(--text3);font-weight:400;letter-spacing:0;margin-top:2px">${f.description}</div>
      </button>`).join('');
  }
  // Audio style buttons
  const audEl = document.getElementById('editor-audio-btns');
  if (audEl) {
    audEl.innerHTML = Object.entries(CoDriverAudio.STYLES).map(([k,s])=>`
      <button class="audio-style-btn ${CoDriverAudio.style===k?'on':''}" onclick="CoDriverAudio.setStyle('${k}');renderEditorUI()">
        ${s.label}<div style="font-size:9px;color:var(--text3);font-weight:400;letter-spacing:0;margin-top:2px">${s.description}</div>
      </button>`).join('');
  }
  renderEditorNotes();

  // Live translation preview
  const noteInput = document.getElementById('editor-note-input');
  const preview = document.getElementById('editor-translation-preview');
  if (noteInput && preview) {
    noteInput.oninput = () => {
      const val = noteInput.value.trim();
      preview.textContent = val ? '→ ' + PacenoteSystem.translate(val) : '';
    };
  }
}

function renderEditorNotes() {
  const list = document.getElementById('editor-note-list');
  if (!list) return;
  if (!StageEditor.notes.length) {
    list.innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text3);padding:1rem;text-align:center">No notes yet. Type a note above and click Add.</div>`;
    return;
  }
  list.innerHTML = StageEditor.notes.map((n, i) => `
    <div class="editor-note-row">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text3);min-width:20px">${i+1}</span>
      <span class="editor-note-raw">${n.raw}</span>
      <span class="editor-note-trans">${n.ans}</span>
      <button class="editor-ctrl-btn" onclick="StageEditor.moveNote('${n.id}','up');renderEditorNotes()">↑</button>
      <button class="editor-ctrl-btn" onclick="StageEditor.moveNote('${n.id}','down');renderEditorNotes()">↓</button>
      <button class="editor-ctrl-btn" onclick="editorPreviewNote('${n.raw}')">▶</button>
      <button class="editor-ctrl-btn" onclick="StageEditor.removeNote('${n.id}');renderEditorNotes()" style="border-color:var(--red);color:var(--red)"><i class="bi bi-x-lg"></i></button>
    </div>`).join('');
}

function editorAddNote() {
  const input = document.getElementById('editor-note-input');
  const name = document.getElementById('editor-stage-name');
  const country = document.getElementById('editor-country');
  if (!input || !input.value.trim()) return;
  StageEditor.stageName = name?.value || 'Custom Stage';
  StageEditor.country = country?.value || 'Custom';
  StageEditor.addNote(input.value);
  input.value = '';
  document.getElementById('editor-translation-preview').textContent = '';
  renderEditorNotes();
}

function editorPreviewNote(raw) {
  CoDriverAudio.speak(PacenoteSystem.translate(raw));
}

function playCustomStage() {
  if (!StageEditor.notes.length) { alert('Add some notes first.'); return; }
  G.era = G.era || 'grpb';
  G.driver = G.driver || 'Driver';
  G.codriver = G.codriver || 'Co-driver';
  G.car = G.car || (ERAS[G.era]?.cars[0]);
  G.diff = G.diff || 1;
  G.timeLimit = DIFFS[G.diff]?.s || 9;
  beginStageWithData?.(StageEditor.toGameStage());
}

function previewCustomStage() {
  alert(`Stage: ${StageEditor.stageName}\n${StageEditor.notes.length} notes\nFirst note: ${StageEditor.notes[0]?.raw || 'none'}`);
}

function editorImport() {
  const ta = document.getElementById('editor-import-json');
  if (!ta || !ta.value.trim()) return;
  if (StageEditor.importStage(ta.value)) {
    ta.value = '';
    renderEditorNotes();
  } else {
    alert('Invalid stage JSON.');
  }
}

// ── ACCESSIBILITY SETTINGS RENDER ──
function toggleAccessibilitySetting(key) {
  Accessibility.set(key, !Accessibility.prefs[key]);
  renderAccessibilitySettings();
}

function renderAccessibilitySettings() {
  const body = document.getElementById('accessibility-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem">
      ${[
        ['timerAssist', 'Timer Assist (+3 seconds)', 'Adds 3 seconds to every note timer. Good for learning without pressure.'],
        ['highContrast', 'High Contrast Mode', 'Increases contrast ratios for better readability.'],
        ['largeText', 'Large Text', 'Increases pacenote and input text size.'],
        ['reducedMotion', 'Reduced Motion', 'Disables animations and screen shake effects.'],
        ['keyboardMode', 'Keyboard Shortcuts Visible', 'Shows keyboard shortcuts prominently in the UI.'],
      ].map(([key, label, desc]) => `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.25rem">${label}</div>
            <div style="font-size:12px;color:var(--text2)">${desc}</div>
          </div>
          <button onclick="toggleAccessibilitySetting('${key}')" style="
            padding:6px 14px;border:1px solid ${Accessibility.prefs[key]?'var(--green)':'var(--brd2)'};
            background:${Accessibility.prefs[key]?'#041a08':'none'};
            color:${Accessibility.prefs[key]?'var(--green)':'var(--text2)'};
            font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .15s">
            ${Accessibility.prefs[key] ? 'ON' : 'OFF'}
          </button>
        </div>`).join('')}

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">Timer Color</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Customize the timer arc color</div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <input type="color" id="timer-color-picker" value="${Accessibility.prefs.timerColor}" onchange="Accessibility.set('timerColor', this.value);renderAccessibilitySettings();" style="width:50px;height:30px;border:none;cursor:pointer;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text2);">${Accessibility.prefs.timerColor}</span>
        </div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">Theme</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Choose dark or light theme</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="audio-style-btn ${Accessibility.prefs.theme==='dark'?'on':''}" onclick="Accessibility.set('theme','dark');renderAccessibilitySettings()"><i class="bi bi-moon"></i> Dark</button>
          <button class="audio-style-btn ${Accessibility.prefs.theme==='light'?'on':''}" onclick="Accessibility.set('theme','light');renderAccessibilitySettings()"><i class="bi bi-sun"></i> Light</button>
        </div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">Audio Volume</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Adjust soundtrack and voice volume separately</div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:.25rem">
              <span style="font-size:12px;color:var(--text)"><i class="bi bi-music-note-beamed"></i> Soundtrack</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2)">${Math.round(Accessibility.prefs.musicVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value="${Accessibility.prefs.musicVolume}"
              onchange="Accessibility.set('musicVolume', parseFloat(this.value));Accessibility.applyAudioVolumes();renderAccessibilitySettings();"
              style="width:100%;cursor:pointer">
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:.25rem">
              <span style="font-size:12px;color:var(--text)"><i class="bi bi-mic"></i> Voice</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text2)">${Math.round(Accessibility.prefs.voiceVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value="${Accessibility.prefs.voiceVolume}"
              onchange="Accessibility.set('voiceVolume', parseFloat(this.value));Accessibility.applyAudioVolumes();renderAccessibilitySettings();"
              style="width:100%;cursor:pointer">
          </div>
        </div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">Co-driver Style</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${Object.entries(CoDriverAudio.STYLES).map(([k,s])=>`
          <button class="audio-style-btn ${CoDriverAudio.style===k?'on':''}" onclick="CoDriverAudio.setStyle('${k}');renderAccessibilitySettings()">${s.label}</button>`).join('')}
        </div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.25rem">Notation Format</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Change how pacenotes are displayed</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${Object.entries(PacenoteSystem.FORMATS).map(([k,f])=>`
          <button class="audio-style-btn ${PacenoteSystem.activeFormat===k?'on':''}" onclick="PacenoteSystem.setFormat('${k}');renderAccessibilitySettings()">${f.label}</button>`).join('')}
        </div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.25rem">Input Mode</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Choose how to submit your pacenote translations</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="audio-style-btn ${typeof INPUT_MODE!=='undefined'&&INPUT_MODE.type==='type'?'on':''}" onclick="if(typeof INPUT_MODE!=='undefined'){INPUT_MODE.type='type';INPUT_MODE.toggle();renderAccessibilitySettings();}">⌨ Type</button>
          <button class="audio-style-btn ${typeof INPUT_MODE!=='undefined'&&INPUT_MODE.type==='speak'?'on':''}" onclick="if(typeof INPUT_MODE!=='undefined'){INPUT_MODE.type='speak';INPUT_MODE.toggle();renderAccessibilitySettings();}"><i class="bi bi-mic"></i> Speak</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:.5rem">Speak mode uses voice recognition (Chrome/Edge only)</div>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.25rem">Adaptive Difficulty</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">Timer automatically adjusts based on your performance</div>
        <button onclick="AdaptiveDifficulty.enabled=!AdaptiveDifficulty.enabled;renderAccessibilitySettings()" style="
          padding:6px 14px;border:1px solid ${AdaptiveDifficulty.enabled?'var(--cyan)':'var(--brd2)'};
          background:${AdaptiveDifficulty.enabled?'rgba(0,229,255,.08)':'none'};
          color:${AdaptiveDifficulty.enabled?'var(--cyan)':'var(--text2)'};
          font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;transition:all .15s">
          ${AdaptiveDifficulty.enabled ? 'Adaptive ON' : 'Adaptive OFF'}
        </button>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">Game Mode / Training Mode</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">
          <strong style="color:var(--text)">Game Mode</strong> — Play instantly, simple feedback, fun first.<br>
          <strong style="color:var(--gold)">Training Mode</strong> — Analytics, coach's tips, structured drills, export tools. Every stage is measured and analysed.
        </div>
        <button id="mode-toggle-btn-a11y" onclick="MODE.toggle();renderAccessibilitySettings()" style="
          padding:8px 18px;border:1px solid ${MODE.isPro?'var(--gold)':'var(--brd2)'};
          background:${MODE.isPro?'#1a1400':'none'};
          color:${MODE.isPro?'var(--gold)':'var(--text2)'};
          font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:2px;cursor:pointer;transition:all .15s">
          ${MODE.isPro ? '<i class="bi bi-lightbulb"></i> Training Mode — Click to switch to Game' : '<i class="bi bi-controller"></i> Game Mode — Click to switch to Training'}
        </button>
      </div>

      <div style="background:var(--surf);border:1px solid var(--brd2);padding:.85rem 1rem">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.25rem"><i class="bi bi-chat-dots"></i> Send Feedback</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem">
          Have a suggestion, bug report, or just want to say hi? Send a message directly to the developer.
        </div>
        <button onclick="showFeedbackForm()" style="
          padding:6px 14px;border:1px solid var(--gold);
          background:#1a1400;
          color:var(--gold);
          font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;transition:all .15s">
          Send Message
        </button>
      </div>
    </div>
  `;
}

// ── SHOW PRO MENU ITEMS WHEN IN PRO MODE ──
function updateMenuForMode() {
  const analyticsBtn = document.getElementById('menu-analytics-btn');
  const programsBtn = document.getElementById('menu-programs-btn');
  if (analyticsBtn) analyticsBtn.style.display = MODE.isPro ? 'flex' : 'none';
  if (programsBtn) programsBtn.style.display = MODE.isPro ? 'flex' : 'none';
}

// Hook mode toggle to update menu
const _origModeToggle = MODE.toggle.bind(MODE);
MODE.toggle = function() {
  _origModeToggle();
  updateMenuForMode();
  AdaptiveDifficulty.enabled = this.isPro;
  renderAnalyticsOverlay();
};

// Run on init
setTimeout(updateMenuForMode, 200);

// ── FEEDBACK SYSTEM ──
function showFeedbackForm() {
  const overlay = document.createElement('div');
  overlay.id = 'feedback-overlay';
  overlay.className = 'screen active';
  overlay.style.cssText = 'z-index:10000;';
  
  overlay.innerHTML = `
    <div class="page-hdr">
      <button class="bk" onclick="document.getElementById('feedback-overlay').remove();">← Back</button>
      <div class="page-hdr-title">Send Feedback</div>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:2rem;">
      <div style="background:var(--surf2);border:1px solid var(--brd2);padding:2rem;max-width:500px;width:100%;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--gold);margin-bottom:1rem;text-align:center;"><i class="bi bi-chat-dots"></i> Send Feedback</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:1.5rem;text-align:center;">
          Your feedback helps improve the game! Send suggestions, bug reports, or just say hello.
        </div>
        
        <div style="margin-bottom:1rem;">
          <div style="font-size:12px;color:var(--text3);margin-bottom:0.5rem;">Your Name (optional):</div>
          <input type="text" id="feedback-name" placeholder="Your name or username" style="width:100%;padding:0.75rem;background:var(--surf);border:1px solid var(--brd);color:var(--text);">
        </div>
        
        <div style="margin-bottom:1rem;">
          <div style="font-size:12px;color:var(--text3);margin-bottom:0.5rem;">Your Email (optional):</div>
          <input type="email" id="feedback-email" placeholder="your@email.com" style="width:100%;padding:0.75rem;background:var(--surf);border:1px solid var(--brd);color:var(--text);">
        </div>
        
        <div style="margin-bottom:1rem;">
          <div style="font-size:12px;color:var(--text3);margin-bottom:0.5rem;">Message *</div>
          <textarea id="feedback-message" placeholder="Write your feedback here..." style="width:100%;padding:0.75rem;background:var(--surf);border:1px solid var(--brd);color:var(--text);min-height:120px;resize:vertical;font-family:inherit;"></textarea>
        </div>
        
        <div id="feedback-error" style="color:#e8291c;font-size:12px;margin-bottom:1rem;display:none;"></div>
        <div id="feedback-success" style="color:#39ff14;font-size:12px;margin-bottom:1rem;display:none;"></div>
        
        <button class="gbtn pri" onclick="sendFeedback()" style="width:100%;margin-bottom:0.5rem;">Send Feedback</button>
        <button class="gbtn" onclick="document.getElementById('feedback-overlay').remove();" style="width:100%;">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

async function sendFeedback() {
  const name = document.getElementById('feedback-name').value.trim() || 'Anonymous';
  const email = document.getElementById('feedback-email').value.trim() || 'no-reply@rallyacademy.game';
  const message = document.getElementById('feedback-message').value.trim();
  const errorDiv = document.getElementById('feedback-error');
  const successDiv = document.getElementById('feedback-success');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  if (!message || message.length < 10) {
    errorDiv.textContent = 'Please write a message (at least 10 characters)';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message })
    });
    
    const result = await response.json();
    
    if (result.success) {
      successDiv.textContent = 'OK â Feedback sent! Thank you for your input.';
      successDiv.style.display = 'block';
      document.getElementById('feedback-message').value = '';
      setTimeout(() => {
        document.getElementById('feedback-overlay').remove();
      }, 2000);
    } else {
      errorDiv.textContent = result.error || 'Failed to send feedback. Please try again.';
      errorDiv.style.display = 'block';
    }
  } catch (e) {
    errorDiv.textContent = 'Network error. Please check your connection.';
    errorDiv.style.display = 'block';
  }
}

// ── DRIVER-SPECIFIC PACENOTE PROFILES ───────────────────────────────
// Career-mode concept: different contracted drivers prefer different
// pacenote conventions. The underlying corner data never changes -- only
// which of PacenoteSystem's three FORMATS is used to render/expect the
// spoken call, plus a short in-fiction "quirk" line for the pre-stage
// briefing. This deliberately does NOT add a new numbering scale (every
// severity is still 1-6): a real 1-10 scale would mean rewriting every
// [LR][1-6] regex across scoring, voice recognition, and the tutorial --
// a much bigger architectural change than "different driver, different
// vocabulary" calls for. If a true numeric-scale-swap is wanted later,
// it needs its own pass through every consumer of raw note tokens first.
const DRIVER_PROFILES = {
  default: {
    id: 'default', name: 'Standard', format: 'wrc_standard',
    quirk: "The system you already know. Direction, then severity, then modifiers."
  },
  mikko: {
    id: 'mikko', name: 'Mikko', format: 'wrc_standard',
    quirk: "Mikko calls it straight — no surprises. Standard notation, but he wants cautions called early and loud."
  },
  reko: {
    id: 'reko', name: 'Reko', format: 'jemba',
    quirk: "Reko trained with a WRC2 team and never switched back. Expect 'C' instead of '!', and '>' instead of INTO."
  },
  elin: {
    id: 'elin', name: 'Elin', format: 'roadbook',
    quirk: "Elin came up on road rallies, not stage rallies. She wants full words — 'Hairpin', not '1'. No shorthand on the intercom."
  }
};

const DriverProfileSystem = {
  activeProfile: 'default',
  setProfile(id) {
    const profile = DRIVER_PROFILES[id] || DRIVER_PROFILES.default;
    this.activeProfile = profile.id;
    PacenoteSystem.setFormat(profile.format);
    return profile;
  },
  getProfile(id) {
    return DRIVER_PROFILES[id] || DRIVER_PROFILES.default;
  },
  reset() {
    this.setProfile('default');
  }
};

// ── LEGENDARY NAME RECOGNITION SYSTEM ───────────────────────────────
// Section 6: Guardrails - Profanity blocklist + silent fallback
// This is the safety net for everything below - check before any name processing

const PROFANITY_BLOCKLIST = [
  // Common profanity and offensive terms
  "fuck", "shit", "ass", "bitch", "bastard", "damn", "hell", "crap",
  "dick", "piss", "cock", "pussy", "cunt", "whore", "slut", "fag",
  "nigger", "nigga", "chink", "spic", "kike", "gook", "wetback",
  "retard", "retarded", "retard", "mong", "spastic",
  // Variations and common misspellings
  "fuk", "sh1t", "azz", "b1tch", "d1ck", "f4g", "n1gger"
];

// Check if a name contains blocked content (silent fallback - returns true if blocked)
function isNameBlocked(fullName) {
  if (!fullName) return false;
  const lowerName = fullName.toLowerCase();
  return PROFANITY_BLOCKLIST.some(blocked => lowerName.includes(blocked));
}

// System 3: Broad "nag" tier - ~50 rally surnames with generic reactions
// This is the cheapest win - one-time random line on name confirmation
const KNOWN_RALLY_SURNAMES = [
  "mcrae", "burns", "sainz", "makinen", "gronholm", "loeb", "ogier",
  "rovanpera", "tanak", "neuville", "evans", "breen", "meeke", "latvala",
  "hirvonen", "solberg", "henning", "oliver", "kankkunen", "vatanen",
  "mikkola", "waldegard", "rohrl", "blomqvist", "alen", "salonen",
  "biasion", "auriol", "delecour", "liatti", "schwarz", "loubet", "saby",
  "eriksson", "alister", "arai", "galli", "loix", "harri", "stohl",
  "pons", "panizzi", "bugalski", "aghini", "munari", "aaltonen",
  "andersson", "clark", "buffum", "mouton", "mikkelsen", "suninen",
  "lappi", "katsuta", "fourmaux", "loubet", "greensmith", "block"
];

const NAG_LINES = [
  "That's a real name. You know that, right?",
  "{name} on the entry list. Bold choice. We'll see if it holds up.",
  "Big shoes. Let's see if you fill them.",
  "Huh. Didn't expect to see that name again.",
  "Sure. And I'm Colin McRae's co-driver too.",
  "Somewhere, a rally historian just felt a disturbance."
];

// System 1: Tier S legends with bespoke reactions
// Tone guardrail: homage, never mockery of real death or tragedy
const LEGEND_NAMES = {
  "burns": {
    tier: "S",
    cleanRunLine: "Co-driver, quietly: 'Burns. Good name to drive under.'",
    crashLine: null, // deliberately no crash-specific line for tragedy-adjacent names
    milestoneAchievement: "living_up_to_the_name"
  },
  "loeb": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Nine titles. No pressure.'",
    crashLine: "Co-driver mutters: 'Nine world titles and you still found a tree.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mcrae": {
    tier: "S",
    cleanRunLine: "Co-driver: 'McRae. Flat out, every time. You'd have made him proud.'",
    crashLine: "Co-driver: 'Even the greats found trees. You're in good company.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "ogier": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Eight titles and counting. You've got seven to go.'",
    crashLine: "Co-driver: 'Eight titles and you still found a tree. Impressive.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "gronholm": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Grönholm. Fast and mouthy — you've got the fast part down, anyway.'",
    crashLine: "Co-driver: 'Even the Flying Finn had bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "sainz": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Sainz. El Matador rides again. Nice and clean.'",
    crashLine: "Co-driver: 'Even El Matador had off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "makinen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mäkinen. Four in a row was his number. One clean stage is a start.'",
    crashLine: "Co-driver: 'Even the Ice Man slipped sometimes.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "solberg": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Solberg. The showman. All fists and flags. You kept it quiet today.'",
    crashLine: "Co-driver: 'Even champions have bad stages.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "vatanen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Vatanen. 1981 champion, and he did it his way. So did you, evidently.'",
    crashLine: "Co-driver: 'Even legends had rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "rovanpera": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Rovanperä. Youngest champion in history. No rush, you've got time.'",
    crashLine: "Co-driver: 'Even the youngest champion finds trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  // Batch 2 - Additional legendary drivers (51-100)
  "toivonen": {
    tier: "S",
    cleanRunLine: "Co-driver, quietly: 'Henri Toivonen. One of the fastest to ever sit in a rally car. This one's for him.'",
    crashLine: null, // tragedy-adjacent - Group B era death
    milestoneAchievement: "living_up_to_the_name"
  },
  "cresto": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Sergio Cresto — the notes were his. Read them well.'",
    crashLine: null, // tragedy-adjacent - Group B era death
    milestoneAchievement: "living_up_to_the_name"
  },
  "bettega": {
    tier: "S",
    cleanRunLine: "Co-driver, quietly: 'Attilio Bettega. Italian speed, gone too soon. Respect the name.'",
    crashLine: null, // tragedy-adjacent
    milestoneAchievement: "living_up_to_the_name"
  },
  "breen": {
    tier: "S",
    cleanRunLine: "Co-driver, quietly: 'Craig Breen. Fast, warm, gone too soon. That one's for him.'",
    crashLine: null, // tragedy-adjacent
    milestoneAchievement: "living_up_to_the_name"
  },
  "tanak": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Tänak. Estonian precision. That was tidy.'",
    crashLine: "Co-driver: 'Even Estonian precision has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "neuville": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Neuville. Thierry's famous for finishing second. You just finished first.'",
    crashLine: "Co-driver: 'Even second-place specialists have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "evans": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Evans. Welsh, consistent, and clean today. He'd approve.'",
    crashLine: "Co-driver: 'Even Welsh consistency has rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "meeke": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Meeke. Kris Meeke drove like he had nothing to lose. So did you, apparently.'",
    crashLine: "Co-driver: 'Even aggressive drivers find trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "latvala": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Latvala. Longest-serving young gun in the business. You'll do.'",
    crashLine: "Co-driver: 'Even the longest-serving young guns have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "hirvonen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Hirvonen. So close to a title, so many times. This stage, though — clean.'",
    crashLine: "Co-driver: 'Even title contenders have bad stages.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "kankkunen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Kankkunen. Four titles across three decades. Consistency like that starts somewhere.'",
    crashLine: "Co-driver: 'Even four-time champions have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mikkola": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mikkola. One of the greats before it was even called the World Championship.'",
    crashLine: "Co-driver: 'Even the pioneers had rough days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "waldegard": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Waldegård. The very first World Champion. No pressure carrying that one.'",
    crashLine: "Co-driver: 'Even the first champion found trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "rohrl": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Röhrl. Precision over speed, always. That stage had both.'",
    crashLine: "Co-driver: 'Even precision drivers have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "blomqvist": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Blomqvist. 1984, and never rattled. Neither were you.'",
    crashLine: "Co-driver: 'Even unflappable drivers have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "alen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Alén. Fast enough to scare champions, never quite champion himself. You've got one up on him already.'",
    crashLine: "Co-driver: 'Even championship contenders have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "salonen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Salonen. Quiet, methodical, two titles to show for it.'",
    crashLine: "Co-driver: 'Even methodical drivers have bad stages.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "biasion": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Biasion. Two titles, ice in his veins. That run had some of that.'",
    crashLine: "Co-driver: 'Even ice-cold champions have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "auriol": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Auriol. French flair, two titles worth of it.'",
    crashLine: "Co-driver: 'Even French flair has rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "delecour": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Delecour. Aggressive to a fault, but fast with it. Sound familiar?'",
    crashLine: "Co-driver: 'Even aggressive drivers find trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mouton": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mouton. Michèle Mouton — still the only woman ever this close to a WRC title. Respect the name.'",
    crashLine: "Co-driver: 'Even legends have difficult days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mikkelsen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mikkelsen. Andreas Mikkelsen, Norwegian consistency. That stage had it.'",
    crashLine: "Co-driver: 'Even consistent drivers have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "katsuta": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Katsuta. Takamoto Katsuta, flying Japan's flag at the top level.'",
    crashLine: "Co-driver: 'Even Japanese stars have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "lappi": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Lappi. Esapekka Lappi. Rally winner, rallycross winner, does it all.'",
    crashLine: "Co-driver: 'Even versatile drivers have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "suninen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Suninen. Teemu Suninen — young, fast, still writing the story.'",
    crashLine: "Co-driver: 'Even young fast drivers find trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "kubica": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Kubica. Robert Kubica. F1 star, then rally star. Different kind of fearless.'",
    crashLine: "Co-driver: 'Even fearless drivers have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "sordo": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Sordo. Dani Sordo. Never quite champion, always somehow still there.'",
    crashLine: "Co-driver: 'Even perennial contenders have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "ostberg": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Østberg. Mads Østberg. Norwegian speed, never afraid to attack.'",
    crashLine: "Co-driver: 'Even Norwegian speed finds trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mehta": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mehta. Shekhar Mehta — Safari Rally royalty. That stage had some of that grit.'",
    crashLine: "Co-driver: 'Even Safari royalty has bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "carlsson": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Carlsson. Erik Carlsson — Mr. Saab himself. RAC and Monte, more than once.'",
    crashLine: "Co-driver: 'Even Mr. Saab had off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "aaltonen": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Aaltonen. Rauno Aaltonen — the Flying Finn who started the whole Flying Finn thing.'",
    crashLine: "Co-driver: 'Even the original Flying Finn had rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "munari": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Munari. Sandro Munari, before the championship even had the name WRC. Legend status.'",
    crashLine: "Co-driver: 'Even legends have difficult days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "ragnotti": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Ragnotti. Jean Ragnotti. Ask any French fan about the handbrake turns. They'll know.'",
    crashLine: "Co-driver: 'Even handbrake artists have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "darniche": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Darniche. Bernard Darniche — Tour de Corse was basically his address.'",
    crashLine: "Co-driver: 'Even tarmac specialists have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "airikkala": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Airikkala. Pentti Airikkala — RAC winner, proper Finnish pace.'",
    crashLine: "Co-driver: 'Even Finnish pace has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "clark": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Clark. Roger Clark, British rallying's first hero. Home advantage, maybe.'",
    crashLine: "Co-driver: 'Even British heroes have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "buffum": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Buffum. John Buffum, American rally royalty. Not many can say that.'",
    crashLine: "Co-driver: 'Even American royalty has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "toivonenp": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Toivonen. Henri's father, champion in his own right, decades before. The name runs deep.'",
    crashLine: "Co-driver: 'Even champions have difficult days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "mcraej": {
    tier: "S",
    cleanRunLine: "Co-driver: 'McRae. Colin's father — five-time British champion before Colin ever sat in a car.'",
    crashLine: "Co-driver: 'Even champions have bad stages.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "pond": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Pond. Tony Pond. British rallying doesn't talk about him enough.'",
    crashLine: "Co-driver: 'Even underrated drivers have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "chatriot": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Chatriot. François Chatriot — French tarmac craft, old school.'",
    crashLine: "Co-driver: 'Even old-school tarmac specialists have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "warmbold": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Warmbold. Achim Warmbold, one of the sport's earliest true internationals.'",
    crashLine: "Co-driver: 'Even pioneers have rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "nicolas": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Nicolas. Jean-Pierre Nicolas. Alpine-Renault glory days.'",
    crashLine: "Co-driver: 'Even glory days have rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "beguin": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Béguin. Bernard Béguin. Another French tarmac specialist who knew every apex.'",
    crashLine: "Co-driver: 'Even tarmac specialists have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "frequelin": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Frequelin. Guy Frequelin — consistent, sharp, a proper professional's professional.'",
    crashLine: "Co-driver: 'Even professionals have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "fourmaux": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Fourmaux. Adrien Fourmaux — young, aggressive, still figuring it out. Aren't we all.'",
    crashLine: "Co-driver: 'Even young aggressive drivers find trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "loubet": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Loubet. Pierre-Louis Loubet. Tarmac specialist, still climbing.'",
    crashLine: "Co-driver: 'Even climbing specialists have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "greensmith": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Greensmith. Gus Greensmith — British grit, still writing the story.'",
    crashLine: "Co-driver: 'Even British grit has rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "lefebvre": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Lefebvre. Stéphane Lefebvre — Junior champion turned full-timer.'",
    crashLine: "Co-driver: 'Even junior champions have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "ingram": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Ingram. Chris Ingram. European champion, quietly excellent.'",
    crashLine: "Co-driver: 'Even quiet excellence has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "kajetanowicz": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Kajetanowicz. Kajetan Kajetanowicz — Poland's rally hero, several European titles deep.'",
    crashLine: "Co-driver: 'Even heroes have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "basso": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Basso. Giandomenico Basso — Italian tarmac royalty.'",
    crashLine: "Co-driver: 'Even Italian royalty has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "novikov": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Novikov. Evgeny Novikov. Fast, occasionally chaotic. You'll know if that's accurate.'",
    crashLine: "Co-driver: 'Even fast chaotic drivers find trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "wilks": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Wilks. Guy Wilks — British, sharp on tarmac, underrated.'",
    crashLine: "Co-driver: 'Even underrated drivers have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "duval": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Duval. François Duval — Junior champion, Belgian speed.'",
    crashLine: "Co-driver: 'Even Belgian speed finds trees.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "wilson": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Wilson. Matthew Wilson — part of a proper rallying family.'",
    crashLine: "Co-driver: 'Even rallying families have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "camilli": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Camilli. Bryan Camilli — Monaco's own, making his mark.'",
    crashLine: "Co-driver: 'Even Monaco stars have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "alqassimi": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Al Qassimi. Khalid Al Qassimi — flying the UAE flag at world level.'",
    crashLine: "Co-driver: 'Even flag-bearers have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "puras": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Puras. Jesús Puras — Spanish tarmac ace, long, steady career.'",
    crashLine: "Co-driver: 'Even steady careers have rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "andruet": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Andruet. Jean-Claude Jiclo Andruet — European champion, proper old-school flair.'",
    crashLine: "Co-driver: 'Even old-school flair has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "kallstrom": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Källström. Harry Källström — Swedish, Monte Carlo and RAC winner both.'",
    crashLine: "Co-driver: 'Even Swedish winners have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "timo": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Mäkinen, Timo. The original Flying Finn, decades before Tommi.'",
    crashLine: "Co-driver: 'Even original Flying Finns had rough patches.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "trana": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Trana. Tom Trana — Swedish rally, before most of this list existed.'",
    crashLine: "Co-driver: 'Even pioneers have difficult days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "aitkenwalker": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Aitken-Walker. Louise Aitken-Walker — a trailblazer for women in the sport.'",
    crashLine: "Co-driver: 'Even trailblazers have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "ickx": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Ickx. Vanina Ickx. Racing runs in that family, on gravel and tarmac both.'",
    crashLine: "Co-driver: 'Even racing families have off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "prokop": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Prokop. Martin Prokop — Czech rally, steady hands.'",
    crashLine: "Co-driver: 'Even steady hands have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "solans": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Solans. Nil Solans — young Spanish talent, still climbing the ranks.'",
    crashLine: "Co-driver: 'Even climbing talent has off-days.'",
    milestoneAchievement: "living_up_to_the_name"
  },
  "bouffier": {
    tier: "S",
    cleanRunLine: "Co-driver: 'Bouffier. Bryan Bouffier — French tarmac specialist, ERC-tested.'",
    crashLine: "Co-driver: 'Even tarmac specialists have bad days.'",
    milestoneAchievement: "living_up_to_the_name"
  }
};

const NameRecognitionSystem = {
  legendFlag: null,
  
  // Extract surname from full name (handles "Mr Burns", "burns", etc.)
  extractSurname(fullName) {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
  },
  
  // Check if name matches a legend or known rally surname
  checkNameReaction(fullName) {
    // Guardrail: Silent fallback for blocked names
    if (isNameBlocked(fullName)) {
      return null; // Silent fallback - no reaction for blocked names
    }
    
    const surname = this.extractSurname(fullName);
    if (!surname) return null;
    
    // Check Tier S legends first (bespoke reactions)
    if (LEGEND_NAMES[surname]) {
      return { tier: "S", data: LEGEND_NAMES[surname], surname };
    }
    
    // Check broad nag list (generic reactions)
    if (KNOWN_RALLY_SURNAMES.includes(surname)) {
      const line = NAG_LINES[Math.floor(Math.random() * NAG_LINES.length)];
      const formattedLine = line.replace("{name}", surname.charAt(0).toUpperCase() + surname.slice(1));
      return { tier: "nag", line: formattedLine, surname };
    }
    
    return null;
  },
  
  // Get reaction line for specific context (clean run, crash, etc.)
  getReactionLine(context) {
    if (!this.legendFlag || this.legendFlag.tier !== "S") return null;
    
    const data = this.legendFlag.data;
    switch (context) {
      case "cleanRun":
        return data.cleanRunLine;
      case "crash":
        return data.crashLine; // may be null for tragedy-adjacent names
      default:
        return null;
    }
  },
  
  // Check and cache legend flag on crew name confirmation
  checkCrewNames(driverName, coDriverName) {
    const driverReaction = this.checkNameReaction(driverName);
    const coDriverReaction = this.checkNameReaction(coDriverName);
    
    // Cache driver reaction if it's a Tier S legend (nag tier doesn't need caching)
    if (driverReaction && driverReaction.tier === "S") {
      this.legendFlag = driverReaction;
    } else if (coDriverReaction && coDriverReaction.tier === "S") {
      this.legendFlag = coDriverReaction;
    } else {
      this.legendFlag = null;
    }
    
    return { driverReaction, coDriverReaction };
  },
  
  reset() {
    this.legendFlag = null;
  }
};
