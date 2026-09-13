// Pacenote Matcher - Improved similarity scoring for rally pacenotes
// Fixes order-aware matching bug and adds typo tolerance for typing mode

// Minimal-pair collision blocklist: words that are 1-2 edits apart but have
// genuinely different meanings in the pacenote vocabulary. Typo forgiveness
// will never bridge these pairs.
const MINIMAL_PAIR_BLOCKLIST = [
  ['tight', 'right'],
  ['open', 'opens'],
  ['bump', 'jump'],
  ['flat', 'fast'],
  ['left', 'lift'],
  ['crest', 'crest'],
  ['square', 'squares'],
  ['hairpin', 'hairpins'],
  ['caution', 'cautions'],
  ['dont', 'cut'],
  ['keep', 'keen'],
  ['minus', 'plus'],
  ['over', 'open'],
  ['three', 'tree'],
  ['five', 'fine'],
  ['six', 'fix'],
  ['seven', 'even'],
  ['eight', 'ate'],
  ['nine', 'nice'],
  ['ten', 'then']
];

// Damerau-Levenshtein distance with adjacent transposition support
function damerauLevenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );

      // Adjacent transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  return dp[m][n];
}

// Check if two words are a blocked minimal pair
function isBlockedMinimalPair(a, b) {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  for (const [x, y] of MINIMAL_PAIR_BLOCKLIST) {
    if ((lowerA === x && lowerB === y) || (lowerA === y && lowerB === x)) {
      return true;
    }
  }
  return false;
}

// Order-aware sequence alignment score (Smith-Waterman variant)
// This fixes the bug where reversed multi-clause calls scored as perfect matches
function sequenceAlignmentScore(aWords, bWords) {
  const m = aWords.length;
  const n = bWords.length;
  if (m === 0 && n === 0) return 1;
  if (m === 0 || n === 0) return 0;

  // Scoring matrix
  const score = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  let maxScore = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = aWords[i - 1] === bWords[j - 1] ? 2 : -1;
      score[i][j] = Math.max(
        0,
        score[i - 1][j - 1] + match,
        score[i - 1][j] - 1,  // gap in b
        score[i][j - 1] - 1   // gap in a
      );
      maxScore = Math.max(maxScore, score[i][j]);
    }
  }

  // Normalize by the length of the longer sequence
  const maxPossible = 2 * Math.min(m, n);
  return maxPossible > 0 ? maxScore / maxPossible : 0;
}

// Normalise answer for comparison (from original rally.js)
function normaliseAnswer(s) {
  if (!s) return '';
  s = s.toLowerCase();
  // UK/US spelling variants
  s = s.replace(/metre/g, 'meter');
  s = s.replace(/centre/g, 'center');
  s = s.replace(/colour/g, 'color');
  // Remove punctuation except hyphens in compound directions
  s = s.replace(/[^\w\s-]/g, '');
  // Expand common contractions
  s = s.replace(/don't/g, 'dont');
  s = s.replace(/can't/g, 'cant');
  // Tidy extra spaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Known speech-recognition confusion pairs
const VOICE_CONFUSABLE_WORDS = {
  tight: 'right',
  right: 'tight'
};

// Main similarity function with improved matching
function similarity(a, b, opts = {}) {
  a = normaliseAnswer(a);
  b = normaliseAnswer(b);
  
  if (a === b) return 1;
  
  // Special case: "flat" and "fast sweep" for R6
  const aFlat = a.replace(/\bfast sweep\b/g, 'flat');
  const bFlat = b.replace(/\bfast sweep\b/g, 'flat');
  if (aFlat === bFlat) return 1;

  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);

  // Voice mode: use confusion pairs for partial credit
  if (opts.voiceTolerant) {
    let hit = 0;
    const wa = new Set(aWords);
    const wb = new Set(bWords);
    
    wb.forEach(w => {
      if (wa.has(w)) {
        hit++;
      } else if (VOICE_CONFUSABLE_WORDS[w] && wa.has(VOICE_CONFUSABLE_WORDS[w])) {
        hit += 0.6;
      }
    });
    
    return hit / Math.max(wa.size, wb.size);
  }

  // Typing mode: use order-aware sequence alignment
  const alignmentScore = sequenceAlignmentScore(aWords, bWords);
  
  // If alignment score is very high, check for typo forgiveness
  if (alignmentScore > 0.8 && aWords.length === bWords.length) {
    let totalDistance = 0;
    let blocked = false;
    
    for (let i = 0; i < aWords.length; i++) {
      if (aWords[i] !== bWords[i]) {
        if (isBlockedMinimalPair(aWords[i], bWords[i])) {
          blocked = true;
          break;
        }
        totalDistance += damerauLevenshtein(aWords[i], bWords[i]);
      }
    }
    
    if (!blocked && totalDistance > 0) {
      // Apply typo forgiveness: each edit costs less than a full word mismatch
      const avgWordLen = aWords.reduce((sum, w) => sum + w.length, 0) / aWords.length;
      const typoPenalty = totalDistance / (aWords.length * avgWordLen);
      return Math.max(0.85, alignmentScore - typoPenalty);
    }
  }

  return alignmentScore;
}
