// Story System - RPG/Visual Novel mechanics for Rally Pacenote Academy
// Handles narrative scenes, dialogue choices, and relationship tracking

// Debug: Check if StoryData is available
if (typeof StoryData === 'undefined') {
  console.error('StoryData is not loaded! Make sure story_data.js is loaded before story_system.js');
  // Create empty placeholder to prevent errors
  window.StoryData = { male: {}, female: {} };
} else {
  console.log('StoryData loaded successfully');
}

// Returns a fresh copy of the default story state shape. Used both to
// initialize StorySystem.state and to fill in any fields missing from an
// older save (see StorySystem.init() / deepMergeDefaults below).
function getDefaultStoryState() {
  return {
    genderRoute: null, // 'male' or 'female'
    themeArc: null,    // 'street' | 'roadbook' | null(=classic WRC, cockpit theme)
    careerTheme: null, // theme LOCKED at route selection for this career run
    chapter: 1,
    stageIndex: 0,

    stats: {
      driverTrust: 50,
      teamRespect: 50,
      reputation: 50,
      mentalStress: 0,
      grit: 0,
      legacy: 0,
    },

    factionReputation: {
      factoryTeams: 50,
      privateers: 50,
      progressives: 50,
      oldGuard: 50,
      mediaMachine: 50
    },

    relationships: {
      driverSober: false,
      girlfriendHostile: false,
      mechanicBond: 0,
      saraImpressed: false,
    },

    flags: {
      sawGirlfriendConfrontation: false,
      blamedForCrash: false,
      defendedDriver: false,
      usedToughLove: false,
      alignedWithFactory: false,
      alignedWithPrivateers: false,
      alignedWithProgressives: false,
      alignedWithOldGuard: false,
      savedMerchant: false,
      betrayedFaction: null,
      helpedRival: false,
      ignoredConflict: false
    },

    driverState: {
      drunk: false,
      shaken: false,
      motivated: false,
      injured: false,
    },

    consequenceHistory: []
  };
}

// Recursively fills in any keys missing from `saved` using values from
// `defaults`, without discarding anything already present in `saved`.
// This is what lets old localStorage saves survive new fields being added
// to the state shape (e.g. consequenceHistory) instead of crashing with
// "Cannot read properties of undefined" the first time a new field is used.
function deepMergeDefaults(saved, defaults) {
  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  if (!isPlainObject(saved)) {
    // Saved value is missing, an array, or a primitive that doesn't need
    // merging — arrays (like consequenceHistory) are taken as-is from
    // saved if present, otherwise fall back to the default entirely.
    return saved !== undefined ? saved : defaults;
  }

  const merged = { ...saved };
  Object.keys(defaults).forEach((key) => {
    if (!(key in merged) || merged[key] === undefined) {
      merged[key] = defaults[key];
    } else if (isPlainObject(defaults[key])) {
      merged[key] = deepMergeDefaults(merged[key], defaults[key]);
    }
  });
  return merged;
}

const StorySystem = {
  // Skill system - skills create new possibilities rather than just being doors
  skills: {
    speech: 0,        // Opens conversations, persuades NPCs
    medicine: 0,      // Reveals medical information about driver health
    engineering: 0,  // Understands technical issues, can suggest repairs
    perception: 0,   // Notices hidden details, environmental clues
    survival: 0,     // Identifies resources, predicts dangerous conditions
    stealth: 0,      // Changes infiltration possibilities, hears private conversations
    intelligence: 0, // Understands complex information, sees patterns
  },
  
  // Check if a skill level is sufficient for a check
  checkSkill(skillName, requiredLevel) {
    return this.skills[skillName] >= requiredLevel;
  },
  
  // Add skill points (called during character creation or as rewards)
  addSkillPoints(skillName, points) {
    this.skills[skillName] = Math.min(100, this.skills[skillName] + points);
    this.save();
  },
  
  // Get skill-based dialogue options - adds new choices based on skills
  getSkillBasedChoices(baseChoices, context) {
    const enhancedChoices = [...baseChoices];
    
    // Speech skill: Persuasion options
    if (this.skills.speech >= 30 && context.canPersuade) {
      enhancedChoices.push({
        text: '[Speech] Convince them to see it your way',
        consequence: {
          text: 'Your words find their mark. Sometimes persuasion isn\'t about arguments—it\'s about understanding what someone actually needs.',
          stats: { reputation: 5 },
          flags: { speechSuccess: true }
        },
        condition: (ctx) => StorySystem.skills.speech >= 30
      });
    }
    
    // Engineering skill: Technical solutions
    if (this.skills.engineering >= 40 && context.technicalProblem) {
      enhancedChoices.push({
        text: '[Engineering] Propose a technical solution',
        consequence: {
          text: 'You see the problem before they finish explaining it. The solution is elegant, practical, and completely different from what they expected.',
          stats: { teamRespect: 10, reputation: 5 },
          flags: { engineeringSuccess: true }
        },
        condition: (ctx) => StorySystem.skills.engineering >= 40
      });
    }
    
    // Perception skill: Notice hidden details
    if (this.skills.perception >= 25 && context.hiddenDetails) {
      enhancedChoices.push({
        text: '[Perception] Notice something others missed',
        consequence: {
          text: 'There it is—the detail everyone else walked past. Sometimes the most important information is the stuff nobody thinks to mention.',
          stats: { reputation: 10 },
          flags: { perceptionSuccess: true, discoveredHiddenInfo: true }
        },
        condition: (ctx) => StorySystem.skills.perception >= 25
      });
    }
    
    // Medicine skill: Health insights
    if (this.skills.medicine >= 35 && context.medicalContext) {
      enhancedChoices.push({
        text: '[Medicine] Assess the physical condition',
        consequence: {
          text: 'You see what they\'re trying to hide. The tension in their shoulders, the slight favoring of one side, the way they move when they think nobody\'s watching.',
          stats: { driverTrust: 10, mentalStress: -5 },
          flags: { medicalInsight: true }
        },
        condition: (ctx) => StorySystem.skills.medicine >= 35
      });
    }
    
    // Intelligence skill: Pattern recognition
    if (this.skills.intelligence >= 50 && context.complexSituation) {
      enhancedChoices.push({
        text: '[Intelligence] See the pattern in the chaos',
        consequence: {
          text: 'It\'s not random. It never is. Once you see the pattern, the chaos becomes strategy.',
          stats: { reputation: 15, mentalStress: -10 },
          flags: { patternRecognized: true }
        },
        condition: (ctx) => StorySystem.skills.intelligence >= 50
      });
    }
    
    return enhancedChoices;
  },
  
  // Filter choices based on conditions (including skill checks)
  filterChoices(choices, context) {
    return choices.filter(choice => {
      if (!choice.condition) return true;
      try {
        return choice.condition(context);
      } catch (e) {
        console.error('Error evaluating choice condition:', e);
        return true;
      }
    });
  },
  
  // Information discovery system - players investigate to learn truth
  discoveredInformation: {
    // Track what the player has learned about various situations
    // Information can be contradictory, requiring players to decide what to believe
    learnedFacts: [],
    conflictingAccounts: [],
    verifiedInformation: [],
    rumorsHeard: []
  },
  
  // Add discovered information
  addDiscoveredInfo(type, information, source, reliability) {
    const infoEntry = {
      type, // 'fact', 'rumor', 'conflict', 'verified'
      information,
      source,
      reliability, // 0-100, how reliable this source is
      timestamp: Date.now()
    };
    
    if (type === 'fact') {
      this.discoveredInformation.learnedFacts.push(infoEntry);
    } else if (type === 'rumor') {
      this.discoveredInformation.rumorsHeard.push(infoEntry);
    } else if (type === 'conflict') {
      this.discoveredInformation.conflictingAccounts.push(infoEntry);
    } else if (type === 'verified') {
      this.discoveredInformation.verifiedInformation.push(infoEntry);
    }
    
    this.save();
  },
  
  // Get conflicting information about a topic
  getConflictingAccounts(topic) {
    return this.discoveredInformation.conflictingAccounts.filter(
      info => info.topic === topic
    );
  },
  
  // Check if player has enough information to make an informed decision
  hasEnoughInformation(topic, threshold = 2) {
    const relevantFacts = this.discoveredInformation.learnedFacts.filter(
      info => info.topic === topic
    );
    const relevantRumors = this.discoveredInformation.rumorsHeard.filter(
      info => info.topic === topic
    );
    
    return (relevantFacts.length + relevantRumors.length) >= threshold;
  },
  
  // Companion system - companions have opinions and can conflict
  companions: {
    // Each companion has opinions on choices and can react
    currentCompanion: null,
    companionStates: {},
    availableCompanions: {
      jorge: {
        name: 'Jorge',
        role: 'Mechanic',
        worldview: 'Pragmatic traditionalist - believes in machines over people, but respects those who prove themselves',
        opinions: {
          factoryTeams: -20, // Distrusts corporate control
          privateers: 30,    // Respects the underdog mentality
          riskTaking: -10,   // Prefers reliability over heroics
          technicalSolutions: 40 // Values engineering skill
        },
        relationshipLevel: 0, // 0-100
        flags: {
          hasWorkedWithFactory: false,
          savedPlayerLife: false,
          betrayedPlayer: false
        }
      },
      elena: {
        name: 'Elena',
        role: "Driver's Girlfriend",
        worldview: 'Protective realist - will do anything to keep Mikko alive, even if it means making him retire',
        opinions: {
          safety: 50,         // Values safety above all
          ambition: -20,      // Worried about the cost of winning
          trust: 30,          // Wants to trust but has been burned
          confrontation: -10  // Prefers calculation over conflict
        },
        relationshipLevel: 0,
        flags: {
          askedForHelp: false,
          rejectedAdvice: false,
          sawVulnerability: false
        }
      },
      sara: {
        name: 'Sara',
        role: 'Engineer',
        worldview: 'Technical progressive - believes innovation and safety can coexist, wants to prove women belong in engineering',
        opinions: {
          progressives: 40,  // Aligns with technical advancement
          tradition: -20,    // Rejects "that's how we've always done it"
          competence: 50,    // Values skill over everything
          gender: 30         // Has experienced discrimination, wants to prove others wrong
        },
        relationshipLevel: 0,
        flags: {
          facedDiscrimination: false,
          provenCompetence: false,
          mentoredPlayer: false
        }
      },
      laurent: {
        name: 'Laurent',
        role: 'Rival Driver',
        worldview: 'Philosophical competitor - sees racing as a mirror for life, respects the journey more than the destination',
        opinions: {
          competition: 30,    // Values fair competition
          wisdom: 40,        // Respects those who learn from mistakes
          arrogance: -30,    // Dislikes ego-driven drivers
          authenticity: 50   // Values being true to oneself
        },
        relationshipLevel: 0,
        flags: {
          sharedWisdom: false,
          competedFairly: false,
          learnedFromPlayer: false
        }
      }
    }
  },
  
  // Add companion reaction to a choice
  addCompanionReaction(companionId, reactionType, intensity) {
    const companion = this.companions.availableCompanions[companionId];
    if (!companion) return;
    
    // Adjust relationship based on reaction
    if (reactionType === 'approve') {
      companion.relationshipLevel = Math.min(100, companion.relationshipLevel + intensity);
    } else if (reactionType === 'disapprove') {
      companion.relationshipLevel = Math.max(0, companion.relationshipLevel - intensity);
    }
    
    // Check for companion departure thresholds
    if (companion.relationshipLevel < 20 && !companion.flags.warnedAboutLeaving) {
      companion.flags.warnedAboutLeaving = true;
      return 'warning';
    } else if (companion.relationshipLevel < 10) {
      return 'departure';
    }
    
    this.save();
    return 'normal';
  },
  
  // Get companion commentary on a situation
  getCompanionCommentary(companionId, situationType) {
    const companion = this.companions.availableCompanions[companionId];
    if (!companion || companion.relationshipLevel < 30) return null;
    
    const commentaries = {
      jorge: {
        technical: "You see the problem. Most people just see the symptom.",
        risk: "Brave or stupid? The line between them is thinner than you think.",
        trust: "Machines don't lie. People do. The trick is knowing which is which.",
        failure: "Every failure teaches something. The question is whether you're listening."
      },
      elena: {
        safety: "I've seen what happens when the calculation goes wrong. I won't see it again.",
        trust: "Trust isn't given. It's earned. And it can be lost in a single note.",
        love: "I love him. That doesn't mean I'll let him destroy himself.",
        sacrifice: "Some things are worth the cost. The question is whether this is one of them."
      },
      sara: {
        innovation: "The old ways work. The new ways work better. Prove it.",
        discrimination: "They told me I didn't belong. I showed them they were wrong.",
        competence: "I don't need you to believe in me. I need you to get out of my way.",
        success: "This isn't about proving them wrong. It's about proving myself right."
      },
      laurent: {
        competition: "I'm not racing you. I'm racing the version of myself that settles for second.",
        wisdom: "The fastest driver isn't the one who wins. It's the one who learns the most.",
        authenticity: "Be yourself. The other versions are already taken.",
        legacy: "When they remember you, what will they remember? The winning? Or the way you won?"
      }
    };
    
    return commentaries[companionId]?.[situationType] || null;
  },
  
  // Check for companion conflicts
  checkCompanionConflicts() {
    const activeCompanions = Object.entries(this.companions.availableCompanions)
      .filter(([id, comp]) => comp.relationshipLevel > 40)
      .map(([id, comp]) => ({ id, ...comp }));
    
    if (activeCompanions.length < 2) return null;
    
    // Check for ideological conflicts
    const conflicts = [];
    
    // Jorge vs Elena - technical vs emotional approach
    if (activeCompanions.some(c => c.id === 'jorge') && activeCompanions.some(c => c.id === 'elena')) {
      conflicts.push({
        type: 'ideological',
        companions: ['jorge', 'elena'],
        issue: 'Mikko\'s best path forward',
        jorgePosition: 'Technical reliability',
        elenaPosition: 'Emotional safety',
        intensity: Math.abs(this.companions.availableCompanions.jorge.relationshipLevel - 
                          this.companions.availableCompanions.elena.relationshipLevel) / 100
      });
    }
    
    // Sara vs Traditional mechanics
    if (activeCompanions.some(c => c.id === 'sara') && activeCompanions.some(c => c.id === 'jorge')) {
      if (this.companions.availableCompanions.sara.opinions.tradition < 0) {
        conflicts.push({
          type: 'methodological',
          companions: ['sara', 'jorge'],
          issue: 'Technical approach',
          saraPosition: 'Innovation and data',
          jorgePosition: 'Experience and intuition',
          intensity: 0.6
        });
      }
    }
    
    return conflicts.length > 0 ? conflicts : null;
  },
  // Game state for story progression
  state: getDefaultStoryState(),
  
  // Initialize story system
  init() {
    const saved = localStorage.getItem('rally_story_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge onto a fresh default shape so any field added to the game
        // since this save was written (e.g. consequenceHistory) is filled
        // in instead of being undefined and crashing the first time it's
        // used (see applyChoice()).
        this.state = deepMergeDefaults(parsed, getDefaultStoryState());
      } catch (e) {
        console.error('Failed to parse saved story state, starting fresh:', e);
        this.state = getDefaultStoryState();
      }
    }
  },
  
  // Save state
  save() {
    localStorage.setItem('rally_story_state', JSON.stringify(this.state));
  },
  
  // Reset for new career
  reset() {
    this.state = getDefaultStoryState();
    this.save();
  },
  
  // Apply era-based starting modifiers (System 2)
  applyEraModifiers(era) {
    if (!era || !this.state.stats) return;
    
    const eraModifiers = {
      'grpb': { stress: 10, trust: 0 },      // Group B: +10 stress (monsters with no limits)
      'wrc90s': { stress: 0, trust: 0 },     // WRC 90s: baseline
      'rally2': { stress: 0, trust: 5 },     // Rally2/R5: +5 trust (modern, forgiving)
      'rally1': { stress: 5, trust: 0 },     // Rally1: +5 stress (hybrid management)
      'classic': { stress: -5, trust: 0 }    // Classic: -5 stress (lower power, forgiving)
    };
    
    const modifiers = eraModifiers[era] || { stress: 0, trust: 0 };
    
    // Apply stress modifier (mentalStress)
    if (modifiers.stress !== 0) {
      this.state.stats.mentalStress = Math.max(0, Math.min(100, this.state.stats.mentalStress + modifiers.stress));
    }
    
    // Apply trust modifier (driverTrust)
    if (modifiers.trust !== 0) {
      this.state.stats.driverTrust = Math.max(0, Math.min(100, this.state.stats.driverTrust + modifiers.trust));
    }
    
    this.save();
  },
  
  // Select route at start. The theme is LOCKED to the arc: a Street career
  // runs entirely in the street theme, a Dakar career in roadbook, and the
  // classic WRC career in cockpit — themes can't leak across careers.
  selectRoute(route, arc) {
    this.state.genderRoute = route;
    this.state.themeArc = arc || null;         // null = classic cockpit story
    this.state.careerTheme = arc === 'street' ? 'theme-street'
                           : arc === 'roadbook' ? 'theme-roadbook'
                           : null;
    if (typeof RpaTheme !== 'undefined' && this.state.careerTheme !== undefined) {
      try { RpaTheme.set(this.state.careerTheme); } catch (e) {}
    }
    this.save();
  },
  
  // The story dataset for the active arc (classic StoryData or ThemeStoryData)
  arcData() {
    if (this.state.themeArc && typeof ThemeStoryData !== 'undefined' && ThemeStoryData[this.state.themeArc]) {
      return ThemeStoryData[this.state.themeArc];
    }
    return StoryData;
  },
  
  // Apply choice consequences
  applyChoice(choice) {
    // Track consequences for the database
    const consequenceEntry = {
      timestamp: Date.now(),
      choice: choice.text || 'unknown',
      effects: []
    };

    if (choice.stats) {
      Object.entries(choice.stats).forEach(([stat, value]) => {
        this.state.stats[stat] = Math.max(0, Math.min(100, this.state.stats[stat] + value));
        consequenceEntry.effects.push({ type: 'stat', stat, value });
      });
    }
    if (choice.factionReputation) {
      Object.entries(choice.factionReputation).forEach(([faction, value]) => {
        this.state.factionReputation[faction] = Math.max(0, Math.min(100, this.state.factionReputation[faction] + value));
        consequenceEntry.effects.push({ type: 'faction', faction, value });
      });
    }
    if (choice.flags) {
      Object.assign(this.state.flags, choice.flags);
      consequenceEntry.effects.push({ type: 'flags', flags: choice.flags });
    }
    if (choice.relationships) {
      Object.assign(this.state.relationships, choice.relationships);
      consequenceEntry.effects.push({ type: 'relationships', relationships: choice.relationships });
    }
    if (choice.driverState) {
      Object.assign(this.state.driverState, choice.driverState);
      consequenceEntry.effects.push({ type: 'driverState', state: choice.driverState });
    }
    
    // Handle companion reactions
    if (choice.companionReaction) {
      const reaction = this.addCompanionReaction(
        choice.companionReaction.companion,
        choice.companionReaction.reaction,
        choice.companionReaction.intensity
      );
      consequenceEntry.effects.push({ type: 'companionReaction', reaction, details: choice.companionReaction });
      
      // Store companion reaction state for potential use in dialogue
      if (reaction === 'departure') {
        this.state.flags[`companion_${choice.companionReaction.companion}_departed`] = true;
      } else if (reaction === 'warning') {
        this.state.flags[`companion_${choice.companionReaction.companion}_warned`] = true;
      }
    }
    
    // Handle multiple companion reactions
    if (choice.companionReactions) {
      choice.companionReactions.forEach(compReaction => {
        const reaction = this.addCompanionReaction(
          compReaction.companion,
          compReaction.reaction,
          compReaction.intensity
        );
        consequenceEntry.effects.push({ type: 'companionReaction', reaction, details: compReaction });
        
        // Store companion reaction state for potential use in dialogue
        if (reaction === 'departure') {
          this.state.flags[`companion_${compReaction.companion}_departed`] = true;
        } else if (reaction === 'warning') {
          this.state.flags[`companion_${compReaction.companion}_warned`] = true;
        }
      });
    }
    
    // Add to consequence history
    this.state.consequenceHistory.push(consequenceEntry);
    
    // Trigger world reactions based on consequences
    this.triggerWorldReactions(consequenceEntry);
    
    this.save();
  },
  
  // World reaction system - makes the world respond to player actions
  triggerWorldReactions(consequence) {
    // Example: High privateer reputation triggers factory suspicion
    if (this.state.factionReputation.privateers > 75 && this.state.factionReputation.factoryTeams < 30) {
      this.state.flags.factorySuspicious = true;
    }
    
    // Example: Helping rival driver creates media narrative
    if (consequence.effects.some(e => e.type === 'flags' && e.flags.helpedRival)) {
      this.state.factionReputation.mediaMachine += 10;
      this.state.factionReputation.factoryTeams -= 5;
    }
    
    // Example: Betraying faction creates long-term consequences
    if (consequence.effects.some(e => e.type === 'flags' && e.flags.betrayedFaction)) {
      const betrayedFaction = consequence.effects.find(e => e.type === 'flags' && e.flags.betrayedFaction).flags.betrayedFaction;
      this.state.factionReputation[betrayedFaction] -= 30;
      // Other factions might respect or fear you
      Object.keys(this.state.factionReputation).forEach(faction => {
        if (faction !== betrayedFaction) {
          this.state.factionReputation[faction] += 5;
        }
      });
    }
    
    // Trigger consequence propagation chains
    this.propagateConsequences(consequence);
  },
  
  // Consequence propagation system - cascading effects from single choices
  propagateConsequences(consequence) {
    const propagationChain = [];
    
    // Chain 1: Engineering solution leads to technical respect, which leads to new opportunities
    if (consequence.effects.some(e => e.type === 'flags' && e.flags.engineeringSolution)) {
      propagationChain.push({
        trigger: 'engineeringSolution',
        timeline: 'immediate',
        effect: 'Jorge shares technical insights with other mechanics'
      });
      
      if (this.state.stageIndex > 2) {
        propagationChain.push({
          trigger: 'engineeringSolution',
          timeline: 'next_chapter',
          effect: 'Word spreads - other teams inquire about your technical input',
          delayedFlag: 'technicalReputationSpread'
        });
      }
    }
    
    // Chain 2: Siding with Elena over Jorge affects driver psychology
    if (consequence.effects.some(e => e.type === 'flags' && e.flags.sidedWithElena)) {
      propagationChain.push({
        trigger: 'sidedWithElena',
        timeline: 'immediate',
        effect: 'Mikko senses safety-first approach, may drive more conservatively'
      });
      
      propagationChain.push({
        trigger: 'sidedWithElena',
        timeline: 'next_stage',
        effect: 'Jorge becomes less communicative about technical details',
        delayedFlag: 'mechanicWithdrawal'
      });
    }
    
    // Chain 3: Factory interest leads to recruitment pressure
    if (consequence.effects.some(e => e.type === 'flags' && e.flags.factoryInterested)) {
      propagationChain.push({
        trigger: 'factoryInterested',
        timeline: 'next_chapter',
        effect: 'Factory team increases recruitment efforts, may approach with concrete offer',
        delayedFlag: 'factoryOfferIncoming'
      });
    }
    
    // Chain 4: Privateer bond creates network effects
    if (consequence.effects.some(e => e.type === 'relationships' && e.relationships.privateerBond)) {
      propagationChain.push({
        trigger: 'privateerBond',
        timeline: 'immediate',
        effect: 'Privateer community shares information and resources'
      });
      
      propagationChain.push({
        trigger: 'privateerBond',
        timeline: 'future_stages',
        effect: 'Privateer teams offer preferential treatment and inside information',
        delayedFlag: 'privateerNetworkEstablished'
      });
    }
    
    // Chain 5: High reputation creates media attention
    if (this.state.stats.reputation > 80) {
      propagationChain.push({
        trigger: 'highReputation',
        timeline: 'immediate',
        effect: 'Media seeks interviews and commentary'
      });
      
      propagationChain.push({
        trigger: 'highReputation',
        timeline: 'ongoing',
        effect: 'Sponsors and teams monitor performance more closely',
        delayedFlag: 'mediaSpotlightActive'
      });
    }
    
    // Store propagation chain for later reference
    if (propagationChain.length > 0) {
      consequence.propagationChain = propagationChain;
      this.state.flags.activePropagationChains = this.state.flags.activePropagationChains || [];
      this.state.flags.activePropagationChains.push(...propagationChain.map(chain => chain.trigger));
    }
    
    // Apply delayed effects if their conditions are met
    this.applyDelayedEffects();
  },
  
  // Apply delayed effects from propagation chains
  applyDelayedEffects() {
    const currentStage = this.state.stageIndex;
    const activeChains = this.state.flags.activePropagationChains || [];
    
    // Check if any delayed effects should trigger now
    if (activeChains.includes('technicalReputationSpread') && currentStage >= 6) {
      this.state.flags.technicalExpertRecognized = true;
      this.state.stats.reputation += 10;
    }
    
    if (activeChains.includes('mechanicWithdrawal') && currentStage >= 4) {
      this.state.stats.teamRespect -= 5;
      this.state.flags.mechanicDistant = true;
    }
    
    if (activeChains.includes('factoryOfferIncoming') && currentStage >= 5) {
      this.state.flags.factoryOfferAvailable = true;
    }
    
    if (activeChains.includes('privateerNetworkEstablished') && currentStage >= 7) {
      this.state.flags.privateerNetworkActive = true;
      this.state.factionReputation.privateers += 15;
    }
    
    this.save();
  },
  
  // Calculate ending based on player's entire history
  calculateEnding() {
    const ending = {
      type: 'unknown',
      components: [],
      description: '',
      epilogue: []
    };
    
    // Dominant faction alignment
    const dominantFaction = this.getDominantFaction();
    if (dominantFaction) {
      ending.components.push({ type: 'faction', value: dominantFaction });
    }
    
    // Relationship outcomes
    if (this.state.stats.driverTrust > 75) {
      ending.components.push({ type: 'relationship', value: 'driver_loyal' });
    } else if (this.state.stats.driverTrust < 25) {
      ending.components.push({ type: 'relationship', value: 'driver_broken' });
    }
    
    // Companion fates
    Object.entries(this.companions.availableCompanions).forEach(([id, companion]) => {
      if (companion.relationshipLevel > 70) {
        ending.components.push({ type: 'companion', value: `${id}_loyal` });
      } else if (companion.relationshipLevel < 20) {
        ending.components.push({ type: 'companion', value: `${id}_departed` });
      }
    });
    
    // Career achievements
    if (this.state.stats.legacy > 70) {
      ending.components.push({ type: 'achievement', value: 'legendary' });
    } else if (this.state.stats.legacy > 40) {
      ending.components.push({ type: 'achievement', value: 'respected' });
    } else {
      ending.components.push({ type: 'achievement', value: 'forgotten' });
    }
    
    // Moral/philosophical alignment
    if (this.state.flags.sidedWithElena && !this.state.flags.sidedWithJorge) {
      ending.components.push({ type: 'philosophy', value: 'safety_first' });
    } else if (this.state.flags.sidedWithJorge && !this.state.flags.sidedWithElena) {
      ending.components.push({ type: 'philosophy', value: 'performance_first' });
    } else if (this.state.flags.resolvedConflict) {
      ending.components.push({ type: 'philosophy', value: 'balanced' });
    }
    
    // Determine ending type based on components
    ending.type = this.determineEndingType(ending.components);
    ending.description = this.generateEndingDescription(ending);
    ending.epilogue = this.generateEpilogue(ending);
    
    return ending;
  },
  
  // Determine the type of ending based on components
  determineEndingType(components) {
    const faction = components.find(c => c.type === 'faction')?.value;
    const relationship = components.find(c => c.type === 'relationship')?.value;
    const achievement = components.find(c => c.type === 'achievement')?.value;
    
    // Legendary endings
    if (achievement === 'legendary' && relationship === 'driver_loyal') {
      if (faction === 'privateers') return 'legendary_privateer_champion';
      if (faction === 'factoryTeams') return 'legendary_factory_champion';
      return 'legendary_balanced_champion';
    }
    
    // Tragic endings
    if (relationship === 'driver_broken') {
      if (this.state.flags.blamedForCrash) return 'tragic_mutual_destruction';
      return 'tragic_drifted_apart';
    }
    
    // Philosophical endings
    const philosophy = components.find(c => c.type === 'philosophy')?.value;
    if (philosophy === 'safety_first') return 'philosophical_guardian';
    if (philosophy === 'performance_first') return 'philosophical_purist';
    if (philosophy === 'balanced') return 'philosophical_diplomat';
    
    // Faction-specific endings
    if (faction === 'privateers') return 'privateer_leader';
    if (faction === 'factoryTeams') return 'factory_insider';
    if (faction === 'progressives') return 'progressive_reformer';
    if (faction === 'oldGuard') return 'traditionalist_keeper';
    
    // Default endings
    if (achievement === 'respected') return 'respected_veteran';
    return 'forgotten_participant';
  },
  
  // Generate ending description
  generateEndingDescription(ending) {
    const descriptions = {
      legendary_privateer_champion: "You proved that passion beats corporate budgets. The privateer community remembers you as the one who showed the world that talent and determination can overcome any resource gap.",
      legendary_factory_champion: "You rose through the ranks to become one of the factory team's most respected figures. Your technical insights and leadership shaped the future of the team.",
      legendary_balanced_champion: "You found the middle path that nobody thought existed—balancing competitiveness with compassion, performance with safety. Your legacy is one of bridges built and boundaries broken.",
      tragic_mutual_destruction: "The pursuit of perfection destroyed everything. Both you and Mikko were consumed by the very standards you set. The paddock remembers you as a cautionary tale about the cost of never being wrong.",
      tragic_drifted_apart: "You won races, but lost the relationship. Mikko moved on to other co-drivers, other teams. Sometimes success and connection cannot coexist.",
      philosophical_guardian: "You chose safety over seconds, survival over glory. Mikko may not have won every championship, but he's alive—and that's an achievement nobody can diminish.",
      philosophical_purist: "You refused to compromise on performance. The car was built to win, not to forgive. Every victory came with a cost that you were willing to pay.",
      philosophical_diplomat: "You found solutions that nobody else could see. Where others saw only conflicts, you found compromises that satisfied both honor and ambition.",
      privateer_leader: "The privateer community looks to you for leadership. You've built networks and connections that help the underdogs compete with the factory giants.",
      factory_insider: "You've become part of the establishment you once questioned. The resources are yours to command, but you sometimes wonder what you've lost along the way.",
      progressive_reformer: "You've used your position to push for safety innovations and responsible racing. The sport is changing because of you—slower, perhaps, but more sustainable.",
      traditionalist_keeper: "You've become a guardian of racing's golden age traditions. In a world of increasing regulation and corporate control, you keep alive the dangerous spirit that made the sport legendary.",
      respected_veteran: "You're known as a reliable professional, a co-driver who gets the job done. The championships may not bear your name, but the respect of your peers does.",
      forgotten_participant: "Time passes, and memories fade. You were part of the story, but not the part anyone remembers. The racing world moves on, as it always does."
    };
    
    return descriptions[ending.type] || "Your story defies easy categorization. You walked a path that was entirely your own.";
  },
  
  // Generate epilogue based on ending components
  generateEpilogue(ending) {
    const epilogue = [];
    
    // Faction consequences
    const faction = ending.components.find(c => c.type === 'faction')?.value;
    if (faction === 'privateers') {
      epilogue.push("The privateer teams you supported have grown stronger. A new generation of drivers now has opportunities that wouldn't have existed without your help.");
    } else if (faction === 'factoryTeams') {
      epilogue.push("The factory team's dominance has only increased under your influence. Some say you've made the sport less accessible, but the results speak for themselves.");
    } else if (faction === 'progressives') {
      epilogue.push("Safety innovations you championed have saved lives. The sport is different now—less dangerous, some say less exciting—but undeniably more sustainable.");
    }
    
    // Companion fates
    ending.components.filter(c => c.type === 'companion').forEach(comp => {
      if (comp.value === 'jorge_loyal') {
        epilogue.push("Jorge still works in the garage, teaching a new generation of mechanics the difference between building cars and building trust.");
      } else if (comp.value === 'elena_loyal') {
        epilogue.push("Elena found peace, knowing that someone else understood her calculation. She still attends races, but now she watches from the stands, not the timing stand.");
      } else if (comp.value === 'jorge_departed') {
        epilogue.push("Jorge moved to a different team. You hear he's doing well, but the relationship never recovered from the choices you made.");
      }
    });
    
    // Relationship consequences
    const relationship = ending.components.find(c => c.type === 'relationship')?.value;
    if (relationship === 'driver_loyal') {
      epilogue.push("Mikko still calls you before big decisions. The trust you built survived the pressures of competition and the passage of time.");
    } else if (relationship === 'driver_broken') {
      epilogue.push("Mikko doesn't return your calls. Some bridges burn slowly, and this one smoldered for years before finally collapsing.");
    }
    
    // Personal legacy
    const achievement = ending.components.find(c => c.type === 'achievement')?.value;
    if (achievement === 'legendary') {
      epilogue.push("They mention your name in discussions of the great co-drivers. Not just for what you achieved, but for how you achieved it.");
    } else if (achievement === 'respected') {
      epilogue.push("In the paddock, heads still nod when you walk by. That quiet respect is its own kind of legacy.");
    }
    
    return epilogue;
  },
  
  // Get world state for reactive dialogue
  getWorldState() {
    return {
      dominantFaction: this.getDominantFaction(),
      worldReactions: this.getWorldReactions(),
      reputationTier: this.getReputationTier(),
      consequenceCount: this.state.consequenceHistory.length
    };
  },
  
  // Determine which faction the player is most aligned with
  getDominantFaction() {
    const reps = this.state.factionReputation;
    let maxRep = 0;
    let dominant = null;
    
    Object.entries(reps).forEach(([faction, rep]) => {
      if (rep > maxRep) {
        maxRep = rep;
        dominant = faction;
      }
    });
    
    return dominant;
  },
  
  // Get world reactions based on player's reputation and actions
  getWorldReactions() {
    const reactions = [];
    const reps = this.state.factionReputation;
    
    // Check for extreme faction alignments
    if (reps.privateers > 80) {
      reactions.push('privateersLoyal');
    }
    if (reps.factoryTeams > 80) {
      reactions.push('factoryLoyal');
    }
    if (reps.oldGuard > 80) {
      reactions.push('traditionalistRespect');
    }
    if (reps.progressives > 80) {
      reactions.push('progressiveTrust');
    }
    
    // Check for conflicting reputations
    const highRepCount = Object.values(reps).filter(r => r > 70).length;
    if (highRepCount >= 3) {
      reactions.push('diplomatBridgeBuilder');
    }
    
    // Check for notorious actions
    if (this.state.flags.betrayedFaction) {
      reactions.push('knownBetrayer');
    }
    if (this.state.flags.helpedRival) {
      reactions.push('rivalHelper');
    }
    
    return reactions;
  },
  
  // Get reputation tier for world reactions
  getReputationTier() {
    const rep = this.state.stats.reputation;
    if (rep >= 90) return 'legendary';
    if (rep >= 75) return 'respected';
    if (rep >= 50) return 'known';
    if (rep >= 25) return 'recognized';
    return 'unknown';
  },
  
  // Get current stage context for a story slot.
  //
  // ANTI-LOOP RULES (fixes the story replaying its chapters every season):
  //   The career calendar is 6 one-stage rounds cycling eras grpb→w90→w24→grpb→….
  //   The old code derived the chapter FROM THE ERA, so round 4 (grpb again)
  //   jumped the story back to chapter 1 and replayed the whole arc forever.
  //   Chapters now advance monotonically with the global round index and never
  //   use the era for progression. The chapter BOUNDARIES are per-arc:
  //     classic WRC (12 scenes, flag-gated):  rounds 0-1 / 2-3 / 4-5
  //     theme arcs  (10 scenes, linear drama): rounds 0-2 / 3-4 / 5
  //   The theme mapping puts each arc's finale pair ("the last run" pre-stage
  //   and the epilogue) on the REAL final round instead of round 4, so careers
  //   end on their ending. ctx.stage is the beat WITHIN the chapter (1,2,3,4…
  //   — the numbering the scene conditions were authored against).
  getStageContext(era, stageIndex, kind) {
    const eras = ['grpb', 'w90', 'w24'];
    const currentEra = eras.indexOf(era) + 1;
    const idx = Math.max(0, Math.floor(+stageIndex || 0));
    // Round where each chapter starts. Theme arcs stretch chapter 1 over the
    // opening act and give chapter 3 the whole finale round.
    const starts = this.state.themeArc ? [0, 3, 5] : [0, 2, 4];
    let chapter = 1;
    for (let i = 0; i < starts.length; i++) if (idx >= starts[i]) chapter = i + 1;
    const firstOfChapter = starts.indexOf(idx) !== -1;
    return {
      era: currentEra,
      chapter: chapter,
      // Beat within the chapter (pre = odd, post = even).
      stage: (idx - starts[chapter - 1]) * 2 + (kind === 'post' ? 2 : 1),
      // Beat across the whole arc (1..12)
      beat: idx * 2 + (kind === 'post' ? 2 : 1),
      isFirstStage: firstOfChapter,
      isLastStage: idx >= 5,
      isFinalRound: idx >= 5,
      isChapterEnd: kind === 'post' && starts.indexOf(idx + 1) !== -1,
      // Pre-beat of the last round in a chapter (chapter climax incoming).
      isLastPreOfChapter: kind === 'pre' && starts.indexOf(idx + 1) !== -1,
    };
  },

  // Chapter data for a story slot. The pool is ALL chapters — scenes were
  // authored against a different calendar cadence, and flag-gated vignettes
  // (mechanic's daughter, recruiter visits, photograph story…) would starve
  // if only the current chapter could answer a slot. The seen ledger in
  // pickScene keeps this from ever replaying anything.
  chaptersFor(ctx) {
    const arc = this.arcData()[this.state.genderRoute] || {};
    const chapters = [1, 2, 3].map((n) => ({ key: `ch${n}`, data: arc[`chapter${n}`] || {} }));
    // Finale chapter gets top priority on the final round (classic arc keeps
    // its finale in a `chapter4`; theme arcs have no chapter4 — no-op there).
    if (ctx.isFinalRound && arc.chapter4) {
      chapters.unshift({ key: 'ch4', data: arc.chapter4 });
    }
    return chapters;
  },

  // --- Scene slot picker (the other half of the anti-loop fix) -------------
  // Exactly one scene per slot, and NO scene can ever play twice: every shown
  // scene is stamped into state.flags.seenScenes and skipped afterwards.
  // Pool = the chapter's pre + post lists combined (the older story data was
  // authored for a 4-stage-per-chapter calendar, so scenes legitimately sit in
  // the "other" list for our 2-beats-per-round calendar), plus chapter4's
  // finale lists on the final round. Priority is AUTHORED ORDER: the current
  // chapter's own list first, then its other list, then the remaining chapters
  // (chapter4/finale first when present). No heuristics — the order the writer
  // put scenes in IS the priority.
  pickScene(chapters, ctx, kind) {
    const own = kind === 'pre' ? 'preStage' : 'postStage';
    const other = kind === 'pre' ? 'postStage' : 'preStage';
    const ownKey = `ch${ctx.chapter}`;
    const pool = [];
    const push = (ch, listName) => {
      (ch.data[listName] || []).forEach((entry, i) => {
        pool.push({ entry, key: entry.id || `${ch.key}:${listName}[${i}]` });
      });
    };
    // Pass 1+2: the slot's own chapter (own list, then the other list).
    const ownCh = chapters.find((ch) => ch.key === ownKey);
    if (ownCh) { push(ownCh, own); push(ownCh, other); }
    // Pass 3: every other chapter in the order chaptersFor() returned them
    // (chapter4/finale is unshifted to the front on the final round).
    chapters.forEach((ch) => { if (ch.key !== ownKey) { push(ch, own); push(ch, other); } });
    const seen = this.state.flags.seenScenes || {};
    for (const c of pool) {
      if (seen[c.key]) continue;
      let ok = false;
      try { ok = !!c.entry.condition(ctx); } catch (e) { ok = false; }
      if (ok) return c;
    }
    // Nothing matched (every candidate seen or flag-gated off). Serve a short
    // untracked paddock beat instead of an empty slot — never stamped into
    // the seen ledger, so it can fill as many quiet slots as needed.
    return { entry: { id: 'paddock_beat', condition: () => true, scene: this.paddockBeat(ctx) }, key: null };
  },

  // Small interstitial used when no authored scene matches a slot. Rotates a
  // handful of service-park vignettes keyed by the global beat so adjacent
  // slots rarely repeat the same text.
  paddockBeat(ctx) {
    const vignettes = [
      { location: 'SERVICE PARK · TIME CONTROL', lines: [
        'The mechanics wave you over: nothing broken, nothing to sign. For ninety seconds the paddock is just engines ticking as they cool and someone else\'s team manager arguing about tyreographs. You use the quiet to run the next stage in your head, corners first, then the calls.' ] },
      { location: 'SERVICE PARK · FUEL Stand', lines: [
        'A rival co-driver nods at you across the fuel stand — the nod that says neither of us slept and both of us are still here. You drink the water they hand you. The notes in your lap are warm from the ride; you redraw the one tricky braking reference before the next stage start.' ] },
      { location: 'SERVICE PARK · RADIO CHECK', lines: [
        'Team radio, mid-volume: times in, times out, a weather rumour about the far section. You answer what is asked, then walk a slow lap around the car, reciting the next stage under your breath. The driver watches you do it and says nothing, which is how you know it is working.' ] },
      { location: 'SERVICE ROAD · BETWEEN STAGES', lines: [
        'The convoy idles toward the next stage and the trees stroke shadows over the roadbook. Somewhere behind you a helicopter lifts — the leaders already done. You are neither early nor late in the story of this rally. You are exactly where the notes put you.' ] },
      { location: 'SERVICE PARK · DUSK', lines: [
        'Late light, long service. Someone\'s grill is going; the smell of cheap sausages mixes with brake cleaner, which should be horrible and somehow is the whole sport in one breath. You reprint the next stage pages and, feeling superstitious, read the first call out loud to nobody.' ] }
    ];
    const v = vignettes[(ctx.beat - 1) % vignettes.length];
    return { location: v.location, dialogue: v.lines.map(t => ({ speaker: 'narrator', text: t })) };
  },

  // Stamp a scene as shown so it can never replay (persisted with the save).
  // Fallback paddock beats arrive with key === null and are never stamped.
  markSceneSeen(picked) {
    if (!picked || !picked.key) return;
    if (!this.state.flags.seenScenes) this.state.flags.seenScenes = {};
    this.state.flags.seenScenes[picked.key] = true;
    this.save();
  },
};

// StoryData is now loaded from story_data.js
// Make sure story_data.js is loaded before story_system.js in index.html

// Story UI Controller
const StoryUI = {
  currentScene: null,
  onComplete: null,
  
  // Initialize story screen
  init() {
    // Create story screen if not exists
    if (!document.getElementById('story-screen')) {
      this.createStoryScreen();
    }
  },
  
  createStoryScreen() {
    const screen = document.createElement('div');
    screen.id = 'story-screen';
    screen.className = 'screen';
    screen.style.cssText = `
      background: #000;
      color: #fff;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
      font-family: 'IBM Plex Sans', sans-serif;
    `;
    
    screen.innerHTML = `
      <div id="story-location" style="
        font-family: 'Bebas Neue', sans-serif;
        font-size: 14px;
        letter-spacing: 3px;
        color: #f5c518;
        margin-bottom: 2rem;
        text-transform: uppercase;
        opacity: 0.8;
      "></div>
      
      <div id="story-content" style="
        max-width: 800px;
        width: 100%;
        text-align: center;
      ">
        <div id="story-speaker" style="
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          color: #9090a8;
          margin-bottom: 1rem;
          text-transform: uppercase;
        "></div>
        
        <div id="story-text" style="
          font-size: clamp(18px, 3vw, 24px);
          line-height: 1.6;
          color: #fff;
          margin-bottom: 3rem;
          min-height: 120px;
          white-space: pre-wrap;
        "></div>
        
        <div id="story-choices" style="
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
        "></div>
      </div>
      
      <div id="story-stats" style="
        position: fixed;
        bottom: 2rem;
        left: 2rem;
        display: flex;
        gap: 1.5rem;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 12px;
        color: #606070;
      ">
        <span id="stat-trust">Trust: 50</span>
        <span id="stat-reputation">Rep: 50</span>
        <span id="stat-stress">Stress: 0</span>
        <span id="stat-grit">Grit: 0</span>
      </div>
      
      <button id="story-skip" onclick="StoryUI.skip()" style="
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: none;
        border: 1px solid #404050;
        color: #606070;
        padding: 0.5rem 1rem;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
      ">Skip Story</button>
    `;
    
    document.body.appendChild(screen);
  },
  
  // Show story scene
  showScene(sceneData, onComplete) {
    this.init();
    this.currentScene = sceneData;
    this.onComplete = onComplete;
    
    const screen = document.getElementById('story-screen');
    const location = document.getElementById('story-location');
    const speaker = document.getElementById('story-speaker');
    const text = document.getElementById('story-text');
    const choices = document.getElementById('story-choices');
    
    // Update stats display
    this.updateStats();
    
    // Clear previous
    choices.innerHTML = '';
    
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Typewriter effect for text with TTS
    let dialogueIndex = 0;
    const showNextDialogue = () => {
      if (dialogueIndex >= sceneData.dialogue.length) {
        // Show choices
        this.showChoices(sceneData.choices);
        return;
      }
      
      const line = sceneData.dialogue[dialogueIndex];
      location.textContent = sceneData.location;
      const speakerName = line.speaker === 'you' ? 'You' : 
                           line.speaker === 'narrator' ? '' : 
                           line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1);
      speaker.textContent = speakerName;
      
      // Text-to-speech for this line
      if (window.speechSynthesis && line.text) {
        const utt = new SpeechSynthesisUtterance(line.text);
        
        // Different voice settings based on speaker type
        if (line.speaker === 'narrator') {
          // Narrator: slower, deeper, more dramatic
          utt.rate = 0.85;
          utt.pitch = 0.8;
          utt.volume = 0.9;
        } else if (line.speaker === 'you') {
          // Player character: normal
          utt.rate = 0.95;
          utt.pitch = 1.0;
          utt.volume = 0.85;
        } else {
          // Other characters: slightly varied
          utt.rate = 0.9;
          utt.pitch = 0.95;
          utt.volume = 0.9;
          
          // Adjust for emotion if specified
          if (line.emotion === 'slurred' || line.emotion === 'tired') {
            utt.rate = 0.75;
            utt.pitch = 0.85;
          } else if (line.emotion === 'angry' || line.emotion === 'hostile' || line.emotion === 'furious') {
            utt.rate = 0.95;
            utt.pitch = 0.9;
            utt.volume = 1.0;
          } else if (line.emotion === 'gruff') {
            utt.pitch = 0.75;
          }
        }
        
        // Try to find a good English voice — shared natural-voice picker
        if (typeof VoicePicker !== 'undefined') {
          VoicePicker.apply(utt, line.speaker === 'you' ? StorySystem.state.genderRoute : null);
        } else {
          const voices = window.speechSynthesis.getVoices();
          const prefVoice = voices.find(v => v.lang.startsWith('en') && 
            (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('uk')));
          if (prefVoice) utt.voice = prefVoice;
        }
        
        window.speechSynthesis.speak(utt);
      }
      
      // Typewriter effect with Continue button
      let charIndex = 0;
      text.textContent = '';
      text.style.opacity = '1';
      text.style.cursor = 'pointer';
      
      // Function to advance to next line
      const advanceLine = () => {
        text.onclick = null;
        text.style.cursor = 'default';
        // Remove continue button if exists
        const existingBtn = document.getElementById('story-continue-btn');
        if (existingBtn) existingBtn.remove();
        dialogueIndex++;
        showNextDialogue();
      };
      
      let typeInterval = setInterval(() => {
        if (charIndex < line.text.length) {
          text.textContent += line.text[charIndex];
          charIndex++;
        } else {
          clearInterval(typeInterval);
          // Show Continue button
          const continueBtn = document.createElement('button');
          continueBtn.id = 'story-continue-btn';
          continueBtn.style.cssText = `
            background: transparent;
            border: 1px solid #606070;
            color: #9090a8;
            padding: 0.75rem 1.5rem;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 14px;
            letter-spacing: 2px;
            cursor: pointer;
            margin-top: 2rem;
            text-transform: uppercase;
          `;
          continueBtn.textContent = '► Continue';
          continueBtn.onmouseover = () => { continueBtn.style.borderColor = '#f5c518'; continueBtn.style.color = '#f5c518'; };
          continueBtn.onmouseout = () => { continueBtn.style.borderColor = '#606070'; continueBtn.style.color = '#9090a8'; };
          continueBtn.onclick = advanceLine;
          choices.appendChild(continueBtn);
        }
      }, 25);
      
      // Click text to skip typewriter and show Continue button
      text.onclick = () => {
        clearInterval(typeInterval);
        text.textContent = line.text;
        // Show Continue button if not already shown
        if (!document.getElementById('story-continue-btn')) {
          const continueBtn = document.createElement('button');
          continueBtn.id = 'story-continue-btn';
          continueBtn.style.cssText = `
            background: transparent;
            border: 1px solid #606070;
            color: #9090a8;
            padding: 0.75rem 1.5rem;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 14px;
            letter-spacing: 2px;
            cursor: pointer;
            margin-top: 2rem;
            text-transform: uppercase;
          `;
          continueBtn.textContent = '► Continue';
          continueBtn.onmouseover = () => { continueBtn.style.borderColor = '#f5c518'; continueBtn.style.color = '#f5c518'; };
          continueBtn.onmouseout = () => { continueBtn.style.borderColor = '#606070'; continueBtn.style.color = '#9090a8'; };
          continueBtn.onclick = advanceLine;
          choices.appendChild(continueBtn);
        }
      };
    };
    
    show('story-screen');
    showNextDialogue();
  },
  
  showChoices(choicesData) {
    const choices = document.getElementById('story-choices');
    choices.innerHTML = '';
    
    choicesData.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        background: transparent;
        border: 1px solid #f5c518;
        color: #f5c518;
        padding: 1rem 1.5rem;
        font-family: 'IBM Plex Sans', sans-serif;
        font-size: 16px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        width: 100%;
      `;
      btn.textContent = choice.text;
      btn.onmouseover = () => { btn.style.background = 'rgba(245, 197, 24, 0.1)'; };
      btn.onmouseout = () => { btn.style.background = 'transparent'; };
      btn.onclick = () => this.selectChoice(choice);
      choices.appendChild(btn);
    });
  },
  
  selectChoice(choice) {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Apply consequences
    StorySystem.applyChoice(choice.consequence);
    
    // Show consequence text
    if (choice.consequence.text) {
      const text = document.getElementById('story-text');
      const speaker = document.getElementById('story-speaker');
      const choices = document.getElementById('story-choices');
      
      speaker.textContent = '';
      text.textContent = choice.consequence.text;
      choices.innerHTML = '';
      
      // TTS for consequence text
      if (window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance(choice.consequence.text);
        utt.rate = 0.9;
        utt.pitch = 0.9;
        utt.volume = 0.85;
        
        if (typeof VoicePicker !== 'undefined') {
          VoicePicker.apply(utt, StorySystem.state.genderRoute);
        } else {
          const voices = window.speechSynthesis.getVoices();
          const prefVoice = voices.find(v => v.lang.startsWith('en') && 
            (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('google')));
          if (prefVoice) utt.voice = prefVoice;
        }
        
        window.speechSynthesis.speak(utt);
      }
      
      const continueBtn = document.createElement('button');
      continueBtn.id = 'story-consequence-continue';
      continueBtn.style.cssText = `
        background: #f5c518;
        border: none;
        color: #000;
        padding: 1rem 2rem;
        font-family: 'Bebas Neue', sans-serif;
        font-size: 18px;
        cursor: pointer;
        margin-top: 2rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        pointer-events: auto;
        z-index: 1000;
      `;
      continueBtn.textContent = 'Continue';
      continueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.complete();
      });
      choices.appendChild(continueBtn);
      
      this.updateStats();
    } else {
      // No consequence text, complete immediately
      this.complete();
    }
  },
  
  updateStats() {
    const stats = StorySystem.state.stats;
    document.getElementById('stat-trust').textContent = `Trust: ${stats.driverTrust}`;
    document.getElementById('stat-reputation').textContent = `Rep: ${stats.reputation}`;
    document.getElementById('stat-stress').textContent = `Stress: ${stats.mentalStress}`;
    document.getElementById('stat-grit').textContent = `Grit: ${stats.grit}`;
  },
  
  complete() {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Always close the overlay, however we got here (skip, choice with
    // consequence text, choice without). This used to only happen in one
    // of the three completion paths, which is why the screen -- and every
    // control underneath it -- could get stuck.
    const storyScreen = document.getElementById('story-screen');
    if (storyScreen) {
      storyScreen.classList.remove('active');
      storyScreen.style.removeProperty('display');
    }
    
    // Guard against double-firing if complete() is somehow reached twice
    // (e.g. a stray click after Skip already ran).
    const callback = this.onComplete;
    this.onComplete = null;
    this.currentScene = null;
    
    if (callback) {
      callback();
    }
  },
  
  skip() {
    this.complete();
  }
};

// Route selection screen — three careers, each locked to its theme.
// Classic WRC (cockpit), STREET Midnight Class, DAKAR Dust & Honor.
// The theme is set the moment the career is picked and the dock is locked
// for the run: themes can't carry over between stories.
const CAREER_ARCS = [
  {
    arc: null, theme: '', label: 'CLASSIC WRC', sub: 'COCKPIT THEME',
    hook: 'The paddock politics route. Factory offers, a troubled driver, and the girlfriend who blames you for every scratch.',
    stats: 'Driver Trust · Team Respect · Mental Stress',
    icon: 'bi-camera-reels'
  },
  {
    arc: 'street', theme: 'theme-street', label: 'MIDNIGHT CLASS', sub: 'STREET THEME · WANGAN',
    hook: 'You are a homeless kid sleeping in a dead coupe. An old Japanese tuner heard you call the Bayshore through a wall. Now you read for the fastest rookie in Yokohama — while the police net closes and Kenji hides a failing heart.',
    stats: 'Driver Trust · Team Respect · Grit · Legacy',
    icon: 'bi-lightning-charge'
  },
  {
    arc: 'roadbook', theme: 'theme-roadbook', label: 'DUST AND HONOR', sub: 'DAKAR THEME · ROADBOOK',
    hook: 'You grew up racing mud flats, until the crash that killed your first driver. Tarek — the mechanic who pulled you out — hands you a second seat beside a rookie with money and no fear. The erg keeps what it takes.',
    stats: 'Grit · Reputation · Legacy · Driver Trust',
    icon: 'bi-journal-bookmark'
  }
];

function showRouteSelection() {
  let selectScreen = document.getElementById('route-select');
  if (!selectScreen) {
    selectScreen = document.createElement('div');
    selectScreen.id = 'route-select';
    selectScreen.className = 'screen';
    document.body.appendChild(selectScreen);
  }
  
  /* Each card carries its discipline's photo + accent, so "choose your
     career" reads as three different worlds, not three grey boxes.
     Photos: Wikimedia Commons — wrc: Antti Leppänen, CC BY-SA 3.0;
     street: Morio, CC BY-SA 4.0; roadbook: Dakar organization, PD. */
  const ARC_MEDIA = {
    wrc: {
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Karl_Kruuda_Rally_Finland_2013_Surkee.jpg/960px-Karl_Kruuda_Rally_Finland_2013_Surkee.jpg',
      credit: 'Antti Leppänen · CC BY-SA 3.0 · Wikimedia'
    },
    street: {
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Route_5_%28Shuto_Expressway%29_night_2015_July.jpg/960px-Route_5_%28Shuto_Expressway%29_night_2015_July.jpg',
      credit: 'Morio · CC BY-SA 4.0 · Wikimedia'
    },
    roadbook: {
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Rally_Dakar_2009_14.jpg/960px-Rally_Dakar_2009_14.jpg',
      credit: 'Dakar organization · Public domain · Wikimedia'
    }
  };
  const arcCards = CAREER_ARCS.map((a, i) => {
    const disc = a.arc === 'street' ? 'street' : a.arc === 'roadbook' ? 'roadbook' : 'wrc';
    const m = ARC_MEDIA[disc];
    return `
    <button class="arc-card disc-${disc}" id="arc-${i}" onclick="pickArc(${i})" data-disc="${disc}">
      <span class="arc-photo" style="background-image:url('${m.img}')" aria-hidden="true"></span>
      <span class="arc-scrim" aria-hidden="true"></span>
      <span class="arc-body">
        <span class="arc-kicker"><i class="bi ${a.icon}"></i> ${a.sub}</span>
        <span class="arc-title">${a.label}</span>
        <span class="arc-hook">${a.hook}</span>
        <span class="arc-stats">Stats: ${a.stats}</span>
      </span>
      <span class="arc-credit">${m.credit}</span>
    </button>`;
  }).join('');
  
  selectScreen.innerHTML = `
    <div class="route-head"><i class="bi bi-signpost-split-fill" aria-hidden="true"></i> CHOOSE YOUR CAREER</div>
    <div class="route-sub">Three disciplines. Three co-drivers. One seat. Each career is a full story in its own world — the game locks to its theme while you play it.</div>
    <div class="arc-grid">${arcCards}</div>
    <div class="route-gender" id="gender-row" style="display:none">
      <div class="route-gender-title">YOUR VOICE</div>
      <div class="gender-btns">
        <button class="gender-btn" id="pick-male" onclick="pickGender('male')">MALE CO-DRIVER</button>
        <button class="gender-btn" id="pick-female" onclick="pickGender('female')">FEMALE CO-DRIVER</button>
      </div>
      <div class="route-gender-note">Both voices play the same story; some scenes land differently.</div>
    </div>`;
  
  show('route-select');
}

// Step 1: pick the career (locks the theme immediately)
function pickArc(i) {
  const a = CAREER_ARCS[i];
  window._pendingArc = a;
  // theme flips NOW so the selection screen itself re-skins to the chosen world
  if (typeof RpaTheme !== 'undefined') { try { RpaTheme.set(a.theme || null); } catch (e) {} }
  document.getElementById('gender-row').style.display = '';
  document.querySelectorAll('.arc-card').forEach((c, j) => c.classList.toggle('sel', j === i));
  document.getElementById('gender-row').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Step 2: pick the voice and start the story
function pickGender(g) { selectRoute(g); }
function selectRoute(route) {
  const a = window._pendingArc || CAREER_ARCS[0];
  StorySystem.selectRoute(route, a.arc);
  
  const intro = StorySystem.arcData()[route].intro;
  const introScene = {
    location: intro.location,
    dialogue: [
      { speaker: intro.speaker.toLowerCase(), text: intro.narrator }
    ],
    choices: [
      {
        text: a.arc === 'street' ? 'Take The Seat'
            : a.arc === 'roadbook' ? 'Sit Back In'
            : 'Begin Your Journey',
        consequence: {
          text: a.arc === 'street' ? 'Yokohama at midnight. Your voice is the law of the road now.'
              : a.arc === 'roadbook' ? 'The desert is patient. So are you. The season begins.'
              : 'The world of rally awaits. Your seat is ready.',
          stats: route === 'female' ? { grit: 10 } : { driverTrust: 5, mentalStress: 5 }
        }
      }
    ]
  };
  
  StoryUI.showScene(introScene, () => {
    openCareer();
  });
}

// Shared slot picker for pre/post stage story. See StorySystem.getStageContext
// (monotone chapter mapping) and StorySystem.pickScene (seen ledger) — together
// they guarantee the story advances round by round and never replays a scene.
function showStorySlot(kind, stageIndex, onComplete) {
  const route = StorySystem.state.genderRoute;
  if (!route) {
    onComplete();
    return;
  }

  const era = G.era || 'grpb';
  const ctx = StorySystem.getStageContext(era, stageIndex, kind);
  const chapters = StorySystem.chaptersFor(ctx);
  const picked = StorySystem.pickScene(chapters, ctx, kind);

  if (!picked) {
    onComplete();
    return;
  }

  // Stamp BEFORE showing: skipping with 'S' still counts as seen.
  StorySystem.markSceneSeen(picked);

  // Check for era variants (System 2)
  let sceneToShow = picked.entry.scene;
  if (sceneToShow && sceneToShow.eraVariants && sceneToShow.eraVariants[era]) {
    sceneToShow = {...sceneToShow, dialogue: sceneToShow.eraVariants[era].dialogue};
  }
  if (!sceneToShow) {
    onComplete();
    return;
  }
  StoryUI.showScene(sceneToShow, onComplete);
}

// Show story before a stage
function showPreStageStory(stageIndex, onComplete) {
  showStorySlot('pre', stageIndex, onComplete);
}

// Show story after a stage
function showPostStageStory(stageIndex, stageResult, onComplete) {
  showStorySlot('post', stageIndex, onComplete);
}

// Keyboard shortcut: 'S' skips the current story scene, matching the
// on-screen Skip Story button. Only acts while the story screen is
// actually showing, so it never interferes with the in-stage 'S' =
// skip-note shortcut used during a rally stage.
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 's') return;
  const storyScreen = document.getElementById('story-screen');
  if (!storyScreen || !storyScreen.classList.contains('active')) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  e.preventDefault();
  e.stopPropagation();
  StoryUI.skip();
});

// Initialize immediately when script loads (DOM may already be ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => StorySystem.init());
} else {
  StorySystem.init();
}
