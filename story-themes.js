// ============================================================================
// story-themes.js — per-THEME story arcs for Take Me to the Hairpin
// ============================================================================
// The classic WRC career (StoryData in story_data.js, cockpit theme) already
// existed. This file adds two full, standalone careers keyed to the other
// themes. Each has male + female routes, three chapters, heavy drama, and
// its own cast — none of it bleeds into the other careers.
//
//   STREET  (theme-street)  — "MIDNIGHT CLASS"
//     You are a homeless kid sleeping in a dead Mazda in a Yokohama
//     parking structure. An old Japanese tuner — Kenji Okabe, once the
//     engine builder of the Mid Night Club — hears you call a corner
//     against a radio broadcast and puts you in the passenger seat.
//     Drama: the club's old code vs. new money crews, a rookie driver
//     who worships speed but has never feared it, the police net
//     closing on the Wangan, and Kenji's failing heart that he hides
//     from everyone.
//
//   DAKAR   (theme-roadbook) — "DUST AND HONOR"
//     You grew up racing through the mud flats after the rains, until
//     the crash that killed your first driver and very nearly you.
//     Pulled from the wreck by Tarek, a veteran Dakar mechanic who lost
//     his own co-driver years ago, you get a second chance on the
//     biggest rally in the world. Drama: the mechanical sympathy a
//     broken car demands, a rival who blame-tweets his navigators into
//     oblivion, sandstorms, and whether you can sit back in a seat
//     that killed someone.
//
// Data shape mirrors StoryData exactly: { street: {male, female},
// roadbook: {male, female} }, each route having intro + chapter1..3 with
// preStage/postStage scene arrays consumed by the existing StoryUI.
// ============================================================================

const ThemeStoryData = {

  // ==========================================================================
  // STREET — "MIDNIGHT CLASS"
  // ==========================================================================
  street: {

    male: {
      intro: {
        narrator: `The Wangan doesn't care where you slept last night.
You called every corner of that expressway from the hood of a dead car,
eyes closed, matching a radio broadcast corner for corner.
The old man heard you. He builds engines for people whose names are never printed.
Tonight you find out if your voice is worth anything at 300 kilometres an hour.`,
        location: 'YOKOHAMA · DAIKOKU PA · 02:40',
        speaker: 'Narrator'
      },

      chapter1: {
        preStage: [
          {
            id: 'meeting_kenji',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · BACK OF THE YARD · 23:10',
              background: 'street_garage',
              dialogue: [
                { speaker: 'narrator', text: 'The garage smells like machine oil and old cigarettes. Kenji Okabe is seventy-one years old and his hands shake until they touch an engine. He kicks a crate out from under the workbench. It is the closest thing to a welcome he offers.' },
                { speaker: 'kenji', text: 'You slept in the red coupe out back. Four weeks. I let it slide because a man who is quiet is not necessarily stupid. Last night I heard you reading the road to yourself through the wall. You have never sat in a race car. Explain yourself.', emotion: 'gruff' },
                { speaker: 'you', text: 'I called every corner of the Bayshore loop against the radio feed. Called the camera vans too. Got three out of four wrong. But the fourth was the Yokohane split, and the broadcast got it wrong and I got it right.' },
                { speaker: 'kenji', text: 'Hm. The split kills better drivers than the radio. Listen. My driver is Haruto — twenty-two, faster than sense, sponsored by people who want him loud and disposable. His last co-driver quit on the starting line. You will sit next to him. You will keep him alive. In exchange: the flat above the shop and two meals a day. Do not make me regret charity.' }
              ],
              choices: [
                {
                  text: '"You heard one night. Why spend a seat on a stranger?"',
                  consequence: {
                    text: 'Kenji: (lights a cigarette with hands that barely shake)\n\nKenji: Because thirty-eight years ago I slept in a car too, and an old tuner heard me reading a map by streetlight. Nobody gave me a seat. I built one. Tonight I am doing it again, and I hate that I am sentimental, and I will deny this conversation happened.',
                    stats: { driverTrust: 10, teamRespect: 10, mentalStress: -5 },
                    flags: { kenjiBackstory: true }
                  }
                },
                {
                  text: '"Deal. But I say what gets called. His car, my voice."',
                  consequence: {
                    text: 'Kenji: (laughs, a real one, then coughs it away)\n\nKenji: Listen to this. Three weeks off the street and he negotiates like the Yakuza. Fine. Your calls are law in that car. Haruto will hate it. Haruto will do it, because I will tell him to. Just know that pride is expensive on the Wangan, boy.',
                    stats: { driverTrust: 5, teamRespect: 15, mentalStress: 5 },
                    flags: { voiceAuthority: true }
                  }
                },
                {
                  text: '"I owe you nothing. This is a job, not a debt."',
                  consequence: {
                    text: 'Kenji: (smoke curls toward the exhaust fan)\n\nKenji: Good. Debts make bad partnerships. The street people who owe each other everything die together in ditches. You work for the seat. The seat works for you. Nothing owed, everything earned. Now get some sleep, you look like a salvage job.',
                    stats: { teamRespect: 10, grit: 10 },
                    flags: { noDebts: true }
                  }
                }
              ]
            }
          },
          {
            id: 'meeting_haruto',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'DAIKOKU PA · UNDER THE LIGHTS · 01:55',
              dialogue: [
                { speaker: 'narrator', text: 'Haruto Sato leans against the Supra like the car belongs to him and he belongs to the city. Both are true. He does not look at you when he talks. He looks at the tunnel.' },
                { speaker: 'haruto', text: 'Kenji says you read the road like you invented it. Cool. But let me be clear about what you are. You are a seat-warmer with a good mouth. When I say push, the call is push. When I feel a line, the line is mine. Keep up or keep quiet.' }
              ],
              choices: [
                {
                  text: '"When you are sideways at 280, my mouth is the only thing between you and the guardrail."',
                  consequence: {
                    text: 'Haruto: (finally looks at you — a quick, hungry read)\n\nHaruto: There it is. Kenji said you had a spine. Okay, seat-warmer. Call it clean and I will drive it clean. Flinch on a call and I will take the line from you mid-corner. I have done it before. Ask the last guy. Oh wait — he quit before I could.',
                    stats: { driverTrust: 15, mentalStress: 5 },
                    flags: { harutoRespects: true }
                  }
                },
                {
                  text: '"You take a line against my call, I stop reading. Both of us eat the wall or neither."',
                  consequence: {
                    text: 'Haruto: (grins, sharp)\n\nHaruto: Mutual destruction pact. I can work with that. Kenji will lose his mind. He thinks the car is precious. The car is metal, old man. Metal burns. Anyway — first run is yours. Impress me.',
                    stats: { driverTrust: 10, teamRespect: 5, mentalStress: 10 },
                    flags: { mutualDestruction: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'first_run_aftermath',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · 04:20',
              dialogue: [
                { speaker: 'narrator', text: 'The Supra cools in the yard, ticking like a clock. Kenji is under it with a flashlight in his teeth. He speaks to the undercarriage instead of to you.' },
                { speaker: 'kenji', text: 'Brake dust pattern says he took the tunnel gap two clicks faster than your call. Says here you kept reading. Kept reading while the car did something the call did not say. That is either loyalty or stupidity, and from this angle they look identical.' },
                { speaker: 'you', text: 'It was both. It is always going to be both with him, isn\'t it.' },
                { speaker: 'kenji', text: 'It was always both with everyone I ever built for. Go to sleep. Same time tomorrow. And kid — the flat above the shop. It is yours. It has a lock. First door in four weeks that locks from the inside. Try not to look so surprised about it.' }
              ],
              choices: [
                {
                  text: 'Say thank you.',
                  consequence: {
                    text: 'Kenji: (does not look up from the brakes)\n\nKenji: Don\'t. Gratitude makes everything sound finished. Nothing here is finished. Eat something and sleep. That is the whole ceremony.',
                    stats: { driverTrust: 5, teamRespect: 5, mentalStress: -10 },
                    flags: { firstDoor: true }
                  }
                },
                {
                  text: 'Pick up a wrench and start on the other side.',
                  consequence: {
                    text: 'Kenji: (pause. The flashlight beam steadies on your hands)\n\nKenji: ...Huh. Left-hand thread, and you knew it without asking. Maybe the radio missed something. Maybe I did. Keep those hands where they are useful, kid.',
                    stats: { teamRespect: 15, grit: 5 },
                    flags: { mechanicHands: true }
                  }
                }
              ]
            }
          },
          {
            id: 'police_pressure',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · POLICE SCANNER STILL WARM · 03:15',
              dialogue: [
                { speaker: 'narrator', text: 'Two scanner calls tonight, both with the word "Daikoku" in them. Haruto is filming his shoes for his feed. Kenji has not said a word since midnight, which by his standards is a screaming match.' },
                { speaker: 'kenji', text: 'The club I built had one rule that mattered: you never made the police a show. Speed on the empty road, respect the public, and the city looked away. These new crews film everything. Eat everything. And now there is a task force with a list, and the list has my old crest on it.' }
              ],
              choices: [
                {
                  text: '"Then we run quieter. Fewer runs, cleaner runs, no cameras."',
                  consequence: {
                    text: 'Kenji: (nods slowly, once)\n\nKenji: Quieter. Yes. You sound like the old rulebook. Haruto will call it weakness. Let him. The grave is full of loud drivers and the list is full of loud crews. We run like ghosts or we do not run at all.',
                    stats: { teamRespect: 10, mentalStress: -5 },
                    flags: { ghostRuns: true }
                  }
                },
                {
                  text: '"Or we get loud once, big, and buy our way out of the spotlight with one perfect run."',
                  consequence: {
                    text: 'Haruto: (head snaps up from the phone)\n\nHaruto: NOW he gets it. One perfect run. Legends over safety, exactly. Kenji, tell him he is an idiot. Kenji. Tell him.\n\nKenji: ...The idiot is not wrong. One flawless run buys more silence than a year of hiding. It is also the fastest way to die I know of. We will discuss it. We will not decide it tonight.',
                    stats: { driverTrust: 10, teamRespect: -5, mentalStress: 10 },
                    flags: { oneBigRun: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter2: {
        preStage: [
          {
            id: 'the_offer',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'MINATO MIRAI · SPONSOR SUITE · 22:00',
              dialogue: [
                { speaker: 'narrator', text: 'The sponsor suite smells like money that has never been cold. A man in a jacket worth your whole building slides a folder across the table. The folder has Haruto\'s times in it and Kenji\'s old crest on it and your name in a field labeled ASSETS.' },
                { speaker: 'mori', text: 'Mori Ryosuke, Aegis Racing Development. We are buying three Wangan teams and merging them into one program. Real money. Real cars. The old man\'s engines, my budget, your boy\'s face. All we ask is the loud stuff. All of it. Feeds, stunts, police bait. Fear is content, kid.' },
                { speaker: 'kenji', text: 'And I ask the opposite. Quiet roads, clean runs, the way the club survived thirty years. Choose, co-driver. Whatever you choose, Haruto will follow. He follows you now. He has not told you that, so I am telling you.' }
              ],
              choices: [
                {
                  text: '"We stay clean. Haruto is a driver, not content."',
                  consequence: {
                    text: 'Mori: (closes the folder, smiles like a toll gate)\n\nMori: Sentiment. Charming. Then Aegis buys your competition instead, and when they bury you in the standings remember this room had your name in it. Kenji — the engines will still be beautiful. Pity about the reach.\n\nKenji: (at the elevator) You just chose like a member of the old club. I have not heard that choice made out loud in twenty years.',
                    stats: { teamRespect: 15, grit: 10, driverTrust: 10 },
                    flags: { refusedAegis: true }
                  }
                },
                {
                  text: '"Show me the money. All of it. Then I decide what it costs."',
                  consequence: {
                    text: 'Mori: (slides a number across the table that could rebuild a neighborhood)\n\nMori: Smart. Negotiate, don\'t moralize. The offer follows you either way. First test run is under my banner in two weeks. Wear the patch, spend the money. Kenji, your face is doing something wonderful.\n\nKenji: My face is doing arithmetic. Money buys brakes, boy. It does not buy the road back once the city decides what you are.',
                    stats: { reputation: 15, teamRespect: -10, mentalStress: 10 },
                    flags: { courtedAegis: true }
                  }
                }
              ]
            }
          },
          {
            id: 'kenjis_heart',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · AMBULANCE LIGHTS FADING · 05:05',
              dialogue: [
                { speaker: 'narrator', text: 'It happened at the workbench, mid-valve-adjustment. The paramedics called it a warning, not an ending. Kenji is arguing with them in a voice like torn paper. He signs his own discharge risk form with a wrench-steady hand that shook all morning holding coffee.' },
                { speaker: 'kenji', text: 'Sit down. You look like a witness. I am fine. The heart is seventy-one years old, like the rest of me, and it is entitled to complain. What matters: the balancing on car three is wrong, the Shimamoto tune runs rich in the rain, and you are the only one in this shop Haruto cannot lie to. So you will carry more. Starting tonight.' },
                { speaker: 'you', text: 'You should not be alone in this shop. And you should not be tuning engines six hours after your heart files a complaint.' },
                { speaker: 'kenji', text: 'And you should not have been sleeping in a coupe, and here we both are. The shop does not close because flesh is temporary. Now — do you tell Haruto what happened, or do we let him drive fast on a peaceful heart? Choose. He reads people faster than roads.' }
              ],
              choices: [
                {
                  text: '"Haruto knows. He deserves the weight of it."',
                  consequence: {
                    text: 'Haruto: (very quiet, for him)\n\nHaruto: ...He was tuning engines before my dad was born. Fine. FINE. I will drive smoother. Not slower — smoother. There is a difference, and it is the only concession I have got in me. Tell him if he dies I am selling the Supra to Mori.\n\nKenji: (from the cot) The threat is noted and appreciated.',
                    stats: { driverTrust: 15, teamRespect: 10 },
                    flags: { harutoKnows: true }
                  }
                },
                {
                  text: '"He never knows. The team stays light."',
                  consequence: {
                    text: 'Kenji: (grim approval)\n\nKenji: The old way. A crew carries its dead and its sick quietly, so the driver only ever races the road. It is a hard promise you are making. The night I collapse for real, you will be the one holding the phone, choosing what to say. Live with that now, so you can live with it later.',
                    stats: { grit: 15, mentalStress: 15 },
                    flags: { carryingItAlone: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'aegis_ambush',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'TUNNEL EXIT · DAWN · 05:40',
              dialogue: [
                { speaker: 'narrator', text: 'Aegis Racing\'s GTR is parked across the tunnel mouth like a cheque nobody will cash. Mori steps out in driving shoes that have never seen gravel.' },
                { speaker: 'mori', text: 'Nice run. Clean. Quiet. Boring as a tax form — which is my whole problem with it. Haruto, baby, my offer now includes a spot in the World Time Attack shoot-out. Cameras on ten million screens. All you have to do is stop letting the paperboy steer.' },
                { speaker: 'haruto', text: '(long pause — you watch his jaw work)\n\nHaruto: The paperboy kept me off the wall tonight. Three times. I counted. Ask your telemetries guy how many times Aegis drivers got kept off the wall. ...I\'m out, Mori. Tell your sponsors the kid from the parking structure calls a better race than their money does.' }
              ],
              choices: [
                {
                  text: 'Say nothing. Let Haruto have the moment.',
                  consequence: {
                    text: 'Mori: (gets back into the GTR)\n\nMori: Sentiment, again. It always costs the same, and the price goes up. — He is gone before the tunnel echo dies.\n\nKenji: (on the radio, from the shop) I heard all of it. Kid... twenty years I have wanted to hear someone refuse that man. I am turning the shop lights on. Come home before dawn and we will eat like kings. Rice and something that was once a fish.',
                    stats: { driverTrust: 20, teamRespect: 10, mentalStress: -10 },
                    flags: { harutoLoyal: true }
                  }
                },
                {
                  text: '"He counts your wall saves. That is the whole pitch, Mori. Now move your car."',
                  consequence: {
                    text: 'Mori: (wheels turning, recalculating)\n\nMori: The street rat has a tongue. Noted. — He moves the GTR. As he passes: I bought two other teams this month. You will race my cars whether you drive for me or not. Think about which seat you want them in.\n\nHaruto: ( exhale ) ...Thanks. Don\'t make it weird. Race tomorrow. Same rules. My line, your voice.',
                    stats: { driverTrust: 10, teamRespect: 15, reputation: 10 },
                    flags: { confrontedMori: true }
                  }
                }
              ]
            }
          },
          {
            id: 'the_net_tightens',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · CHECKPOINTS ON THE SCANNER · 23:50',
              dialogue: [
                { speaker: 'narrator', text: 'They have started impounding at the on-ramps. Not chasing — waiting. The task force learned what Kenji\'s generation knew: you do not catch a Wangan car by driving. You catch it by making the city smaller.' },
                { speaker: 'kenji', text: 'Shimamoto\'s crew was taken at the Yokohane ramp tonight. Cars in the impound, names in the paper. His lead tuner is eighteen. Eighteen, and he is looking at the same list my crest is on. One more run on those roads and the shop is finished — not from a crash. From paperwork.' }
              ],
              choices: [
                {
                  text: '"One last run. The loop, at dawn, empty. Then we go quiet for good."',
                  consequence: {
                    text: 'Kenji: (long exhale — smoke, then something older than smoke)\n\nKenji: The last run. Every generation of the club promised itself one more. Dawn is right, though. Empty roads, full heart, and after — the shop becomes legal or it becomes closed, but nobody adds a name to the list. I will build the map. You make the call sheet. Make it gentle, co-driver. Dawn roads forgive, but I do not want to test it.',
                    stats: { driverTrust: 15, grit: 10, mentalStress: 5 },
                    flags: { lastRunPlanned: true }
                  }
                },
                {
                  text: '"We stop tonight. The runs end before the list ends us."',
                  consequence: {
                    text: 'Haruto: (slams a toolbox — then, worse, goes quiet)\n\nHaruto: ...Fine. Yeah. Okay. The Supra goes in the container with the club cars. History is for museums. — He does not look at you all night. Kenji does, once, with something like relief and something like grief. The shop smells like ended things.',
                    stats: { teamRespect: 10, mentalStress: -15, driverTrust: -10 },
                    flags: { endedEarly: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter3: {
        preStage: [
          {
            id: 'sponsoring_the_ghost',
            condition: (ctx) => ctx.isLastPreOfChapter,
            scene: {
              location: 'OKABE GARAGE · RAINY TUESDAY · 19:40',
              dialogue: [
                { speaker: 'narrator', text: 'Between the big nights there are the small ones. Mori Ryosuke’s people left a contract on the bench — “Team Aegis” in expensive print, a number with two commas, and a clause that hands them the crest if you ever finish off the podium twice in a row. Kenji has not touched it. He has instead rebuilt the red coupe’s carburetor for the fourth time this month, for a car that will never run, while his pills sit unopened on the windowsill.' },
                { speaker: 'kenji', text: 'Sign it or burn it, but decide by Friday. And before you ask — yes, I met Mori in 1991. He shook my hand with a stopwatch in his pocket and timed how long I would talk. That is the whole man. Everything is a lap to people like that. Do not let him lap YOU.' }
              ],
              choices: [
                {
                  text: '“We decline. The shop does not sell its name.”',
                  consequence: {
                    text: 'Kenji: (slides the contract into the parts drawer marked SCRAP)\n\nKenji: Correct answer. Aegis wants the crest because it is the only thing on this street they could not buy new. Burn yours too — Mori keeps copies. He always keeps copies.',
                    stats: { teamRespect: 15, legacy: 10, mentalStress: 5 },
                    flags: { refusedAegis: true }
                  }
                },
                {
                  text: '“We sign — but the crest stays ours, on paper, in ink.”',
                  consequence: {
                    text: 'Kenji: (reads the amendment twice, then laughs until he coughs)\n\nKenji: A lawyer in the family after all. Fine — take their money and their dyno time. But when they come for the name, and they will, remember this week. The contract protects us exactly as long as we are useful.',
                    stats: { reputation: 20, mentalStress: 15 },
                    flags: { signedAegis: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_impound_list',
            condition: (ctx) => ctx.isChapterEnd,
            scene: {
              location: 'YOKOHAMA · GARAGE FRIDGE · 01:12',
              dialogue: [
                { speaker: 'narrator', text: 'The next crackdown list comes down like weather. Shimamoto’s crew got swept Monday; their Supra sits in the city pound between a stolen scooter and a hearse. Haruto tapes the news clipping to the garage fridge and says nothing all night, which from Haruto is a shout.' },
                { speaker: 'haruto', text: 'They clocked a Skyline doing 289 on the Yokohane. 289. The thread is calling him the last king and calling US the last kings’ cousins, which feels less cool from inside the cousin seat. Kenji says the fast ones never get caught — only the visible ones. So the question is: how visible do we want the last few runs to be?' }
              ],
              choices: [
                {
                  text: '“Quiet ones. Unlisted roads. We finish the season invisible.”',
                  consequence: {
                    text: 'Haruto: (takes the clipping off the fridge and folds it into his wallet)\n\nHaruto: Quiet it is. Funny — Kenji said the club’s best nights never made any list. Now neither will ours. — The next three runs happen on unmarked service roads under a half moon, and they are, and you can both admit it, the cleanest calls of the year.',
                    stats: { grit: 10, reputation: -5, mentalStress: -10 },
                    flags: { wentQuiet: true }
                  }
                },
                {
                  text: '“Loud ones. If the scene ends, it ends on OUR name, not the police log.”',
                  consequence: {
                    text: 'Haruto: (grins like the first night you met him)\n\nHaruto: Loud. Yeah. Okay. If the city is taking names anyway, let them spell ours right. — Word gets around by Thursday: the Okabe car runs the old crest, full send, last season. Half the island shows up just to watch you two drive history one more time.',
                    stats: { reputation: 15, driverTrust: 10, mentalStress: 10 },
                    flags: { wentLoud: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter4: {
        preStage: [
          {
            id: 'the_last_run',
            condition: (ctx) => ctx.isFinalRound,
            scene: {
              location: 'THE WANGAN · DAWN · 04:59',
              dialogue: [
                { speaker: 'narrator', text: 'The city gives you forty minutes of mercy before the traffic wakes. The Supra idles at the ramp like a held breath. Kenji is here — he should not be, his doctor definitely has opinions, and he stands there anyway with the stopwatch he has carried since 1987.' },
                { speaker: 'kenji', text: 'Boys. The club had a saying for this. Not "go fast." We said: COME HOME. Every run, every night, thirty years. Come home. That is the whole religion. Call it clean, drive it whole, and come home.' },
                { speaker: 'haruto', text: '(quiet, checking the map one last time)\n\nHaruto: Last one. After this I go be... normal? University. Insurance something. My mom already has pamphlets. — He looks at you. Whatever happens up there: best seat I ever had. Don\'t tell Kenji, he will cry and deny it.' }
              ],
              choices: [
                {
                  text: '"Call it like I always do. You come home to me. That is the deal."',
                  consequence: {
                    text: 'Haruto: (bumps your fist against the roll cage)\n\nHaruto: Deal. And hey — when my kid asks about the old days, you are telling it. You are the one with the voice for it. Three. Two. One. — The city swallows you whole, and for eleven minutes it belongs to you.',
                    stats: { driverTrust: 25, mentalStress: -10, legacy: 10 },
                    flags: { homeTogether: true }
                  }
                },
                {
                  text: '"Tell your kid the truth: we were never legends. We were careful. That is why we lived."',
                  consequence: {
                    text: 'Kenji: (closes his eyes, the stopwatch still)\n\nKenji: ...That. That is the crest speech. I have waited thirty years for someone to say it so I did not have to. The club is not the speed, boy. It never was. Go. Both of you. Come home.',
                    stats: { teamRespect: 20, legacy: 15, grit: 10 },
                    flags: { crestSpeech: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'what_the_shop_became',
            condition: (ctx) => true,
            scene: {
              location: 'OKABE GARAGE · ONE YEAR LATER',
              dialogue: [
                { speaker: 'narrator', text: 'The list got Shimamoto\'s crew and two others. It never got yours. The shop still stands: half of it legal classics now, Kenji\'s crest on the wall in a frame the fire marshal made him buy. The red coupe out back still does not run. Kenji refuses to fix it. You know better than to ask why.' },
                { speaker: 'kenji', text: 'Sit. The new kids in the back bay are slow and polite and they think a boost gauge is technology. I let them believe it. Meanwhile: Haruto passed his insurance exams. Sends me a postcard every quarter, signs it "the last co-driver." I framed the first one and denied crying about it.' },
                { speaker: 'kenji', text: 'You. The sign above the bench says OKABE & CO. It should say OKABE & SON. Not blood. Better than blood. If you want it, it is yours. The shop, the crest, the whole stubborn thing. Choose fast, my heart is old, and I hate saying sentimental things twice.' }
              ],
              choices: [
                {
                  text: 'Take the crest. Keep the shop alive.',
                  consequence: {
                    text: 'Kenji: (hands over the stopwatch too — 1987 to now, no ceremonies)\n\nKenji: Then it is done. Teach the polite kids the old rule first: the runs end before the names go on lists. Come home. Everything else is decoration. — The neon over the door gets rewired that winter. It reads OKABE & SON. Nobody who knows asks who the son is. Everybody who matters knows.',
                    stats: { legacy: 30, teamRespect: 20, grit: 10 },
                    flags: { heirChosen: true }
                  }
                },
                {
                  text: 'Refuse kindly. The shop should end with its maker.',
                  consequence: {
                    text: 'Kenji: (a long, real laugh — then a cough, then a nod)\n\nKenji: Correct. Sentimental of me to ask. Practical of you to refuse. Then we do it my way: the shop closes when I do, the crest goes in the case with the stopwatch, and YOU keep the voice. Voices outlive metal. Write your runs down somewhere, boy. Someone in fifty years is going to read them and understand the whole religion in one page. — He dies in the spring, mid-valve-adjustment, hands steady to the last. The coupe out back stays broken forever.',
                    stats: { legacy: 25, mentalStress: 10, grit: 15 },
                    flags: { theEndOwnsItself: true }
                  }
                }
              ]
            }
          }
        ]
      }
    },

    female: {
      intro: {
        narrator: `The Wangan doesn't care where you slept last night — and it
has never once, in thirty years, expected the voice coming out of that
passenger seat to be a girl's. You called every corner of the Bayshore
loop from the hood of a dead car, eyes closed, against a radio broadcast.
The old man heard you. Tonight you find out if the city can hear you too.`,
        location: 'YOKOHAMA · DAIKOKU PA · 02:40',
        speaker: 'Narrator'
      },

      chapter1: {
        preStage: [
          {
            id: 'meeting_kenji',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · BACK OF THE YARD · 23:10',
              dialogue: [
                { speaker: 'narrator', text: 'The garage smells like machine oil and old cigarettes. Kenji Okabe is seventy-one, and his hands shake until they touch an engine. He looks at you longer than is comfortable. Not because you slept in his spare coupe. Because he is doing arithmetic about the world and does not like the answer.' },
                { speaker: 'kenji', text: 'Four weeks in my coupe and never once asked for anything. Last night I heard you reading the Bayshore to yourself through the wall — every corner, every camera van. When Haruto\'s people post the seat opening, they will tell you a girl in the passenger seat is a marketing problem. I have outlived caring what people post. Sit. Talk.' },
                { speaker: 'you', text: 'I called the Yokohane split against the broadcast and got it right when they got it wrong. That is the whole pitch. That is everything I have.' },
                { speaker: 'kenji', text: 'The split. Hm. My old club\'s rule was simpler than gender: can you read the road, and will you come home. Everything else is decoration. Haruto is my problem — twenty-two, sponsored, faster than sense. His last co-driver quit. The seat is yours if you want a door that locks from the inside.' }
              ],
              choices: [
                {
                  text: '"I want the seat. Not the charity. I earn every run."',
                  consequence: {
                    text: 'Kenji: (the first thing resembling a smile)\n\nKenji: Good. Charity is how this city buys people. Runs are how they are earned. You earn the seat per run. First run is tomorrow, dawn loop, and if you read it clean nobody in this shop will mention gender again — I will personally handle anyone who does.',
                    stats: { grit: 15, teamRespect: 10 },
                    flags: { earnsIt: true }
                  }
                },
                {
                  text: '"And if Haruto has a problem with a girl reading his race?"',
                  consequence: {
                    text: 'Kenji: (smoke, and a long look)\n\nKenji: Then Haruto has a problem with me, and my problem has solved itself for seventy-one years by being louder. I built engines for the Mid Night Club when half the country thought the club was a myth. Let the boy discover his co-driver is a fact, not an opinion. He will. On the first tunnel run. Facts are persuasive at 280.',
                    stats: { driverTrust: 10, grit: 10 },
                    flags: { factNotOpinion: true }
                  }
                }
              ]
            }
          },
          {
            id: 'meeting_haruto',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'DAIKOKU PA · UNDER THE LIGHTS · 01:55',
              dialogue: [
                { speaker: 'narrator', text: 'Haruto Sato leans against the Supra, filming a shoe-angle shot for his feed. He clocks you, does a double take at the helmet under your arm, and his face does something complicated.' },
                { speaker: 'haruto', text: 'Kenji said... okay, Kenji said a lot of words. Bottom line: you are my new reader. Look, no offense, but my sponsor edits around optics. A girl calling my race is going to be the whole comment section. Can your voice carry over that or do I get a migraine every run?' }
              ],
              choices: [
                {
                  text: '"I carried over a radio broadcast through a concrete wall. Your ego will be fine."',
                  consequence: {
                    text: 'Haruto: (caught between a laugh and a blush)\n\nHaruto: Okay. Okay, that was — yeah. Cool. First run\'s a dawn loop. If the calls are clean, the comments can scream. If I get sideways because of you, I am saying so, loudly, to everyone. Deal? Deal. — He offers a fist bump like it is a treaty.',
                    stats: { driverTrust: 15, grit: 5 },
                    flags: { harutoOnboard: true }
                  }
                },
                {
                  text: '"Your sponsor edits optics. I edit survival. I outrank him."',
                  consequence: {
                    text: 'Haruto: (blink. Recalculation. A slow grin)\n\nHaruto: She has rank math. Kenji, she has rank math! — From across the garage, without looking up from an engine: I HEARD. — Fine, rank math. Dawn loop. Bring the voice, I will bring the right foot, and Mori\'s people can learn to edit around competence.',
                    stats: { driverTrust: 10, teamRespect: 15, grit: 10 },
                    flags: { rankMath: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_comment_section',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · PHONES FACE-DOWN · 04:30',
              dialogue: [
                { speaker: 'narrator', text: 'Somebody filmed the dawn run from the overpass. The clip has nine hundred thousand views and a comment section that has discovered, in real time, what a girl sounds like at 290. Haruto keeps opening his phone. Kenji keeps closing it for him.' },
                { speaker: 'kenji', text: 'In my club there was a woman named Reina who read the Wangan better than anyone alive. Nobody filmed her. This city ate quietly then. Now it eats loudly. The question is not the noise, girl. The question is whether the noise reaches the driver\'s helmet while the road is happening. Haruto. Does it?' },
                { speaker: 'haruto', text: '(long pause, honest)\n\nHaruto: ...On the tunnel gap my earpiece wanted your voice over my own thoughts. So. No. It does not reach me. Nothing reaches me up there except the calls. That is the whole truth, post it if you want.' }
              ],
              choices: [
                {
                  text: '"Then the noise is your problem to mute and mine to outdrive."',
                  consequence: {
                    text: 'Kenji: (to the workbench, to nobody) Note it down. First run, first noise storm, and she made it into weather. Just weather.\n\nHaruto: For the record, since we are being honest at four in the morning: the last three readers I had, I counted corners till the run ended. Today I forgot to count. First time the race felt like a conversation. Weird. Good weird. More coffee?',
                    stats: { driverTrust: 20, grit: 10, mentalStress: -10 },
                    flags: { weatherNotNoise: true }
                  }
                },
                {
                  text: '"Nine hundred thousand people just heard the calls hold. That is not noise. That is a resume."',
                  consequence: {
                    text: 'Haruto: (stares at the view counter, then at you)\n\nHaruto: ...The clip is the calls. The WHOLE clip is basically your voice over my engine. You just took nine hundred thousand people around the Bayshore from a passenger seat. Kenji. KENJI. She works in content better than Mori\'s whole agency.\n\nKenji: She works in SURVIVAL and it photographs well. There is a difference. Drink your coffee.',
                    stats: { reputation: 15, driverTrust: 10, grit: 10 },
                    flags: { resumeNotNoise: true }
                  }
                }
              ]
            }
          },
          {
            id: 'police_pressure',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · POLICE SCANNER STILL WARM · 03:15',
              dialogue: [
                { speaker: 'narrator', text: 'Two scanner calls tonight, both with "Daikoku" in them. The task force has a list, and Kenji\'s old crest is on it. Haruto is filming his shoes again. Kenji has not spoken since midnight, which by his standards is a scream.' },
                { speaker: 'kenji', text: 'My club survived thirty years on one rule: never make the police a show. These crews film everything, eat everything, and now there is a list. I am too old to run and the shop is too legal to burn. Choose our road, girl. Haruto follows you now. He has not noticed. I am telling you so you can carry it gently.' }
              ],
              choices: [
                {
                  text: '"We run like ghosts — fewer runs, cleaner runs, zero cameras."',
                  consequence: {
                    text: 'Kenji: (one slow nod, the highest honor he issues)\n\nKenji: Ghosts. That is the old rule spoken by a new voice. Haruto will call it boring. The grave is full of loud drivers and the list is full of loud crews. We ghost, or we park. — Haruto, from the corner, filming nothing in particular: ...ghosts have better aesthetics anyway. I can work with ghosts.',
                    stats: { teamRespect: 15, grit: 10, mentalStress: -5 },
                    flags: { ghostRuns: true }
                  }
                },
                {
                  text: '"One perfect run, huge, then silence. We spend the noise we already made."',
                  consequence: {
                    text: 'Kenji: (grim arithmetic on his face)\n\nKenji: The loud way. It is also the old way, once a year, on the empty dawn roads — the anniversary run, we called it. Spending a year of quiet on one perfect morning. You are proposing we make every run the anniversary. It is the fastest way to die I know. It is also the only thing Haruto will remember at eighty. We will vote. Tonight. Properly. Like the club used to.',
                    stats: { driverTrust: 10, teamRespect: -5, mentalStress: 10, reputation: 10 },
                    flags: { everyRunAnniversary: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter2: {
        preStage: [
          {
            id: 'the_offer',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'MINATO MIRAI · SPONSOR SUITE · 22:00',
              dialogue: [
                { speaker: 'narrator', text: 'Aegis Racing Development has a folder with your name in it. In the field where a person would be listed, it says ASSETS, and someone has underlined it twice. Mori Ryosuke smiles like a toll gate.' },
                { speaker: 'mori', text: 'A girl who out-called a broadcast through a wall — do you know what you are worth as a STORY? Nine hundred thousand people already know. Sign with Aegis and we triple it. The feeds, the stunts, the drama. Fear is content, and you read fear better than anyone I have ever seen.' },
                { speaker: 'kenji', text: '(from the doorway, uninvited, immovable)\n\nKenji: She reads ROADS. And she belongs to no one\'s folder. — Mori smiles wider. The price of his attention just went up for everyone in the room.' }
              ],
              choices: [
                {
                  text: '"I am not your asset. I am not Kenji\'s either. I am the voice, and the voice is mine."',
                  consequence: {
                    text: 'Mori: (closes the folder, delightfully disgusted)\n\nMori: Independence. Expensive hobby. Enjoy the parking structure, all three of you. — At the door, he stops. Oh — the offer stays open. It always does. That is what makes it a trap and a compliment.\n\nKenji: (elevator, quietly) You just refused the money AND my crest in one sentence. The old club would have made you president.',
                    stats: { grit: 20, teamRespect: 15 },
                    flags: { voiceIsMine: true }
                  }
                },
                {
                  text: '"Triple it and put it in writing — then watch me spend it my way."',
                  consequence: {
                    text: 'Mori: (actually surprised, then delighted)\n\nMori: You want the money AND the reins. Nobody asks for the reins. Everyone wants the money. Fine. Contract with a creative-control clause. My lawyers will cry. Do it anyway.\n\nKenji: (to you, low) Money with reins is still a leash, girl. Longer, thinner, but it ties at the same collar. Sign if you like — but practice walking away from money in small amounts first. It is a muscle.',
                    stats: { reputation: 20, mentalStress: 10, teamRespect: -5 },
                    flags: { reinsSigned: true }
                  }
                }
              ]
            }
          },
          {
            id: 'kenjis_heart',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · AMBULANCE LIGHTS FADING · 05:05',
              dialogue: [
                { speaker: 'narrator', text: 'It happened at the workbench, mid-valve-adjustment. The paramedics called it a warning, not an ending. Kenji signs his own discharge-risk form with a wrench-steady hand that shook all morning holding coffee. Haruto does not know yet. He is asleep on the cot, helmet still on.' },
                { speaker: 'kenji', text: 'Sit. The heart is seventy-one and entitled to complain. What matters: car three\'s balance is wrong, the Shimamoto tune runs rich in the rain, and you are the only one in this shop Haruto cannot lie to. You will carry more now. And girl — do not let them turn you into a nurse with a headset. You are a reader. The best I have heard in thirty years. Both things are true at once. Carrying weight does not mean shrinking.' }
              ],
              choices: [
                {
                  text: '"Haruto knows. Tonight. He deserves the weight."',
                  consequence: {
                    text: 'Haruto: (waking badly, hearing it all, very quiet)\n\nHaruto: ...He was tuning engines before my dad was born. Okay. OKAY. I will drive smoother. Not slower — smoother. It is the only concession I have. Tell him if he dies I am selling the Supra to Mori, and tell him that threat is load-bearing.\n\nKenji: (from the cot) The threat is noted. And appreciated. Both of you — come home. That is the whole religion.',
                    stats: { driverTrust: 15, teamRespect: 10 },
                    flags: { harutoKnows: true }
                  }
                },
                {
                  text: '"He never knows. I carry it. The team stays light."',
                  consequence: {
                    text: 'Kenji: (grim approval, softer than usual)\n\nKenji: The old way. But hear the cost, girl: the night it happens for real, you will hold the phone and choose what to say while he is mid-race, and you will make that choice alone because you built it alone. I am asking you anyway, because the team needs light more than I need witnesses. Live with it now so you can live with it later.',
                    stats: { grit: 15, mentalStress: 20 },
                    flags: { carryingItAlone: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'aegis_ambush',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'TUNNEL EXIT · DAWN · 05:40',
              dialogue: [
                { speaker: 'narrator', text: 'Aegis\'s GTR sits across the tunnel mouth. Mori steps out in driving shoes that have never met gravel, phone already broadcasting.' },
                { speaker: 'mori', text: 'There she is — the Voice of the Wangan. Nine-fifty now, the view count. Sign, and I put that voice in ten million earbuds. Haruto, you can come too, the channel loves a handsome hood ornament. — Haruto\'s hand finds the Supra\'s door handle. Whatever he is about to do, he is about to do it fast.' },
                { speaker: 'haruto', text: 'Delete "hood ornament" from your vocabulary and your talent roster. She kept me off the wall three times tonight. I counted. Ask your telemetries guy how many wall saves Aegis buys. We\'re out, Mori. — To the phone, directly: And to the comments: she calls it, I drive it, and we both come home. That is the whole sport. Unfollow if you hate it.' }
              ],
              choices: [
                {
                  text: 'Let the clip run. He is saying it better than you ever could.',
                  consequence: {
                    text: 'The clip hits two million by noon. The comment section does not forgive — but it redirects. Ten thousand new followers whose first word from you was a wall save.\n\nKenji: (that night, over rice) In my club, Reina would have needed to be twice as good to be believed half as much. You just needed to be believed once, publicly, and the arithmetic changed. Different war. Same weapon: come home, and let them watch you do it.',
                    stats: { reputation: 20, driverTrust: 15, grit: 10 },
                    flags: { clipHeard: true }
                  }
                },
                {
                  text: '"Ten million earbuds, Mori? Start with one: mine. We say no on our own channel."',
                  consequence: {
                    text: 'You film the refusal on the Supra\'s hood, at the tunnel mouth, with the dawn coming up behind you. It is not content. It is a statement of account: who kept whom alive, what the noise never touches.\n\nMori: (lowering his phone, recalculating a second time)\n\nMori: You keep costing me money and gaining things I cannot buy. One day that trick stops working. — It does not stop working. Kenji frames a still of the video. It hangs next to a stopwatch from 1987. Nobody explains either.',
                    stats: { legacy: 15, teamRespect: 15, reputation: 10 },
                    flags: { ownChannel: true }
                  }
                }
              ]
            }
          },
          {
            id: 'the_net_tightens',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'OKABE GARAGE · CHECKPOINTS ON THE SCANNER · 23:50',
              dialogue: [
                { speaker: 'narrator', text: 'They impound at the on-ramps now. Not chasing — waiting. Shimamoto\'s crew was taken at the Yokohane ramp, cars and all. His lead tuner is eighteen. The city is getting smaller by the week.' },
                { speaker: 'kenji', text: 'One more list night and the shop is finished — not by a crash. By paperwork. I have thirty years of receipts and a heart that complains. You two have futures that fit in envelopes. Choose our road, both of you. I will drive whatever you decide, even parked in the yard with the engine off. Even that, I would drive.' }
              ],
              choices: [
                {
                  text: '"The last run: dawn, empty loop, gentle sheet. Then we ghost for good."',
                  consequence: {
                    text: 'Kenji: (eyes closed, the whole religion in one exhale)\n\nKenji: Come home one last time at full voice. Yes. Dawn is right. I will build the map. Make the call sheet gentle, girl. Dawn roads forgive, but I have stopped asking them to. — Haruto, quietly: I will bring the good camera. Not for the feed. For us.',
                    stats: { driverTrust: 15, legacy: 10, grit: 10 },
                    flags: { lastRunPlanned: true }
                  }
                },
                {
                  text: '"We end it tonight. The runs stop before the names go on lists."',
                  consequence: {
                    text: 'Haruto: (slams the toolbox — then goes quiet, which is worse)\n\nHaruto: ...Fine. Yeah. The Supra goes in the container with the club cars. History is for museums. — He does not look at you for a week. Kenji does, once, with relief wearing grief\'s coat. The shop smells like ended things and old rice.\n\nKenji: (that night) You chose like the old rulebook, girl. It will cost you the boy for a season. It will buy you decades. Fair trade. Terrible trade. Both true.',
                    stats: { teamRespect: 10, mentalStress: -15, driverTrust: -10, legacy: 5 },
                    flags: { endedEarly: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter3: {
        preStage: [
          {
            id: 'sponsoring_the_ghost',
            condition: (ctx) => ctx.isLastPreOfChapter,
            scene: {
              location: 'OKABE GARAGE · RAINY TUESDAY · 19:40',
              dialogue: [
                { speaker: 'narrator', text: 'Between the big nights there are the small ones. Mori Ryosuke’s people left a contract on the bench — “Team Aegis” in expensive print, a number with two commas, and a clause that hands them the crest the first time you finish off the podium twice in a row. Kenji has not touched it. He has instead rebuilt the red coupe’s carburetor for the fourth time this month, for a car that will never run, while his pills sit unopened on the windowsill.' },
                { speaker: 'kenji', text: 'Sign it or burn it, but decide by Friday. And before you ask — yes, I met Mori in 1991. He shook my hand with a stopwatch in his pocket and timed how long I would talk. That is the whole man. Whatever he offers the girl who slept in my yard, remember: he is not buying your voice. He is timing it.' }
              ],
              choices: [
                {
                  text: '“We decline. The shop does not sell its name.”',
                  consequence: {
                    text: 'Kenji: (slides the contract into the parts drawer marked SCRAP)\n\nKenji: Correct answer. Aegis wants the crest because it is the only thing on this street they could not buy new — and they cannot buy you either. Burn yours too. Mori keeps copies. He always keeps copies.',
                    stats: { teamRespect: 15, legacy: 10, mentalStress: 5 },
                    flags: { refusedAegis: true }
                  }
                },
                {
                  text: '“We sign — but the crest stays ours, on paper, in ink.”',
                  consequence: {
                    text: 'Kenji: (reads the amendment twice, then laughs until he coughs)\n\nKenji: A lawyer in the family after all. Fine — take their money and their dyno time. But when they come for the name, and they will, remember this week. The contract protects us exactly as long as we are useful.',
                    stats: { reputation: 20, mentalStress: 15 },
                    flags: { signedAegis: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_impound_list',
            condition: (ctx) => ctx.isChapterEnd,
            scene: {
              location: 'YOKOHAMA · GARAGE FRIDGE · 01:12',
              dialogue: [
                { speaker: 'narrator', text: 'The next crackdown list comes down like weather. Shimamoto’s crew got swept Monday; their Supra sits in the city pound between a stolen scooter and a hearse. Haruto tapes the news clipping to the garage fridge and says nothing all night, which from Haruto is a shout.' },
                { speaker: 'haruto', text: 'They clocked a Skyline doing 289 on the Yokohane. 289. The thread is calling him the last king and calling you “the girl on the list” — third most-viewed clip this week, behind a dog and a crash. Kenji says the fast ones never get caught, only the visible ones. So: how visible do we want the last runs to be?' }
              ],
              choices: [
                {
                  text: '“Quiet ones. Unlisted roads. We finish the season invisible.”',
                  consequence: {
                    text: 'Haruto: (takes the clipping off the fridge and folds it into his wallet)\n\nHaruto: Quiet it is. Funny — Kenji said the club’s best nights never made any list. Now neither will ours. — The next three runs happen on unmarked service roads under a half moon, and they are, and you can both admit it, the cleanest calls of the year.',
                    stats: { grit: 10, reputation: -5, mentalStress: -10 },
                    flags: { wentQuiet: true }
                  }
                },
                {
                  text: '“Loud ones. If the scene ends, it ends on OUR name, not the police log.”',
                  consequence: {
                    text: 'Haruto: (grins like the first night you met him)\n\nHaruto: Loud. Yeah. Okay. If the city is taking names anyway, let them spell ours right. — Word gets around by Thursday: the Okabe car runs the old crest, full send, last season. Half the island shows up just to watch the last co-driver of the Mid Night Club work.',
                    stats: { reputation: 15, driverTrust: 10, mentalStress: 10 },
                    flags: { wentLoud: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter4: {
        preStage: [
          {
            id: 'the_last_run',
            condition: (ctx) => ctx.isFinalRound,
            scene: {
              location: 'THE WANGAN · DAWN · 04:59',
              dialogue: [
                { speaker: 'narrator', text: 'Forty minutes of mercy before the city wakes. The Supra idles at the ramp like a held breath. Kenji is here, against all medical advice and his own stubbornness, holding the stopwatch he has carried since 1987.' },
                { speaker: 'kenji', text: 'The club had one blessing. Not "go fast" — nobody needed blessing for that. We said: COME HOME. Call it clean, drive it whole, come home. Girl — you are the voice of this run. Make it the last thing this road ever hears from us, and make it sound like us.' },
                { speaker: 'haruto', text: '(checking the map, not quite steady)\n\nHaruto: Last one. After this I am a person who USED to. Weird sentence. — He looks at you. Whatever happens: I forgot to count corners for a whole year because of your voice. That is the entire review. Five stars. Don\'t tell Kenji, he will cry and deny it.' }
              ],
              choices: [
                {
                  text: '"Come home to me. That was always the deal. Call it in."',
                  consequence: {
                    text: 'Haruto: (fist against the roll cage, and something soft underneath it)\n\nHaruto: Deal. — Eleven minutes later the city belongs to nobody, the tunnel echo is your voice, and both of you come home. Kenji clicks the stopwatch and does not announce the time. Some numbers are not for saying.',
                    stats: { driverTrust: 25, mentalStress: -10, legacy: 15 },
                    flags: { homeTogether: true }
                  }
                },
                {
                  text: '"One last call, in the old club\'s format. The way Reina would have read it."',
                  consequence: {
                    text: 'Kenji: (the stopwatch arm trembles, not from age)\n\nKenji: ...You never heard her. I never played the tapes for you. HOW. — He plays one, that dawn, on a cassette deck older than both of you: a woman\'s voice, thirty years old, calling the Bayshore like weather. When it ends, you read the same corner your way. Different words. Same road. Same religion. He clicks the stopwatch. Come home, he says, to nobody, to everyone.',
                    stats: { legacy: 25, teamRespect: 20, grit: 10 },
                    flags: { reinaFormat: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'what_the_shop_became',
            condition: (ctx) => true,
            scene: {
              location: 'OKABE GARAGE · ONE YEAR LATER',
              dialogue: [
                { speaker: 'narrator', text: 'The list took Shimamoto\'s crew and two others. Never yours. The shop stands: half legal classics now, Kenji\'s crest framed where the fire marshal can see it. Your clip from the tunnel mouth has four million views and a title you never chose: THE VOICE OF THE WANGAN. The red coupe out back still does not run. He still refuses to fix it. You still know better than to ask.' },
                { speaker: 'kenji', text: 'Sit. The polite kids in the back bay think a boost gauge is technology. I let them. Meanwhile — a university in Kyoto wrote. They want the club tapes. ALL of them. Thirty years of calls, catalogued, taught. Reina\'s voice, my engines\' history, your four million. The archive of a thing everyone said was a myth.' },
                { speaker: 'kenji', text: 'I am seventy-two and the heart keeps its own schedule now. So: the tapes go to Kyoto. The crest goes in the case. And you — the sign above the bench says OKABE & CO. It should say OKABE & DAUGHTER. Not blood. Better than blood. Refuse fast or accept fast, girl. I hate saying sentimental things twice.' }
              ],
              choices: [
                {
                  text: 'Accept. The name stays, the voice teaches, the religion continues.',
                  consequence: {
                    text: 'Kenji: (hands over the stopwatch — 1987 to now, no ceremonies)\n\nKenji: Then it is done. Teach them the first rule before anything: come home. Everything else is decoration. — The neon over the door is rewired that winter: OKABE & DAUGHTER. The Kyoto archive opens in autumn. First recording in the catalogue: a radio broadcast through a concrete wall, and a voice that got the split right.',
                    stats: { legacy: 30, teamRespect: 20, grit: 15 },
                    flags: { daughterChosen: true }
                  }
                },
                {
                  text: '"Keep the shop its own thing. I was never its daughter — I was its voice. Different inheritance."',
                  consequence: {
                    text: 'Kenji: (a long, real laugh, then a cough, then a nod)\n\nKenji: CORRECT. Oh, that is correct. The shop was always just the garage. The voice was always the club. Then the tapes go to Kyoto under YOUR name, not the shop\'s. And you will write your own calls down. Somewhere. Paper, disk, whatever lasts. — He dies in the spring, mid-valve-adjustment, hands steady. The cassette deck in the corner still works. You never fix the coupe. You play the tapes sometimes, at dawn, and call the answers back to a road that is no longer listening.',
                    stats: { legacy: 25, mentalStress: 10, grit: 20 },
                    flags: { voiceInheritance: true }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  },

  // ==========================================================================
  // DAKAR — "DUST AND HONOR"
  // ==========================================================================
  roadbook: {

    male: {
      intro: {
        narrator: `You learned to read a road the way farm kids learn rain —
by feel, through mud, at speeds that would horrify your mother.
The crash took your first driver on a stage no one important watched.
Tarek pulled what was left of the crew out of the wreck with his own hands.
Now the phone rings, and the man who saved you is asking you to sit
back in the seat that tried to kill you.`,
        location: 'SAHARA FRINGE · BIVOUAC AT DUSK',
        speaker: 'Narrator'
      },

      chapter1: {
        preStage: [
          {
            id: 'meeting_tarek',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · 05:30',
              dialogue: [
                { speaker: 'narrator', text: 'The bivouac smells like diesel, sand, and strong coffee made by people who have already been awake for an hour. Tarek Benhima is sixty-three and built like the Atlas mountains: patient, permanent, and full of old snowmelt. He pours two glasses of coffee and does not ask if you want one.' },
                { speaker: 'tarek', text: 'Three years since the crash. You have rebuilt tractors, tuned my daughter\'s death-trap scooter, and refused every seat I offered. So. New tactic. I am not offering you a seat. I am offering you a job reading roads for Amine — the kid who bought a Hilux with rally money he does not have. He cannot navigate a parking structure. You can. Nobody says you must love it.' },
                { speaker: 'you', text: 'The last time I sat in a rally car, the coroner came to the funeral. I was in the hospital for the service. You know this. You pulled me out.' },
                { speaker: 'tarek', text: 'I know every piece of it. I carried the pieces. Listen to me, boy — the road did not kill Youssef. The NOTE did. A wrong call, half a corner early. If the road was guilty, no one would ever drive again. You know roads better than grief does. Give the grief the funeral and give me one season. One.' }
              ],
              choices: [
                {
                  text: '"One season. And Amine learns that my calls are not suggestions."',
                  consequence: {
                    text: 'Tarek: (drinks his coffee like a contract signing)\n\nTarek: Good. Rules are how the dead forgive us. Amine is twenty-three and thinks danger is a personality. You will fix that or you will both learn something. The seat is yours. Try to come back from it this time — the tent is uglier without you arguing about my coffee.',
                    stats: { driverTrust: 10, teamRespect: 10, grit: 5 },
                    flags: { oneSeason: true }
                  }
                },
                {
                  text: '"I will read for him. But I write my own pace notes. Nobody touches the book."',
                  consequence: {
                    text: 'Tarek: (a slow, mountain-moving nod)\n\nTarek: The book is sacred. In my day, a man who touched another man\'s notes lost his hands to consensus. Write them clean, write them yours. Amine will hate it, then he will learn, then he will brag about it to strangers. That is the natural order.',
                    stats: { teamRespect: 15, grit: 10 },
                    flags: { theBookIsSacred: true }
                  }
                }
              ]
            }
          },
          {
            id: 'meeting_amine',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · HILUX BAY 3 · 19:45',
              dialogue: [
                { speaker: 'narrator', text: 'Amine Diallo is twenty-three and enthusiastic in the specific way of people who have never been hospitalized for their hobby. The Hilux is spotless. His driving suit has sponsor patches for companies that have not paid yet.' },
                { speaker: 'amine', text: 'There he is! The legend of sector four! Tarek told me what you did before — not the crash part, the other part, the reading part. Look, I know I am a handful. But I am a FAST handful. You keep the notes honest, I keep the throttle honest. Deal?' },
                { speaker: 'you', text: 'My notes keep you alive. The throttle keeps you honest. We do not swap jobs. That is the whole deal, and it is not negotiable.' }
              ],
              choices: [
                {
                  text: '"Say it back to me so I know you actually heard it."',
                  consequence: {
                    text: 'Amine: (wounded, then laughing)\n\nAmine: HARD GUY. Okay, okay. Your notes = my law. My throttle = your problem. See? I listened. My mother will not believe the listening. — He sticks out an oil-stained hand. Somewhere behind you, Tarek pretends not to be watching, and pretends badly.',
                    stats: { driverTrust: 15, grit: 5 },
                    flags: { amineListens: true }
                  }
                },
                {
                  text: '"Deal. One more thing: you drive the stage, but I own the pace."',
                  consequence: {
                    text: 'Amine: (chews on it, visibly)\n\nAmine: ...You own the pace. Hm. I own the car and the glory, you own the pace and my life. Rough math, but the math works. Deal — but when we win a stage, I am doing a shoey and you cannot stop me. Some things are above the deal.',
                    stats: { driverTrust: 10, teamRespect: 10, mentalStress: 5 },
                    flags: { paceOwned: true, shoeyRights: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'first_stage_aftermath',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · 21:30',
              dialogue: [
                { speaker: 'narrator', text: 'The Hilux comes home with mud to the door handles and both fenders attached. Tarek inspects it like a father checking a toddler for chickenpox. Amine is doing victory laps around the tents, narrating his own highlights.' },
                { speaker: 'tarek', text: 'He held it together on the rocky descent. Fourteen months ago a driver spun there and took a spectator\'s fence with him. Amine held it. Your book held him. So. The coffee is terrible, the couscous is worse, and you sat in the seat and came back from it. All three facts are noted in the ledger I keep that nobody is allowed to read.' },
                { speaker: 'you', text: 'I heard my own voice go quiet on stage six. Not from fear. From focus. First time since the crash. I do not know what to do with that.' },
                { speaker: 'tarek', text: 'Do nothing. It is not yours to manage. Focus is what the road gives back to people who respect it. Tomorrow it may not come. The day after, it will. That is the deal with roads. They forgive nothing and they forget everything, which makes them better company than people.' }
              ],
              choices: [
                {
                  text: '"Thank you. For pulling me out. I never finished saying it."',
                  consequence: {
                    text: 'Tarek: (waves it off with a hand the size of a hubcap)\n\nTarek: I pulled out a co-driver. The man who came out of that seat three years later was not my doing. Eat. Sleep. Tomorrow we do sector two, and Amine\'s mother is coming to watch, so drive like the tent has eyes, which it does, she is terrifying.',
                    stats: { driverTrust: 5, mentalStress: -15, teamRespect: 10 },
                    flags: { saidThanks: true }
                  }
                },
                {
                  text: '"The ledger. Youssef\'s page. Tell me what it says."',
                  consequence: {
                    text: 'Tarek: (long silence. The fire pops. Somewhere a generator sighs.)\n\nTarek: ...You do not want that page. It has my handwriting from the worst month of my life on it. What I can tell you: it does not say YOUR name. It says MINE. I was chief mechanic on that car. I signed the suspension. Grief shares its guilt generously, boy — take only your share. Yours is paid. Mine I am still spending down, one rescued navigator at a time.',
                    stats: { grit: 15, mentalStress: -5, teamRespect: 15 },
                    flags: { ledgerShared: true }
                  }
                }
              ]
            }
          },
          {
            id: 'rival_wind',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · THE RIG TENT · 22:10',
              dialogue: [
                { speaker: 'narrator', text: 'Viktor Reznik\'s team parks two bays down like an unexploded shell. Reznik is on his fourth navigator in two seasons. The last one quit mid-stage and thumbed a ride with the medical truck. The tent next to yours has started charging his fans for shade.' },
                { speaker: 'amine', text: 'Reznik just posted about us. "Sponsor-subsidized farm boys and their gravedigger reader." Nine thousand likes. There is a whole sub-thread about the crash. About you. I have not looked. Yousef\'s cousin looked for me and said it is bad. Should we say something back?' }
              ],
              choices: [
                {
                  text: '"The road says it back to Reznik every stage. Let it do the talking."',
                  consequence: {
                    text: 'Tarek: (approving, from the engine bay)\n\nTarek: The desert does not do comebacks. It does TIMES. Post nothing, boy. Beat him by two minutes on rock and his thread will delete itself. This is the oldest rule of the sand: the stage is the only microphone that matters.',
                    stats: { grit: 10, teamRespect: 10, mentalStress: -5 },
                    flags: { roadTalks: true }
                  }
                },
                {
                  text: '"One reply. Calm. Then silence. His mouth writes checks his co-drivers cash."',
                  consequence: {
                    text: 'Your reply — "his last three navigators paid his mouth\'s bills; we pay in times" — goes mildly viral in rally circles. Reznik posts a video staring into the camera for forty seconds. It helps nobody, least of all him.\n\nTarek: (evening) Reznik has lost four navigators to his own mouth. You just made the fifth one\'s job easier. Every nav in the paddock owes you a coffee now. Collect. That is not diplomacy, that is infrastructure.',
                    stats: { reputation: 15, grit: 5 },
                    flags: { calmReply: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter2: {
        preStage: [
          {
            id: 'the_storm',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · WIND 60KM/H · 04:15',
              dialogue: [
                { speaker: 'narrator', text: 'The harmattan arrived overnight, erasing the roadbook\'s careful ink with a horizon of orange. The organizers have delayed the start twice. Half the paddock is napping. Reznik\'s crew is loading like the storm is a personal insult.' },
                { speaker: 'tarek', text: 'Thirty-eight years of desert and it still makes the first move every morning. Listen. The storm route runs through the erg — deep sand, no visual references, navigation by compass and faith. Officials will let anyone stupid enough to start. Reznik will start. His navigator has nine days\' experience and a twitter account.' },
                { speaker: 'amine', text: 'And us? I am not afraid of sand. I am afraid of being BORING in sand. Tell me we are going. Tell me the book has a plan.' },
                { speaker: 'tarek', text: 'The book does not have a plan. The book is PAPER. The reader has a plan or does not. — Both of them look at you. The wind hums against the tent like it also wants to know.' }
              ],
              choices: [
                {
                  text: '"We go. Compass headings, kilometer discipline, zero heroics. Slow is smooth."',
                  consequence: {
                    text: 'Tarek: (the nod he gives engines that will survive)\n\nTarek: Slow is smooth, smooth is fast, and alive is all three. Compass, discipline, no heroics. I will pre-lube everything that can be pre-lubed. Boy — write the headings bold. In this soup, the bold ones are the ones a shaking hand can find.\n\nAmine: Bold headings, boring driving. I can be boring! I contain multitudes!',
                    stats: { driverTrust: 15, teamRespect: 15, grit: 10 },
                    flags: { stormSmart: true }
                  }
                },
                {
                  text: '"We wait for the window. The erg keeps what it takes. No stage is worth a body."',
                  consequence: {
                    text: 'Amine: (jaw works, then — surprisingly — nods)\n\nAmine: ...Yeah. Okay. The erg keeps what it takes. My mother would side with you, and she is the only critic I fear. — Reznik\'s team launches into the orange at 08:40. They finish, somehow, ninth, having missed a waypoint and driven forty extra kilometers. His navigator quits that night. The ninth this season.\n\nTarek: (quietly, to you) Patience did not cost us the stage. His mouth cost him his ninth reader. Count what we saved tonight, not what we lost.',
                    stats: { grit: 10, mentalStress: -10, reputation: 5 },
                    flags: { waitedWindow: true, ninthQuit: true }
                  }
                }
              ]
            }
          },
          {
            id: 'amine_the_wall',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · ALCOHOL UNKNOWN · 23:40',
              dialogue: [
                { speaker: 'narrator', text: 'A stage win changed Amine. Not the trophy — the COMMENTS. Sponsors emailing directly. Paddock people calling him "the natural." Natural things, he has started suggesting, do not need co-drivers managing their pace. He has said it twice today, both times joking, neither time entirely.' },
                { speaker: 'amine', text: 'Hey. Hey. Don\'t make the face. I am just saying — Reznik drives ALONE in the dunes section, no calls, full send, and the clips go everywhere. My clips have me doing... careful. Careful is for people who are not the natural. — He is drunk in the specific way that is really just fear wearing confidence\'s jacket.' }
              ],
              choices: [
                {
                  text: '"Reznik drives alone because his readers keep leaving. That is not freedom. That is a vacancy."',
                  consequence: {
                    text: 'Amine: (long silence. The joke drains out of him like oil.)\n\nAmine: ...Nine navigators. Nine. And I called you "gravedigger" in April like it was funny. — He is quiet the rest of the night. In the morning there is coffee waiting on your tent peg, and he has underlined the whole rocky section of tomorrow\'s book in pencil, in YOUR notation, trying to learn it. He is still fast. But something re-aimed.',
                    stats: { driverTrust: 20, teamRespect: 10, mentalStress: -5 },
                    flags: { nineNavigators: true }
                  }
                },
                {
                  text: 'Let him talk. All of it. Then say nothing and hand him the crash photo.',
                  consequence: {
                    text: 'You show him the only photo of Youssef\'s car you kept: not the wreck — the car, two days before, golden in the dust, both of them grinning on the hood.\n\nAmine: (long, long silence)\n\nAmine: ...That is what the seat costs. Okay. Okay, man. The natural thing was a bit. Mostly. I will still do a shoey on the podium, but the dune send is — look, I will call it before I do it. Every time. That is the deal and I am actually sorry about April. The post thing. All of it.',
                    stats: { driverTrust: 25, mentalStress: -10, grit: 5 },
                    flags: { photoShown: true, amineSorry: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'reznik_down',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'KM 214 · WRECKAGE ON THE FAST SECTION · 16:20',
              dialogue: [
                { speaker: 'narrator', text: 'The car is Reznik\'s. The dust has not settled enough to lie about the angle. His tenth navigator in two seasons is out of the cabin, walking in circles, holding his own wrist. Reznik is still belted in, conscious, and shouting about suspension travel.' },
                { speaker: 'amine', text: '(at race speed, past the wreck)\n\nAmine: That was thirty meters of MORON — he clipped the rocky entry doing the dune-pace on tarmac tires. Medical\'s behind us. Tarek\'s saying stop is our call. Your call. Reader\'s call. He is shouting something at us. I cannot make it out. Do we stop?' }
              ],
              choices: [
                {
                  text: '"Stop. Always stop. Book the stage goodbye."',
                  consequence: {
                    text: 'You stop. Amine splints the navigator\'s wrist with a tire gauge and a bonnet strap while Tarek\'s radio calls it in. Reznik, absurdly, keeps shouting times at his wrecked suspension like the numbers will fix it.\n\nThe navigator — a nineteen-year-old named Sami on his second ever stage — will tell the paddock later: "They stopped. Nobody stops. Reznik\'s own team drove PAST." The rally world does arithmetic on that sentence all week. Sami eats dinner at your tent for the rest of the season.',
                    stats: { reputation: 20, teamRespect: 15, grit: 10 },
                    flags: { stoppedAlways: true, samiSaved: true }
                  }
                },
                {
                  text: '"Report position, keep race pace. Stopping is for the medical car."',
                  consequence: {
                    text: 'You report the wreck precisely — km marker, injuries apparent, vehicle state — and hold race pace. The medical car arrives four minutes later than it would have. Sami\'s wrist is worse for it. Nothing life-changing. Something trust-changing.\n\nTarek: (bivouac, that night, not angry — worse: measured) The rules were on your side, boy. The book\'s fine print. But Sami will remember four minutes for the rest of his life, and so will the paddock, and so will you at three in the morning. I know, because at three in the morning I still count suspension bolts. Some pages write themselves.',
                    stats: { driverTrust: 5, reputation: -10, mentalStress: 15 },
                    flags: { keptPace: true }
                  }
                }
              ]
            }
          },
          {
            id: 'the_call_from_home',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · SATELLITE PHONE · 05:50',
              dialogue: [
                { speaker: 'narrator', text: 'The satellite phone rings at 05:50, which is when bad news schedules itself in the desert. Youssef\'s mother. She has never once called angry. Today her voice is sandpaper and careful.\n\nShe has read the thread about the crash. The one where strangers decided you were the reason her son died. She has one question, and she deserves the truth in whatever form the truth comes.' },
                { speaker: 'youssefs_mother', text: 'I have read what they write. I do not believe strangers. So I ask the man who was in the seat: my son\'s crash — was it the note, or was it the road? You have run from this answer for three years. I am old now. I am asking you to spend it.' }
              ],
              choices: [
                {
                  text: '"The note. Mine. Half a corner early and he trusted it with everything. I have driven three years so it never happens twice."',
                  consequence: {
                    text: 'A silence so long the generator cycles twice.\n\nYoussef\'s mother: ...Three years I waited for a person to say a true thing to me. His father said "the road." The team said "the conditions." You say the note. Then you kept driving. Only a guilty man or a repaired one keeps driving, and repaired men do not volunteer the truth for free. — She will send a scarf, hand-woven, with the tent\'s number on it. Tarek, watching you lower the phone: Now you are empty enough to be filled. Eat something. Both meals. Doctor\'s orders and mine.',
                    stats: { grit: 25, mentalStress: -20, legacy: 10 },
                    flags: { truthSpoken: true }
                  }
                },
                {
                  text: '"It was both. The note was early AND the road was slick. I have never been able to separate them, and I have tried every night for three years."',
                  consequence: {
                    text: 'Youssef\'s mother: ...Both. Yes. His father says the road. The team says the conditions. You say both. Three answers, three funerals of the same day. — A breath that has been held for three years, half-released. Come for tea after the rally. Not to be forgiven. To drink tea. Forgiveness is God\'s department; tea is ours.',
                    stats: { mentalStress: -10, grit: 10, teamRespect: 5 },
                    flags: { teaInvitation: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter3: {
        preStage: [
          {
            id: 'the_long_ferry',
            condition: (ctx) => ctx.isLastPreOfChapter,
            scene: {
              location: 'STAGE ROAD · 400 KM TO BIVOUAC',
              dialogue: [
                { speaker: 'narrator', text: 'Liaison days look like rest and are not. Four hundred kilometres of escort road with the mechanic truck in front of you and Reznik’s convoy haunting the mirrors. Tarek spends them the way he spends everything — working: retorquing, re-tiling the fuel math, re-reading Youssef’s old roadbook like it is scripture with grease on it.' },
                { speaker: 'tarek', text: 'The desert does not care about points. It cares whether you respect it. Youssef wrote in the margins of every stage: “the dune decides — your job is to be ready for its decision.” Amine reads speed. Tonight, quiz him on the sculls. Make him see the hazard before the hazard sees him.' }
              ],
              choices: [
                {
                  text: '“Drill the danger words until Amine hates me for it.”',
                  consequence: {
                    text: 'Tarek: (nods once — the good nod)\n\nTarek: He will hate it and then he will use it. That is what training is: planting trees in someone else’s shade. — That evening Amine gets every dune-faces question right and complains the entire time, and afterwards you catch him alone, re-reading the hazard list without being told.',
                    stats: { grit: 15, driverTrust: -5 },
                    flags: { drilledHazards: true }
                  }
                },
                {
                  text: '“Back off. He drives better loose than lectured.”',
                  consequence: {
                    text: 'Tarek: (a long silence, then)\n\nTarek: Youssef said the same thing once. I disagreed with him then too. But you two are the ones in the car, not me. — Amine arrives at the bivouac loose, laughing, fastest through the sculls you have ever called — and Tarek writes something new in the margins, next to Youssef’s handwriting.',
                    stats: { driverTrust: 15, mentalStress: -5 },
                    flags: { stayedLoose: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_ninth_navigator',
            condition: (ctx) => ctx.isChapterEnd,
            scene: {
              location: 'BIVOUAC · REZNIK’S ROW · 21:30',
              dialogue: [
                { speaker: 'narrator', text: 'Word travels bivouac-fast: Reznik burned through another navigator — his ninth this season — and their manager offered you the seat before the tent flap closed. The number they are muttering would fund the school Tarek keeps sketching on napkins. Amine is pretending to sleep, badly.' },
                { speaker: 'amine', text: 'You should take it. — No, hear me. If I kept crashing co-drivers, you would tell me the truth, so here is mine: that seat is a rocket with a chewing-gum shift. It eats voices. But I will not beg you to stay either — that is not what we are. Just tell me which way I should feel about it.' }
              ],
              choices: [
                {
                  text: '“We stay. Amine and me to the finish, however it lands.”',
                  consequence: {
                    text: 'Amine: (exhales like a man surfacing)\n\nAmine: Okay. Okay. Then I am going to drive like the seat was expensive — because now it is. — Tarek overhears everything, says nothing, and the next morning the truck is fuelled early and Youssef’s roadbook is open on your kit with a new margin note in Tarek’s hand: “he chose the slow way — the one that gets you home.”',
                    stats: { driverTrust: 20, teamRespect: 10, reputation: -5 },
                    flags: { refusedReznik: true }
                  }
                },
                {
                  text: '“I hear the rocket. Give me one stage to decide.”',
                  consequence: {
                    text: 'Amine: (a slow nod, jaw tight)\n\nAmine: One stage. Fair. I would want the same. — He drives the next day like a man with something to prove and proves exactly the wrong thing: two near-misses and a crest you had to call twice. The seat beside Reznik is still open. So is the question of what this team is worth.',
                    stats: { reputation: 15, driverTrust: -10, mentalStress: 10 },
                    flags: { consideringReznik: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter4: {
        preStage: [
          {
            id: 'the_final_erg',
            condition: (ctx) => ctx.isFinalRound,
            scene: {
              location: 'FINAL ERG · START LINE · 06:10',
              dialogue: [
                { speaker: 'narrator', text: 'The last stage: 340 kilometers of dune field between you and the finish ramp in town. Second overall overall if you hold position. First in class regardless. Amine has not slept — not from fear, from the specific electricity of a man who can taste the ramp.' },
                { speaker: 'tarek', text: 'The Hilux is perfect. I have signed my name to every bolt on it, which at my age is a love letter. The dunes will do what they do. Amine — drive the car you were given, not the one you dream about. Boy — read the road you SEE, not the one you remember. And both of you: the finish ramp is for the crowd. Come home for us.' },
                { speaker: 'amine', text: '(quiet, helmet under one arm)\n\nAmine: Tarek said "come home." That is your line, the crash-guy\'s line. Since when is it the team line? ...Since you stopped, I think. At KM 214. When everyone watched who stopped. Okay. Enough. Read me home.' }
              ],
              choices: [
                {
                  text: '"Read you home. 340 kilometers. One book. Both hands on the wheel of my voice."',
                  consequence: {
                    text: 'Amine: (grin like sunrise)\n\nAmine: POETRY. The natural is being upstaged by his navigator and I LOVE IT. — The dunes take four hours and give it back. Not one dramatic save. Not one heart-stopper. Just 340 kilometers of a voice and a right foot agreeing about everything. The finish ramp is chaos. The shoey happens. Tarek pretends disgust and takes a photo he will deny printing.',
                    stats: { driverTrust: 25, teamRespect: 15, legacy: 10 },
                    flags: { readHome: true }
                  }
                },
                {
                  text: '"We drive it for Youssef. His name in the book, our names on the ramp."',
                  consequence: {
                    text: 'You write it on the glovebox in marker where only the two of you will see: YOUSSEF, WE FINISHED. Amine says nothing. Amine drives the stage of his life — smooth, patient, gone from reckless the way a fever breaks.\n\nAt the ramp a journalist asks about the marker ink on Amine\'s glove. The clip of his answer — "we finished it for the man who taught our co-driver the road; ask your three-year archive about Youssef Benali" — is the only piece of rally media that week that makes Tarek leave the room for a minute.',
                    stats: { legacy: 25, driverTrust: 15, grit: 10 },
                    flags: { forYoussef: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_season_of_people',
            condition: (ctx) => true,
            scene: {
              location: 'THE FINISH VILLAGE · NIGHT MARKET · 23:00',
              dialogue: [
                { speaker: 'narrator', text: 'The rally is over. The town smells like grilled meat and exhausted horses. Sami — Reznik\'s ex-navigator, the one you stopped for — is at the market with his arm in a proper cast and a folder of hand-drawn stage maps under it. Amine is negotiating the purchase of a carpet he absolutely does not need. Tarek finds you at the tea stall with two glasses and no question in his face.' },
                { speaker: 'tarek', text: 'The envelope came while we were on the erg. The works team. They want a reader for their factory program. Real seat, real salary, their crest on your suit. It is the thing every navigator in this paddock would trade a limb for. I watched you read the Erg this year. So I am the wrong man to advise you — I am too proud of you to be objective. Read the letter. Drink the tea. The road will do what it always does: forget you, and wait.' },
                { speaker: 'sami', text: '(overhearing, folder clutched)\n\nSami: Excuse me. At KM 214 you stopped. Nobody stops. I have drawn every stage I have watched since — look, I know they are just ink. But if you ever need a second reader for recce, or a student, or anything. I learn fast and I stop for people now. Because of you. That is all. Goodnight.' }
              ],
              choices: [
                {
                  text: 'Sign with the works team. Carry the bivouac\'s lessons to the top of the sport.',
                  consequence: {
                    text: 'Tarek: (no surprise, enormous pride, one bear hug that creaks)\n\nTarek: The factory seat. From a mud-flat kid to a crest on the world stage. Youssef\'s mother will knit you a scarf in team colors, which will confuse the sponsors endlessly. — You go. The works program teaches you telemetry the desert never had. But you keep a bivouac rulebook in your kit: stop for wrecks, bold headings, come home. Sami apprentices under you in the off-seasons. The ink maps get better every year. At the championship ceremony, your co-driver of the year trophy is carrying a small woven scarf around its neck. Photographers assume it is a team tradition. It is. Just not their team.',
                    stats: { legacy: 30, reputation: 20, teamRespect: 10 },
                    flags: { worksTeam: true }
                  }
                },
                {
                  text: 'Stay. Build the school Tarek will never ask for: teach the desert\'s readers yourself.',
                  consequence: {
                    text: 'Tarek: (the tea glass stops halfway to his mouth)\n\nTarek: ...A school. In THIS paddock. For the Samis and the Amine-who-was and whoever the desert invents next. Boy, I built engines for forty years because nobody taught me and I refused to let that be the whole story. You just did the same thing with roads. — The school is a tent for two seasons. Then a shipping container. Then a building with theStop-For-Wrecks rule painted over the door. Works teams send their novices to YOU. Youssef\'s mother teaches the first-aid module. The scarf on the wall is not decoration. It is the syllabus.',
                    stats: { legacy: 30, grit: 20, teamRespect: 20 },
                    flags: { theSchool: true }
                  }
                }
              ]
            }
          }
        ]
      }
    },

    female: {
      intro: {
        narrator: `You learned to read a road the way farm kids learn rain — by
feel, through mud, at speeds that appalled everyone who thought girls
belonged nowhere near a gearbox. The crash took your first driver on a
stage no one important watched. Tarek pulled what was left of the crew
out of the wreck with his own hands. Now the phone rings, and the man
who saved you is asking you to sit back in the seat that tried to kill you.`,
        location: 'SAHARA FRINGE · BIVOUAC AT DUSK',
        speaker: 'Narrator'
      },

      chapter1: {
        preStage: [
          {
            id: 'meeting_tarek',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · 05:30',
              dialogue: [
                { speaker: 'narrator', text: 'The bivouac smells like diesel, sand, and strong coffee made by people who have already been awake for an hour. Tarek Benhima is sixty-three and built like the Atlas mountains. He pours two glasses and slides one across before you speak — which means Reza in the next tent has already told him you were coming, which means everyone has been discussing you for at least a day.' },
                { speaker: 'tarek', text: 'Three years rebuilding tractors. Three years refusing my seats. So: new offer. Amine — the boy who bought a Hilux with money he does not have — needs a reader. Before you say the thing you always say, I will say what I have heard the paddock say: that a girl from the mud flats will make his sponsors nervous. Good, I say. Nervous sponsors negotiate. Confident ones dictate. Sit.' },
                { speaker: 'you', text: 'The last time I sat in a rally car, the coroner came to the funeral. I was in the hospital for the service. You know this because you pulled me out of it.' },
                { speaker: 'tarek', text: 'I know every piece. I carried the pieces. And I will tell you what I have never said: the road did not kill Youssef, and the note did not kill him alone. I signed that suspension. My workshop\'s torque wrench was the last hand on it. Grief has enough guilt for all of us, girl — stop dining alone at that table. One season. Read for the boy. Let the desert argue with the men who doubt you. The desert wins those arguments every time.' }
              ],
              choices: [
                {
                  text: '"One season. And if the sponsors flinch, they can watch from the results board."',
                  consequence: {
                    text: 'Tarek: (drinks like a contract just signed)\n\nTarek: The results board — yes. The only committee whose verdicts cannot be argued with. Amine is twenty-three and thinks danger is a personality. Fix that or both of you will learn something. And girl — when the first crew chief says something about a girl in the seat, you bring it to ME. Not because you cannot handle it. Because the handling is cheaper when I do it and you are busy reading.',
                    stats: { driverTrust: 10, teamRespect: 10, grit: 10 },
                    flags: { oneSeason: true }
                  }
                },
                {
                  text: '"My notes, my book, my pace. Nobody touches any of it. Deal?"',
                  consequence: {
                    text: 'Tarek: (a slow mountain-moving nod)\n\nTarek: The book is sacred. In my day a man who touched another reader\'s notes lost his hands to consensus. Write them yours. Amine will pout, then learn, then brag to strangers that HIS reader writes the cleanest book in the bivouac. That is the natural order of boys his age. Deal.',
                    stats: { teamRespect: 15, grit: 15 },
                    flags: { theBookIsSacred: true }
                  }
                }
              ]
            }
          },
          {
            id: 'meeting_amine',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · HILUX BAY 3 · 19:45',
              dialogue: [
                { speaker: 'narrator', text: 'Amine Diallo is twenty-three and enthusiastic in the specific way of people who have never been hospitalized for their hobby. His Hilux is spotless. When he sees you his face does a thing you have seen a hundred times: surprise, arithmetic about his sponsors, then — thankfully — curiosity winning.' },
                { speaker: 'amine', text: 'Okay, full honesty? Tarek said "the best reader in the paddock" and I pictured some gruff sixty-year-old uncle. You are — hm. Not that. Whatever. Doesn\'t matter. My last two readers quit because I drive like the dunes owe me money. Can your book handle that, or should I slow down before you even get in?' },
                { speaker: 'you', text: 'I have read roads through mud that ate whole crews. I was in the seat the day the sport\'s worst joke got told and I finished the stage on a broken wrist. Your dunes can adjust to my book, or my book will adjust them. Either way you will finish. That is the only promise worth making.' }
              ],
              choices: [
                {
                  text: '"Say the deal back so I know you heard it: my notes are law, your throttle is the pen."',
                  consequence: {
                    text: 'Amine: (wounded, then delighted)\n\nAmine: YOUR notes are LAW, my throttle is the PEN. Who taught you to talk like that?! Okay. Okay, I am a little afraid of you, in a good way, like the dunes. — From the engine bay, Tarek\'s voice, not looking up: THE FEAR IS THE START OF WISDOM. — Amine, muttering: Is he ALLOWED to do that? Listen to everything? — Yes. Yes he is.',
                    stats: { driverTrust: 15, grit: 10 },
                    flags: { amineListens: true }
                  }
                },
                {
                  text: '"One more term: we do the recce MY way. Twice through, both runs. No shortcuts."',
                  consequence: {
                    text: 'Amine: (groans like a two-stroke at altitude)\n\nAmine: TWO recce passes?! The second pass is where improvement goes to die! ...Fine. FINE. Tarek says your book finished stages his only finished by luck. I choose luck\'s smarter cousin. Deal. But if we win a stage, I do a shoey and you cannot shame me out of it. Some things are bigger than the deal.',
                    stats: { driverTrust: 10, teamRespect: 10, grit: 5 },
                    flags: { twoPassRecce: true, shoeyRights: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_comment_section',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · PHONE FACE-DOWN · 21:30',
              dialogue: [
                { speaker: 'narrator', text: 'The stage highlights went up an hour ago. The frame everyone clipped is you, arm out the window calling a line through the rock garden while the Hilux takes it clean. The caption wars are in full bloom. Half of them say you do not belong. The other half have discovered, in real time, that you do. Amine keeps refreshing. You keep eating.' },
                { speaker: 'amine', text: 'Nine thousand comments. NINE. Half of them are in languages I cannot read and the energy is still clear. How do you just — EAT? — He gives up on the phone. Tarek, from the fire: Let her eat. The reading tomorrow needs blood in the stomach, not in the argument. — To you, quieter: Does it get in the helmet? The noise. During the stage. Be honest, I can take it.' },
                { speaker: 'you', text: 'Nothing gets in the helmet during a stage. The helmet is where I keep the road. The noise is a parking-lot problem. It can queue like everyone else.' }
              ],
              choices: [
                {
                  text: '"Post one reply: the stage times. Nothing else. Every race. Forever."',
                  consequence: {
                    text: 'You do exactly that. No captions, no faces, just stage position after stage position, until the account itself becomes a kind of argument no one can win against a spreadsheet.\n\nTarek: (approving, from the fire) The desert does not do comebacks. It does TIMES. You just made the times your spokesperson. In thirty-eight years I have never seen a better answer to noise. Also — Amine\'s mother follows your account now. She says you are the granddaughter she would have chosen. Amine is DYING about it. It is improving his driving.',
                    stats: { reputation: 15, grit: 10, mentalStress: -10 },
                    flags: { timesSpeak: true }
                  }
                },
                {
                  text: '"I say it once, clean, at the finish ramp mic. Then silence for the season."',
                  consequence: {
                    text: 'At the ramp: "The seat is a workplace, not a debate. My work is the book. Judge the book." — Then you say nothing for six weeks while the clip does three circuits of the internet, translating itself.\n\nAmine: (that night, reverent) Six weeks. You are going to hold SIX WEEKS of silence while the internet chews on it. Teach me. I have never once held my tongue and look at me, I have NO followers left among the serious people. — Tarek, from the fire: She learned it from the dunes. The dunes never explain themselves either.',
                    stats: { reputation: 10, grit: 15, legacy: 5 },
                    flags: { rampMic: true }
                  }
                }
              ]
            }
          },
          {
            id: 'rival_wind',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · THE RIG TENT · 22:10',
              dialogue: [
                { speaker: 'narrator', text: 'Viktor Reznik\'s team parks two bays down like an unexploded shell. He is on his fourth navigator in two seasons — the last one quit mid-stage and thumbed a ride with the medical truck. Tonight his team has been spreading a specific rumor: that you only have a seat because Tarek "collects charity cases."' },
                { speaker: 'amine', text: 'He said it at scrutineering, in front of the FIA steward and everything. And his navigator — the new one, Sami, nineteen, seems decent actually — Sami just stood there staring at his shoes like he wanted to be anywhere else. Should I do something? I want to do something. I have a tire iron and poor impulse control.' }
              ],
              choices: [
                {
                  text: '"No tire irons. Sami stands there because he already knows the truth — ask him about the shoe-staring."',
                  consequence: {
                    text: 'You find Sami at the water truck. Nineteen, second-ever stage, wrists full of bruise-watch. "He calls me \'the insurance requirement,\'" Sami says, flat. "You stopped for Reznik at KM 214 last season. Everyone in the junior paddock knows who stops." — By morning, two more junior navigators have asked, quietly, if you are taking students. The rumor does not survive contact with the people it was about.',
                    stats: { reputation: 15, grit: 10, teamRespect: 10 },
                    flags: { samiFound: true }
                  }
                },
                {
                  text: '"Beat him by two minutes on rock and let the stage make the joke."',
                  consequence: {
                    text: 'You write the rockiest stage of the season like a legal document. Amine drives it like a man possessed by competence. Two minutes, twelve seconds. At the finish, the timekeeper — an old woman who has seen forty years of this sport — reads your gap aloud twice, slowly, into her radio, for no technical reason whatsoever.\n\nTarek: (evening) The stage made the joke. You made the stage. This is the correct division of labor. — Reznik posts forty seconds of staring into the camera. His navigator\'s contract is not renewed. Sami eats dinner at your tent from then on. Nobody comments on it. Everybody understands it.',
                    stats: { reputation: 15, grit: 10 },
                    flags: { stageJoke: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter2: {
        preStage: [
          {
            id: 'the_storm',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · WIND 60KM/H · 04:15',
              dialogue: [
                { speaker: 'narrator', text: 'The harmattan arrived overnight, erasing the roadbook\'s careful ink with a horizon of orange. The start is delayed twice. Half the paddock naps. Reznik\'s crew loads like the storm is a personal insult, and his brand-new navigator — a quiet kid named Sami, on his second ever stage — looks like a man being loaded into a cannon.' },
                { speaker: 'tarek', text: 'The erg in this soup: deep sand, no visual references, navigation by compass and faith. Officials will let anyone stupid enough to start. Reznik will start. The question, as always, is not the storm. It is what we decide the storm is. Both of you — reader\'s call. This one has always been yours.' },
                { speaker: 'amine', text: 'For the record, whatever you decide, I am in. But if we go, I want the bold headings. Your bold headings are the only handwriting I trust at speed.' }
              ],
              choices: [
                {
                  text: '"We go. Compass headings in bold, kilometer discipline, zero heroics. Slow is smooth."',
                  consequence: {
                    text: 'Tarek: (the nod he gives engines that will survive)\n\nTarek: Smooth is fast, alive is all three. I will pre-lube everything that can be pre-lubed. Girl — write those headings like signs on the highway. In this soup, bold ink is the only kindness. — You finish ninth in the soup, having passed three DNFs and one very lost works crew. Reznik finishes, somehow, having missed a waypoint and driven forty extra kilometers. Sami\'s hands do not stop shaking for hours. At dinner he asks, quietly, what your handwriting teacher was like.',
                    stats: { driverTrust: 15, teamRespect: 15, grit: 10 },
                    flags: { stormSmart: true }
                  }
                },
                {
                  text: '"We wait for the window. The erg keeps what it takes. No stage is worth a body — especially his."',
                  consequence: {
                    text: 'Amine: (jaw works, then nods — the surprise is that it surprises you)\n\nAmine: ...Yeah. Sami\'s nineteen. I am an idiot, but I am not THAT idiot. We wait. — Reznik\'s team launches into the orange at 08:40 and finishes ninth, forty kilometers wrong, with a navigator who quits that night. The ninth this season.\n\nTarek: (quietly) Patience cost us nothing. His mouth cost him his ninth reader. Count what we saved, not what we lost. — Sami eats at your tent that night. The folding chair he uses becomes "Sami\'s chair" for the rest of the season.',
                    stats: { grit: 10, mentalStress: -10, reputation: 10 },
                    flags: { waitedWindow: true, ninthQuit: true }
                  }
                }
              ]
            }
          },
          {
            id: 'amine_the_wall',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'SERVICE PARK · ALCOHOL UNKNOWN · 23:40',
              dialogue: [
                { speaker: 'narrator', text: 'A stage win changed Amine. Not the trophy — the COMMENTS. Sponsors emailing directly, paddock people calling him "the natural." Natural things, he has started suggesting, do not need co-drivers managing their pace. He has said it twice today, both times joking, neither time entirely.' },
                { speaker: 'amine', text: 'Don\'t make the face. I am just saying — Reznik drives ALONE in the dune sections, no calls, full send, and the clips go everywhere. Mine have me doing... careful. Careful is for people who are not THE NATURAL. — He is drunk in the specific way that is fear wearing confidence\'s jacket, and everyone in the tent can see it except him.' }
              ],
              choices: [
                {
                  text: '"Reznik drives alone because his readers keep LEAVING. That is not freedom, that is a vacancy. Ninth navigator, Amine. Ninth."',
                  consequence: {
                    text: 'Amine: (the joke drains out of him like oil)\n\nAmine: ...Nine. Nine navigators. And I have been doing an impression of him all WEEK. — Quiet the rest of the night. In the morning: coffee on your tent peg, and tomorrow\'s rocky section underlined in pencil, in YOUR notation, him trying to learn it. Still fast. But re-aimed. He brings it up exactly once more, months later, at the finish ramp: "the natural thing was a bit. Mostly. Thanks for the ninth-nav math."',
                    stats: { driverTrust: 20, teamRespect: 10, mentalStress: -5 },
                    flags: { nineNavigators: true }
                  }
                },
                {
                  text: 'Let him talk all of it. Then hand him the golden photo — you and Youssef on the hood, two days before.',
                  consequence: {
                    text: 'Amine: (long, long silence, photo in both hands)\n\nAmine: ...That is what the seat costs. — He is quiet in a way that is not sulking. At dawn: "Okay. The natural is dead, long live the student. I will still do the shoey, but the dune send — I will call it before I do it. Every time. And I am sorry about the posts. The ones calling you my \'handler.\' That was Reznik\'s screenshot, not my sentence, but I let it breathe, and letting it breathe was mine."',
                    stats: { driverTrust: 25, mentalStress: -10, grit: 5 },
                    flags: { photoShown: true, amineSorry: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'reznik_down',
            condition: (ctx) => ctx.isFirstStage,
            scene: {
              location: 'KM 214 · WRECKAGE ON THE FAST SECTION · 16:20',
              dialogue: [
                { speaker: 'narrator', text: 'The car is Reznik\'s. The dust has not settled enough to lie about the angle. His newest navigator — Sami, nineteen, second-ever stage — is out of the cabin walking in circles, holding his own wrist. Reznik is belted, conscious, shouting about suspension travel.' },
                { speaker: 'amine', text: '(at race speed, past the wreck)\n\nAmine: That was thirty meters of MORON — dune pace on tarmac tires. Medical is four minutes behind us. Tarek says stop is the reader\'s call. Your call. — In the passenger seat your hand is already moving to the grab handle. Some pages of the book you never had to write.' }
              ],
              choices: [
                {
                  text: '"Stop. Always stop. Splint the kid, call it in, book the stage goodbye."',
                  consequence: {
                    text: 'You stop. Amine splints Sami\'s wrist with a tire gauge and a bonnet strap while you call the wreck in with coordinates so clean the medical car later asks who wrote them. Reznik keeps shouting times at his own wrecked suspension.\n\nSami will tell the paddock, later, the sentence that does the rounds all season: "She stopped. Nobody stops. His own team drove PAST." — Sami eats at your tent for the rest of the season. The junior navigators start a group chat called "the book club." You are the only member who has not read it.',
                    stats: { reputation: 20, teamRespect: 15, grit: 10 },
                    flags: { stoppedAlways: true, samiSaved: true }
                  }
                },
                {
                  text: '"Report it perfect — coordinates, injuries, state — and hold race pace. Rules are rules."',
                  consequence: {
                    text: 'You report the wreck with textbook precision and hold race pace. The medical car arrives four minutes later than it would have. Sami\'s wrist is worse for it. Nothing life-changing. Something trust-changing.\n\nTarek: (bivouac, that night, measured — worse than angry) The rules were on your side, girl. The fine print. But Sami will remember four minutes his whole life, and so will the paddock, and so will you at three in the morning. I know, because at three in the morning I still count torque wrenches. Some pages write themselves no matter whose book it is.',
                    stats: { driverTrust: 5, reputation: -10, mentalStress: 15 },
                    flags: { keptPace: true }
                  }
                }
              ]
            }
          },
          {
            id: 'the_call_from_home',
            condition: (ctx) => !ctx.isFirstStage,
            scene: {
              location: 'BIVOUAC · TENT 7 · SATELLITE PHONE · 05:50',
              dialogue: [
                { speaker: 'narrator', text: 'The satellite phone rings at 05:50, which is when bad news schedules itself in the desert. Youssef\'s mother. She has never once called angry. Today her voice is sandpaper and care.\n\nShe has read the thread. The one where strangers decided the girl in the seat was the reason her son died. She has one question and she has driven three days to ask it in person, which you find out when you see her standing at the tent flap, holding a bag of oranges like a passport.' },
                { speaker: 'youssefs_mother', text: 'I have read what they write. I did not believe strangers, so I came to ask the woman who was in the seat. My son\'s crash — the note, or the road? You have run from this answer three years. I am old, and I have brought oranges, and I am asking you to spend the truth on me.' }
              ],
              choices: [
                {
                  text: '"The note. Mine. Half a corner early, and he trusted it with everything. Three years I have driven so it never happens twice."',
                  consequence: {
                    text: 'She sits down on the tent\'s sand anchor like her legs have finished with standing.\n\nYoussef\'s mother: ...Three years I waited for one true thing. His father says the road. The team says the conditions. You say the note — and then you kept driving. Only a guilty woman or a repaired one keeps driving. Repaired ones do not confess for free. — She peels an orange with hands that tremble only a little and gives you half. You eat it together in the dawn noise of the bivouac. The scarf arrives by post a month later, hand-woven, your initials worked into the hem. Tarek sees it and leaves the room for a minute.',
                    stats: { grit: 25, mentalStress: -20, legacy: 10 },
                    flags: { truthSpoken: true, theOrange: true }
                  }
                },
                {
                  text: '"Both. The note was early AND the road was slick, and I have tried every night for three years to separate them. They will not separate. That is the truth, and it is the only one I have."',
                  consequence: {
                    text: 'Youssef\'s mother: ...Both. — She looks at the oranges, then the horizon, then you. His father says the road. The team says the conditions. You say both. Three answers. Three funerals of the same day. — A long breath, three years held, half-released. Come for tea after the rally. Not for forgiveness. Forgiveness is God\'s department. Tea is ours. Bring your appetite and no apologies. — She leaves the oranges. The tent smells like citrus for two days. Nobody minds.',
                    stats: { mentalStress: -10, grit: 15, teamRespect: 5 },
                    flags: { teaInvitation: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter3: {
        preStage: [
          {
            id: 'the_long_ferry',
            condition: (ctx) => ctx.isLastPreOfChapter,
            scene: {
              location: 'STAGE ROAD · 400 KM TO BIVOUAC',
              dialogue: [
                { speaker: 'narrator', text: 'Liaison days look like rest and are not. Four hundred kilometres of escort road with the mechanic truck in front of you and Reznik’s convoy haunting the mirrors. Tarek spends them the way he spends everything — working: retorquing, re-tiling the fuel math, re-reading Youssef’s old roadbook like it is scripture with grease on it.' },
                { speaker: 'tarek', text: 'The desert does not care about points. It cares whether you respect it. Youssef wrote in the margins of every stage: “the dune decides — your job is to be ready for its decision.” Amine reads speed. You read the sand better than anyone I have trained. Quiz him on the sculls tonight — make him see the hazard before the hazard sees him.' }
              ],
              choices: [
                {
                  text: '“Drill the danger words until Amine hates me for it.”',
                  consequence: {
                    text: 'Tarek: (nods once — the good nod)\n\nTarek: He will hate it and then he will use it. That is what training is: planting trees in someone else’s shade. — That evening Amine gets every dune-faces question right and complains the entire time, and afterwards you catch him alone, re-reading the hazard list without being told.',
                    stats: { grit: 15, driverTrust: -5 },
                    flags: { drilledHazards: true }
                  }
                },
                {
                  text: '“Back off. He drives better loose than lectured.”',
                  consequence: {
                    text: 'Tarek: (a long silence, then)\n\nTarek: Youssef said the same thing once. I disagreed with him then too. But you two are the ones in the car, not me. — Amine arrives at the bivouac loose, laughing, fastest through the sculls you have ever called — and Tarek writes something new in the margins, next to Youssef’s handwriting.',
                    stats: { driverTrust: 15, mentalStress: -5 },
                    flags: { stayedLoose: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_ninth_navigator',
            condition: (ctx) => ctx.isChapterEnd,
            scene: {
              location: 'BIVOUAC · REZNIK’S ROW · 21:30',
              dialogue: [
                { speaker: 'narrator', text: 'Word travels bivouac-fast: Reznik burned through another navigator — his ninth this season — and their manager offered you the seat before the tent flap closed. The number they are muttering would fund the school Tarek keeps sketching on napkins. Amine is pretending to sleep, badly.' },
                { speaker: 'amine', text: 'You should take it. — No, hear me. You always tell me the truth, loudly, so here is mine: that seat is a rocket with a chewing-gum shift. It eats voices — even ones the paddock finally learned to spell. But I will not beg you to stay either. Just tell me which way I should feel about it.' }
              ],
              choices: [
                {
                  text: '“We stay. Amine and me to the finish, however it lands.”',
                  consequence: {
                    text: 'Amine: (exhales like a man surfacing)\n\nAmine: Okay. Okay. Then I am going to drive like the seat was expensive — because now it is. — Tarek overhears everything, says nothing, and the next morning the truck is fuelled early and Youssef’s roadbook is open on your kit with a new margin note in Tarek’s hand: “she chose the slow way — the one that gets you home.”',
                    stats: { driverTrust: 20, teamRespect: 10, reputation: -5 },
                    flags: { refusedReznik: true }
                  }
                },
                {
                  text: '“I hear the rocket. Give me one stage to decide.”',
                  consequence: {
                    text: 'Amine: (a slow nod, jaw tight)\n\nAmine: One stage. Fair. I would want the same. — He drives the next day like a man with something to prove and proves exactly the wrong thing: two near-misses and a crest you had to call twice. The seat beside Reznik is still open. So is the question of what this team is worth.',
                    stats: { reputation: 15, driverTrust: -10, mentalStress: 10 },
                    flags: { consideringReznik: true }
                  }
                }
              ]
            }
          }
        ]
      },

      chapter4: {
        preStage: [
          {
            id: 'the_final_erg',
            condition: (ctx) => ctx.isFinalRound,
            scene: {
              location: 'FINAL ERG · START LINE · 06:10',
              dialogue: [
                { speaker: 'narrator', text: 'The last stage: 340 kilometers of dune field between you and the finish ramp in town. Second overall if you hold position, first in class regardless. Amine has not slept — not from fear, from the electricity of a man who can taste a ramp. Sami\'s cast comes off tomorrow; he has painted the finish-town coordinates on it like a pilgrimage.' },
                { speaker: 'tarek', text: 'The Hilux is perfect. Every bolt signed like a love letter. Amine — drive the car you were GIVEN, not the one you dream about. Girl — read the road you SEE, not the one you remember. And both of you: the ramp is for the crowd. Come home for us. — He has never once, in three years, added the last part. Amine notices. Sami notices. The dunes do not care, and the sun comes up anyway.' },
                { speaker: 'amine', text: '(quiet, helmet under one arm)\n\nAmine: "Come home for us." He has been waiting three years to say that to the right crew. Okay. Okay. Read me home — 340 klicks, one book, both of us. And when we hit the ramp, I am doing the shoey, and you are ALLOWED to look away in shame. Those are the terms.' }
              ],
              choices: [
                {
                  text: '"Read you home. And when we land on that ramp, we land as a crew. All four of us — you, me, Tarek, and the man who taught me the road."',
                  consequence: {
                    text: 'The dunes take four hours and give them back. Not one dramatic save. Not one heart-stopper. 340 kilometers of a voice and a right foot in perfect, boring, beautiful agreement. On the ramp, Amine does the shoey with his class-win champagne. Then he holds the second bottle over his head, untouched, and points at the sky, and the crowd that has learned the story this week does not need it explained. Tarek, at the fence, leaves the room that does not have rooms. Sami films it on a cast-arm that shakes.',
                    stats: { driverTrust: 25, teamRespect: 15, legacy: 15 },
                    flags: { crewOfFour: true }
                  }
                },
                {
                  text: '"We drive it for Youssef. His name in the book, our names on the ramp, the school in his memory."',
                  consequence: {
                    text: 'You write it on the glovebox in marker: YOUSSEF — FINISHED. Amine drives the stage of his life. At the ramp, the journalist asks about the ink. The answer — "we finished it for the man who taught our reader the road" — becomes the most-shared piece of rally media of the season.\n\nThe school announcement comes two days later, at the bivouac teardown, one folded page photocopied forty times: THE BIVOUAC READER SCHOOL. First class: Sami. Second class: nine applications by the end of the week. Youssef\'s mother mails the first donation with a note: "He would have stood on a chair to teach it badly. Stand on the ground and teach it well."',
                    stats: { legacy: 30, driverTrust: 15, grit: 10 },
                    flags: { forYoussef: true, schoolAnnounced: true }
                  }
                }
              ]
            }
          }
        ],
        postStage: [
          {
            id: 'the_season_of_people',
            condition: (ctx) => true,
            scene: {
              location: 'THE FINISH VILLAGE · NIGHT MARKET · 23:00',
              dialogue: [
                { speaker: 'narrator', text: 'The rally is over. The town smells like grilled meat and exhausted horses. Sami — cast off, arm pale — has a folder of hand-drawn stage maps under his good arm and the expression of a man about to ask for something enormous. Amine is negotiating the purchase of a carpet he absolutely does not need. Tarek finds you at the tea stall with two glasses and an envelope already set on the counter between you.' },
                { speaker: 'tarek', text: 'The works team wrote. They want a reader for the factory program — real seat, real salary, crest on the suit. Every navigator in this paddock would trade a limb. I watched you read the Erg, so I am the wrong man to advise: too proud to be objective. Read the letter. Drink the tea. Also — the letter is not the only paper on the counter. Sami has one too. He will show you himself. The boy has been rehearsing since the cast came off.' },
                { speaker: 'sami', text: '(folder open, hands almost steady)\n\nSami: I mapped every stage we did. All of them. With the stopping-places marked. KM 214 has a star. — Look, the junior navigators, we have a group chat, "the book club." Forty of us now. We want classes. Real ones. Recce discipline, storm headings, when to stop. And everyone in the chat said the same name to ask. So I am asking. Will you teach us? I will carry anything. I will grade the homework. I already made a syllabus. It is probably wrong. You can fix it.' }
              ],
              choices: [
                {
                  text: 'Sign with the works team — and bring the book club with you as your project.',
                  consequence: {
                    text: 'Tarek: (no surprise, enormous pride, one bear hug that creaks)\n\nTarek: The factory seat AND the students. From mud flats to crest to classroom. Youssef\'s mother will knit you a scarf in team colors and confuse the sponsors endlessly. — You go. The works program teaches telemetry the desert never had. The book club follows in the off-seasons: shipping-container classrooms at rally schools on three continents, Sami grading homework with a red pen and religious intensity. The championship trophy wears a woven scarf. Photographers assume team tradition. It is. Just not their team.',
                    stats: { legacy: 25, reputation: 20, teamRespect: 15 },
                    flags: { worksTeam: true, bookClub: true }
                  }
                },
                {
                  text: 'Stay. Build the school. The desert invented you, so the school stays in the desert.',
                  consequence: {
                    text: 'Tarek: (the tea glass stops halfway to his mouth)\n\nTarek: A school. HERE. For the Samis and the Amine-who-was and whoever the desert invents next. Girl — I built engines for forty years because nobody taught me and I refused to let that be the whole story. You just did the same thing with roads. — The school is a tent for two seasons. Then a container. Then a building with STOP FOR WRECKS painted over the door in nine languages. Works teams send their novices to YOU. Youssef\'s mother runs the first-aid module with orange-bringing authority. Sami\'s syllabus, corrected in your hand, hangs framed by the door. The last line is his: "Rule one: nobody drives alone." — Works teams call every season. Every season, Tarek answers the phone the same way: "The reader teaches here. Send your kids."',
                    stats: { legacy: 30, grit: 20, teamRespect: 20 },
                    flags: { theSchool: true }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeStoryData };
}
