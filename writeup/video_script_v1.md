# Video Script v1 — Gemma Disaster Grid

**Target length:** 3:00 max (Kaggle hard limit). Aim for 2:50.
**Voiceover wpm:** ~150 → script budget ≈ 420 words spoken.
**Style references:** Watch Gemma 3n Impact Challenge winner videos before shooting — match their tempo and emotional pacing.

**Production principles:**
1. **Story first, features second.** Don't tour the UI; show a person solving a problem.
2. **Every scene answers "what does this enable?"** Not "what does this do."
3. **The phone is the hero, not the demo.** The hero is the responder who can finally act.
4. **End on a number.** "800 million people more than three hours from a hospital. Four billion phones in the world." This is what judges remember.

---

## Scene-by-scene

| # | Time | Visual | Voiceover (≈ words / sec at 150 wpm) | Audio bed |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Aerial / satellite footage of a real disaster aftermath (Cianjur 2024 quake; use Creative Commons stock or news Fair Use snippet). Slow push-in on a destroyed kampung. | *"November 2024. A 5.6 magnitude earthquake hits Cianjur, West Java. The first six hours are the deadliest."* | Quiet, tense ambience |
| 2 | 0:08–0:18 | Cell tower silhouette goes dark. Cut to a hand checking a phone — "No Service." Cut to a paper notebook covered in scribbled location names. | *"Not because help wasn't coming. Because no one could tell help where to go."* | Single dropped note, silence |
| 3 | 0:18–0:30 | Fast cuts: 50 chaotic WhatsApp messages scrolling, scattered photos on a desk, an aid coordinator at a laptop overwhelmed. | *"Today, a disaster's first hour is fifty unsynced messages and a hundred photos. Aid workers spend the first hour just trying to read."* | Mounting layered audio of notification chimes |
| 4 | 0:30–0:38 | Reveal: a responder in a yellow vest holds up an ordinary Android phone. Tight on the screen — the responder taps the airplane mode toggle ON. The little plane icon glows. | *"We built Gemma Disaster Grid to give that hour back."* | Music shifts: hopeful, electronic, slow build |
| 5 | 0:38–0:55 | Demo, real-time, captured screen + phone-in-hand B-roll. Responder snaps a photo of a flooded street with sagging electrical wires. Adds a 4-second voice note in Bahasa Indonesia. A loading ring spins for ~4 seconds. | *"Gemma 4 runs entirely on the phone. Offline. Multimodal. In four seconds, it reads a photograph and a voice note — and produces an emergency triage."* | Music builds slightly |
| 6 | 0:55–1:15 | The triage report appears on screen. Highlight individual fields with subtle motion graphics: SEVERITY 4 — HAZARDS: live electrical wires, rising water — PEOPLE: 2 adults, 1 child, no injuries — IMMEDIATE: move pedestrians from wires, do not wade further — PRIORITY: URGENT. | *"Severity four. Live wires near three civilians. Immediate action: move them from the wires, do not wade. No internet. No cloud. Two and a half gigabytes, in a pocket."* | Brief silence under the read-aloud of the report |
| 7 | 1:15–1:30 | A second screen: a "ROUTING" badge appears — DEEP LANE. The report joins a queue list with 3 other queued reports. | *"When a situation is complex, the model knows. It queues the report for deeper analysis, automatically."* | Music continues |
| 8 | 1:30–1:50 | Cut to a laptop. Airplane mode toggles off. A spinning sync icon. Then the Kaggle notebook view: 14 reports flowing into a cell. A larger output appears with a thinking trace, then a synthesis JSON. | *"When signal returns, every queued report syncs to Gemma 4's 31-billion-parameter model in the command center. It reads everything — fourteen reports, dozens of photos, ten thousand tokens — at once."* | Music swells |
| 9 | 1:50–2:10 | The synthesis renders as a clean ops dashboard mock: PRIORITY ZONES (3), DOMINANT HAZARDS (5), RECOMMENDED ACTIONS (8), with the most urgent action highlighted. Subtle motion: a map view dot-clusters into zones. | *"Three priority zones. Twelve trapped persons across them. Eight recommended actions, ranked by life-safety impact. One operational picture."* | Music sustained |
| 10 | 2:10–2:30 | Architecture diagram in motion: phone (E2B, 2.5GB) ↔ command center (31B). The same Gemma 4 logo on both sides. Light arcs between them. | *"The same Gemma 4 family. Two and a half gigabytes in the field. Frontier reasoning in the cloud. Fully open, fully ours, end to end."* | Music holds |
| 11 | 2:30–2:50 | Cut back to dramatic disaster footage. Quiet now. Then cut to a smiling field worker holding the phone, looking off-camera. End on big text: **GEMMA DISASTER GRID** with a one-line tagline. | *"Eight hundred million people live more than three hours from a hospital. There are four billion phones in the world. Gemma 4 puts a first responder in every pocket. Built for the moments that matter."* | Music resolves |
| 12 | 2:50–3:00 | Black card: project name, Kaggle competition logo, code repo URL, live demo URL. | (silence, or short tagline music outro) | Outro |

---

## Word count check

Total spoken: ~390 words. Comfortable at 150 wpm with breathing room. Padding scenes 1, 2, 11 with extra B-roll if we land short.

## Filming list (what we need to capture)

- [ ] Aerial / satellite disaster B-roll (license: prefer CC0 or fair-use news clips < 5s each)
- [ ] Cell tower silhouette dusk (stock OK)
- [ ] Phone in a hand, screen-capture quality (record at 1080p portrait, then crop)
- [ ] Airplane mode toggle close-up (loop-recordable in pre-production)
- [ ] Camera capture of a staged "flooded street" scene + voice note in Bahasa Indonesia
- [ ] The actual app demo screen recording (built Day 3–4)
- [ ] Kaggle notebook screen recording (built Day 2–4)
- [ ] Field worker in yellow vest with phone (any willing volunteer; can be staged)
- [ ] Disaster footage for closing montage (CC0 / fair use, ≤5s clips)

## Audio production

- Voiceover language: **English** (judges are international; Indonesian voice note inside the demo adds authentic flavor and shows multilingual capability — Gemma 4 understands it natively, which is a subtle but powerful flex)
- Voice talent: native or near-native English speaker, calm/serious tone, not breathless TED-talk energy
- Music: licensed bed (YouTube Audio Library or Artlist — has CC-attribution-OK tracks suitable for serious-but-hopeful tone)

## On-screen text style

- Sans-serif, white on dark, gentle motion-in
- Numbers and severities pulse subtly when introduced
- Never put a wall of text on screen — pick one fact per beat

## What we are deliberately *not* showing

- Code (it lives in the writeup + repo, not the video)
- Architectural deep-dive diagrams beyond scene 10 (one schematic is enough — judges who care will read the writeup)
- Multiple disaster types (one strong demo > three weak ones)
- Future roadmap (we close on impact, not promises)

## Version history

- **v1 (2026-05-13):** initial script, written before any footage is captured. Expect heavy revision after Day 3 once we know what we can film and what the actual app outputs look like.
