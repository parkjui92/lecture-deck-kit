# lecture-deck-kit

[![Version](https://img.shields.io/badge/version-0.9.1-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)

[한국어](README.md) · **English**

> A [Claude Code](https://claude.com/claude-code) plugin that builds lecture slides as a self-contained HTML deck — and lets you **edit them right in the browser window where they're displayed**.
> Highlight the sentence you want changed, type "less defensive", and it gets fixed and refreshed in place — keeping you on the slide you were looking at.

---

## Why this exists

Most people are happy with the first AI-generated draft of a deck. The pain starts when they try to **change** it.

You skim the draft and spot ten things to fix. But to communicate them, you have to write:

```
The second bullet on slide 3 is too defensive
Slide 7 has too much — split it in two
And that table, the comparison one — which slide was it again?
```

Every single fix carries a round trip: **count the slides, describe the paragraph in words, then re-check the result.**
The thing you want to change is right there on screen, yet *pointing at it* costs more than *changing it*.
So you start settling — "this one's not worth explaining." **The bottleneck was never the writing. It was the pointing.**

This kit removes the pointing. **The mouse indicates; you only say what you want.**

Drag across a sentence and an input appears right there. Type "the evidence here is weak" and send.
Claude locates that sentence in the source, fixes it, and the page refreshes. No slide numbers involved.

One more thing: adding an editing tool must not **contaminate the deliverable**. So the editing overlay is never
written to the file — the server injects it only when serving the page. You can hand off the file at any point
mid-editing and it is deployable as is. There is no "remember to strip the editor" step, because there is nothing to strip.

---

## What changes — the cost of one edit

| | Instructing via chat | This kit |
|---|---|---|
| Pointing | Count slides, describe the paragraph | **One drag** |
| Mis-targeting | Miscount and the wrong slide gets edited | The selected text itself is sent |
| Many edits | One exchange each | Queue them up, applied as a batch |
| Verification | Refresh, then navigate back | Auto-refresh, **stays on your slide** |
| Deliverable | — | Always deployable, even mid-edit |

Ten edits collapse from ten round trips to about three. More precisely, what disappears is
**the edits you used to skip because explaining them wasn't worth it.**

---

## Pipeline

```
Interview (audience · goal · duration · tone)
  → Outline draft
  → ★ User approval gate  ← you shape the structure here
  → HTML build + server + browser
  → 🔁 Live editing (highlight → instruct → auto-apply → auto-refresh)
  → Ship (file / link / print)
```

**The interview is deliberately short.** Five questions, then it builds.
Trying to settle wording through interviewing throws away the whole point — **build first, fix on screen.**

**There is only one gate.** Structure (slide order, headline claims) is expensive to change later, so it gets
approved before writing. Wording is cheap to change on screen, so no gate stands in its way.

---

## Install

```
/plugin marketplace add parkjui92/lecture-deck-kit
/plugin install lecture-deck-kit@lecture-deck-kit
```

Requires only `python3` (standard library only — nothing to install).
Designed for the Claude Code desktop app, which provides the browser pane.

---

## How to use

### 1 — From scratch

```
Make me a 2-hour workshop deck for new researchers on policy research methods.
```

It asks five questions, shows an outline, and once approved builds the deck and opens it in the browser.
From that point you edit on screen.

### 2 — Editing on screen (the core)

| What you want | How |
|---|---|
| Fix a sentence | **Drag** it → click `💬` → type the instruction |
| A whole slide | `💬` badge on the slide |
| The whole deck | `Deck-wide` button, bottom right |
| A table / list / figure | `Pick element` in the panel, then click it |

Type freely, or use the preset chips: split in two · strengthen evidence · less defensive · more concise ·
make the table comparative · add a visual · add an example · soften the tone.

Send several in a row and they are applied as one batch — the page refreshes **only once, at the end**,
so you never see a half-edited state.

### 3 — An existing HTML deck

```
Open this deck and start live editing.
```

Slides get a stable ID assigned once, then editing begins. The ID pass adds one attribute per slide —
content and slide count are untouched (measured: zero differences beyond the attribute on a 22-slide deck).

### Undo

```
Undo that last one.
```

The pre-edit state is snapshotted automatically before every batch, so one step goes back. Undo is itself undoable.

### Presenting

`←` `→` navigate · `O` outline · `N` speaker notes · `T` light/dark · `F` fullscreen · `number+Enter` jump

---

## How it works

The value here is not text generation — it is **the reliability of the loop.** Three design decisions carry it.

**1. State is separated from signal.** Feedback accumulates in `queue.jsonl` (append-only); how much has been
processed lives in `cursor` (one integer). Pending work is determined solely by the arithmetic
**lines − cursor**. So a lost or duplicated wake-up notification is harmless, and **feedback arriving mid-batch
is never dropped.** If the auto-wake dies, the system degrades to semi-automatic (type one character in chat)
with structurally zero data loss.

**2. Deliverable purity is structural, not procedural.** The overlay `<script>` is injected into the HTTP
response, never written to disk. The easily-forgotten manual invariant ("strip the editor before shipping")
simply does not exist.

**3. Slide IDs are immutable.** Displayed numbers are computed at runtime; the internal `data-sid` is permanent.
Splitting a slide keeps the ID on the front half and assigns a new one to the back. **Nothing is ever renumbered** —
otherwise queued feedback would start pointing at the wrong slide. Before applying, the slide title is cross-checked;
on mismatch the edit stops and asks. (Silently editing the wrong slide is this system's worst failure mode.)

Design rationale and rejected alternatives: [docs/architecture.md](docs/architecture.md).

---

## Components

No agent team. For live editing, **responsiveness is quality**, and a delegation layer costs more than it gives.
Three skills and one toolset instead.

| Skill | Role |
|---|---|
| `lecture-deck-orchestrator` | Runs the five-phase pipeline; responds to "make me a lecture deck" requests |
| `lecture-deck-build` | Authoring spec — standard skeleton, slide grammar, interview questions |
| `lecture-live-edit` | Live-edit protocol — drain procedure, anchoring, adoption, session resume |

| Tool (`lecture-live-edit/scripts/`) | Role |
|---|---|
| `server.py` | Static serving + overlay injection + feedback intake (binds `127.0.0.1`) |
| `editor.js` | The overlay — selection capture, instruction input, status, auto-refresh |
| `lle.py` | Queue CLI — `pending` / `done` / `status` / `adopt` / `revert` |

> **Standard skeleton included.** New decks start from `assets/deck-skeleton.html`: static slide markup plus an
> outline view, speaker notes, progress bar, hash navigation, print CSS, and light/dark themes. **No external CDN**,
> so a single file opens offline and shares or prints as is.

---

## Requirements & fallbacks

- Only **`python3`**. Standard library only — no `pip install`.
- The **browser pane** comes from the Claude Code desktop app. Without it, opening `localhost:4601` manually
  works identically, auto-refresh included.
- **Auto-wake is per session.** After a new session it must be re-armed; feedback queued in the meantime is
  applied in one batch on resume.
- Details: [docs/runtime-notes.md](docs/runtime-notes.md).

## Limitations

- **Decks whose slides are generated at runtime by JS** cannot be live-edited — there is no source location to fix.
  They must be converted to static markup first.
- **It does not produce `.pptx`.** The output is HTML.
- Ambiguous instructions are queried back rather than guessed at. Sometimes convenient, sometimes not —
  judged better than a confident wrong edit.
- Two sessions editing the same project concurrently is unsupported (double cursor writers).
- Tuned for Korean-language lecture conventions (typography, Korean slides).

## Further reading

- [docs/architecture.md](docs/architecture.md) — queue/cursor protocol, deliverable purity, rejected alternatives
- [docs/runtime-notes.md](docs/runtime-notes.md) — requirements, ports, path resolution, fallbacks
- [examples/live-edit-demo/](examples/live-edit-demo/) — three real round trips, before and after

## Series

Sister kits and standalone verification skills built on the same philosophy:

**Agent-team kits** — [policy-research-kit](https://github.com/parkjui92/policy-research-kit) · [rnd-proposal-kit](https://github.com/parkjui92/rnd-proposal-kit) · [socsci-paper-kit](https://github.com/parkjui92/socsci-paper-kit)

**Standalone skills** — [fact-verify](https://github.com/parkjui92/fact-verify) · [paper-proofread](https://github.com/parkjui92/paper-proofread) · [form-tailor](https://github.com/parkjui92/form-tailor) · [report-to-brief](https://github.com/parkjui92/report-to-brief)

## License

[MIT](LICENSE). The bundled example deck is synthetic placeholder content; no real lecture material or client
deliverables are included.
