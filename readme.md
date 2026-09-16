# TAKE ME TO THE HAIRPIN

**You're not the driver. You're the reason the driver survives.**

A high-intensity rally co-driver simulator where you read pacenotes under pressure, translate them instantly, and keep the car out of the trees.

Three playable worlds. Three complete stories. 30+ pixel-art cars. Voice input. A race engineer in the corner — no cloud AI, just an on-device notebook that studies your mistakes. This is the co-driver experience.

**© 2026 Eva-Liisa Aibast. All rights reserved. Personal / non-commercial use only** — want to use it another way, or work on it together? [Message me on GitHub.](https://github.com/EvaLiisaAibast)

------

## QUICK START

### Play in Browser (Recommended)

1. **Download or clone** the game files

2. **Open `index.html`** in any modern browser

3. **Start playing** — no installation, no server required

### Server Mode (Optional)

For account persistence, leaderboards, and enhanced features:

**Requirements:**
* Node.js 18+ (https://nodejs.org) — or [Bun](https://bun.sh), which runs it fine too
* npm (comes with Node.js)

**Setup:**
```bash
npm install
npm start
```
Then open `http://localhost:3000` in your browser.

---

### Voice Input Requirements

* **Microphone access** — for voice pacenote calls
* **Modern browser** — Chrome, Edge, Firefox, or Safari with Web Speech API support
* **Optional: Vosk WASM** — offline voice recognition (auto-downloads on first use)

---

## ABOUT THIS GAME

In rally racing, the most important role isn't behind the wheel.

It's the voice telling the driver what's coming next — at speed, without hesitation, and without mistakes.

Pacenotes look like this:

> **L3 !2 INTO R4**

You have seconds to process it.
Then you say:

> *"Left tight, caution hairpin, into right medium."*

Get it right — the stage continues.
Get it wrong — you might not.

**TAKE ME TO THE HAIRPIN turns that responsibility into a game.**

---

## THREE WORLDS, THREE THEMES

The game has three personalities. The theme you pick isn't a coat of paint — it changes your **garage, your stages, your gameplay gimmicks, and your story**. Themes are isolated: start a career in one world and the game locks to it until the career ends.

| | 🏁 COCKPIT | ⚡ STREET | 📕 ROADBOOK |
|---|---|---|---|
| **World** | Classic WRC paddock | Midnight Yokohama, the Wangan | Dakar, dust and honor |
| **Garage** | 18 legendary rally cars | 7 Wangan street legends | 6 Dakar machines |
| **Gimmicks** | Jemba-style notes, Killer B survival | Plan-your-route branch planner, random police pursuits with evade calls | Night Recon fuel pressure, Road Call blind recce |
| **Story** | Paddock politics, Mikko/Sofia | Homeless kid → old tuner Kenji | Mud racer saved from the crash |
| **Look** | Cockpit video, telemetry cam | Shibuya live clock, neon press-start type | Notebook paper, serif, ink stamps |

Switch themes anytime with the dock (bottom-left) — or commit to one by starting its career.

---

## KEY FEATURES

### Three Complete Careers

Pick a world at the career screen — each has its own cast, its own three-chapter story, male/female voice routes, and heavy drama:

* **CLASSIC WRC (Cockpit)** — the original route. Paddock politics, factory offers, a troubled driver, and the girlfriend who blames you for every scratch.
* **MIDNIGHT CLASS (Street)** — you're a homeless kid sleeping in a dead coupe. Kenji Okabe, 71-year-old ex-Mid Night Club engine builder, heard you call the Bayshore through a wall. Now you read for Haruto, the fastest rookie in Yokohama, while a sponsor tries to buy the team ("fear is content"), the police net closes, and Kenji hides a failing heart.
* **DUST AND HONOR (Roadbook)** — you grew up racing mud flats until the crash that killed your first driver. Tarek, the mechanic who pulled you out, gives you a second seat beside Amine — rich, fearless, broke. Rival Reznik burns through navigators. Youssef's mother arrives with oranges and one question three years in the making.

Every choice has consequences. Every story has multiple endings — inherit the shop, found the school, take the factory seat, or let the legend die with its maker.

📄 **Full script:** every line of dialogue for all three careers and both voice routes is in [DIALOGUE.md](DIALOGUE.md) (generated from the data files — ~3,300 lines, spoiler-heavy).

---

### Voice Input

* Speak real rally pacenotes using Web Speech API
* Offline Vosk WASM engine for reliable recognition with crash recovery
* Supports standard rally notation (1-6, square, hairpin, etc.)
* Training Mode (voice + typing) and Full Co-Driver Mode (voice only)
* Instant feedback on timing and accuracy
* Tight/right ambiguity tolerance for voice mode
* Considers up to 3 speech-recognition alternatives per result

---

### Real Time Pressure (the note loop)

* Reaction time measured **from note display** — and it feeds scoring
* **Symmetric early/late penalties**: calling before the note lands or hesitating both cost stage time
* Look-ahead pressure: stacked notes compress your window
* Timing verdicts (EARLY / SWEET / LATE) shown per note, tracked per stage
* Complexity-aware budgets — busy notes get more time, simple notes get less
* Pause-aware timing (P no longer corrupts your verdicts)

---

### The Race Engineer — statistics, not AI

A note-taking system built into the game (`pacenote-ai.js`) that runs **entirely in your browser's localStorage** — no server, no API key, no machine learning hype. Think of it as a team engineer with a clipboard: it watches every call you make and writes down what it sees.

* Every answered note folds into per-category leak tallies (direction / severity / each of 16 hazard words) and per timing habit
* Recent stages count more — a time-weighted average means "how you drive now" outweighs old history
* It forgives: keep calling directions right and an old weakness ages out of the numbers
* **The notebook** on the results debrief: leak detection, tempo signature, hazard memory, above/below your baseline
* **Race Engineer** banner on stage setup: your readiness read ("Competent, with a known weak flank. Watch the hesitation reflex.")
* **Live forecast chip** in-stage: "40% miss risk · ICE hazard" — warming amber, red when hot
* Personalized training-plan rows driven by your actual worst leak
* Honest evidence floors — it refuses to claim anything until it has 15+ notes of data. Tear up the notes anytime from the debrief.

No generative AI is used anywhere in this game; every "read" is plain arithmetic over your own results.

---

### The Co-Driver Debrief

Every stage ends with a full post-stage analysis, not a score dump:

* **Itemized miss diagnosis** — every failed note: the verdict, the answer key, what you called, and per-part coaching (direction, severity, modifiers, invented hazards)
* **Pattern analysis** — fatigue collapse, cold start, hesitation habit, rushing the call, timeout clusters, direction confusion, dropping hazards — with real advice, not filler
* **Training plan** — prioritized drills with one-click jumps into Tutorial, Vocabulary, Recce, or a targeted Quick Stage

---

### Game Modes

| Mode | What it is |
|---|---|
| **Quick Stage** | Straight into a stage, any era/theme, difficulty of your choice |
| **Career Mode** | Six-round championship inside one of the three story worlds |
| **Recce & Call-Back** | Watch the stage once, write your own shorthand, then call it back blind — the real co-driver skill |
| **Wangan Run** (Street) | Pick a branch per segment, build your own route, then run it — police pursuits can trigger and you type the evade word to escape |
| **Night Recon** (Roadbook) | Fuel-pressure management across a night stage |
| **Road Call** (Roadbook) | Blind-row recce mechanic on real stages |
| **Killer B Survival** (Cockpit) | Group B strain survival mode |
| **Training School** | Vocabulary, drills, tutorials |
| **Interactive Tutorial** | Taught with the game's own tulip diagrams |
| **Daily / Weekly Challenge** | Seeded stages against the clock |
| **Multiplayer** | LAN / P2P lobbies (socket.io + PeerJS) |

---

### 30+ Cars Across Three Garages

**Classic WRC garage (pixel art):**

* **Group B** — MG Metro 6R4, Audi Sport Quattro, Lancia 037, Peugeot 205 T16, Ford RS2000, Renault 5 Maxi
* **WRC 90s** — Mitsubishi Lancer Evo IV, Ford Escort WRC, SEAT Córdoba WRC, Škoda Octavia WRC, Subaru Impreza WRC97, Toyota Corolla WRC
* **Rally2/R5** — Citroën C3 Rally2, Škoda Fabia R5 Rally2, VW Polo GTI R5
* **Modern Rally1** — Ford Puma Rally1, Hyundai i20N Rally1, Toyota GR Yaris Rally1

**Wangan garage (Street):** Nissan Skyline GT-R R32 & R34, Toyota Supra, Mazda RX-7, Honda NSX, Porsche 930, Nissan Fairlady Z32 — each with museum-plaque history in the car detail modal

**Dakar garage (Roadbook):** Toyota Hilux T1+, Mini John Cooper Works Rally, Mitsubishi Pajero & Lancer, KAMAZ Master truck, VW Race Touareg

Every car: pixel-art sprite, unique stats (acceleration, handling, stability, turbo lag), and a full description. The launch screen's convoy rolls the whole mixed garage past you.

---

### Car Tuning System

* Realistic tuning options: ARB stiffness, damping, turbo boost, brake bias, tire pressure
* Car stats affect gameplay — stability reduces damage, handling reduces crash probability
* Visible tuning warnings — see consequences before the stage
* Preset setups: Safe, Attack, Gravel, Tarmac, Ice/Snow

---

### Real Rally Conventions

* Jemba-style 1–6 severity ladder, real modifier vocabulary (DON'T CUT, CREST, CAUTION, ICE, INTO, TIGHTENS...)
* In-game cheat sheet that's actually correct (5 = Open, 6 = fast sweep)
* Mistake analyzer that understands multi-word terms and MAYBE/SAND/RUTS/WATER/ROCKS
* Driver Profiles: 4 distinct pacenote notation styles assigned per career round, with briefing modals and on-screen symbol remapping
* Tulip diagrams drawn in SVG for every note — including long-exit dashes

---

### Adaptive Difficulty & Team Management

* Weather conditions affect visibility and reaction time
* Streak bonuses, momentum multiplier, urgency modifiers
* Story-driven difficulty changes (driver stress, intoxication)
* Budget system, hireable staff (4 positions), 4 tire compounds — all feeding crash-probability and timing

---

### Achievements & Analytics

* Achievement system with persistent progress and unlock notifications
* Per-stage accuracy, reaction-time tracking, performance timeline visualization
* Statistics across cars and eras
* Structured playtest log kept in `PLAYTESTS.md`

---

### Audio & Presentation

* Custom WebAudio launch sting — starter motor, engine rev, title ping (no audio files)
* Voice-volume slider actually drives co-driver calls, translations and commentator
* Per-theme soundscapes and type: Press Start 2P neon (Street), notebook serif (Roadbook), Bebas cockpit (Classic)
* Studio launch sequence: self-drawing hairpin tulip ident, title slam, walkthrough, and the pixel-car convoy
* Theme cards on the splash are real selectors — pick your world before the menu
* Fully responsive, reduced-motion safe, no emoji — Bootstrap Icons throughout

---

## WHAT THIS GAME IS

* A **co-driver simulator**
* A **voice-controlled pacenote recognition challenge**
* A game about **processing information under pressure**
* A **narrative-driven career experience** — now in three different racing worlds

---

## WHAT THIS GAME IS NOT

* Not a driving simulator
* Not a physics-based racing game
* Not primarily a multiplayer game — LAN/online play exists but is secondary to the single-player career experience
* Not forgiving

---

## SYSTEM REQUIREMENTS

* **Browser:** Chrome, Edge, Firefox, or Safari (modern version)
* **Microphone:** Required for voice input
* **Internet:** Required for Vosk model download (first-time only) and Wikimedia-hosted theme photos
* **Storage:** ~60MB for game files

Runs on desktop and mobile browsers.

---

## CONTROLS

### Voice Input
* Speak pacenotes naturally (e.g., "Left three, caution hairpin, into right medium")
* Microphone activates automatically in voice-only mode
* Supports standard rally notation and variations

### Keyboard
* **Enter** — Submit typed answer
* **S** — Skip story dialogue (outside the input) / skip note (in stage)
* **H** — Help overlay
* **P** — Pause
* **Escape** — Pause menu

---

## CREDITS & LICENSE

**Game made by Eva-Liisa Aibast** — [github.com/EvaLiisaAibast](https://github.com/EvaLiisaAibast)

© 2026 Eva-Liisa Aibast. All rights reserved. Personal / non-commercial use only.

* Theme photographs via Wikimedia Commons (CC licensed — see in-game credits)
* CARTO basemaps for the map views; OpenStreetMap contributors
* Bootstrap Icons
* Vosk WASM for offline speech recognition

---

## PROJECT STATUS

Active student project with regular updates. See `PLAYTESTS.md` for the honest, structured playtest log — what was tested, what broke, what got fixed.

---

## FINAL WORD

Rally drivers don't see the road ahead.

They trust the voice beside them.

**Now that voice is you — in Tokyo, in the desert, or on the classic stages.**
