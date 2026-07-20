# lecture-deck-kit

[![Version](https://img.shields.io/badge/version-0.9.2-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)

[한국어](README.md) · **English**

A [Claude Code](https://claude.com/claude-code) plugin that builds lecture slides as a self-contained HTML deck — and lets you **edit them right in the browser window where they're displayed**.
Highlight the sentence you want changed, type "less defensive", and it gets fixed and refreshed in place — keeping you on the slide you were looking at.

<!-- demo GIF goes here -->

## What changes — the cost of one edit

The thing you want to change is right there on screen, yet *pointing at it* costs more than *changing it*. **The bottleneck was never the writing. It was the pointing.**

| | Instructing via chat | This kit |
|---|---|---|
| Pointing | Count slides, describe the paragraph | **One drag** |
| Verification | Refresh, then navigate back | Auto-refresh, **stays on your slide** |
| Deliverable | — | Always deployable, even mid-edit |

Ten edits collapse from ten round trips to about three. More precisely, what disappears is **the edits you used to skip because explaining them wasn't worth it.**

→ [Why I built this + detailed usage](docs/why.md) · [Design rationale and rejected alternatives](docs/architecture.md)

## Pipeline

```
Interview (audience · goal · duration · tone · existing material) → Outline → ★ approval gate → HTML build + browser → 🔁 Live editing → Ship
```

**The interview is deliberately short.** Five questions, then it builds — trying to settle wording through interviewing throws away the whole point.
**There is only one gate.** Structure (slide order, headline claims) is expensive to change later, so it gets approved before writing; wording is cheap to change on screen, so no gate stands in its way.

## Install

```
/plugin marketplace add parkjui92/lecture-deck-kit
/plugin install lecture-deck-kit@lecture-deck-kit
```

## Usage

```
Make me a 2-hour workshop deck for new researchers on policy research methods   ← from scratch
Open this deck and start live editing                                           ← an existing HTML deck
Undo that last one                                                              ← back to the pre-edit state
```

On the live deck: **drag the sentence** → click the `💬` that appears → type the instruction. A whole slide is its `💬` badge, the whole deck is `Deck-wide` at bottom right, and a table, list or figure is picked with `Pick element`.
Send several in a row and they are applied as one batch — the page refreshes **only once, at the end**, so you never see a half-edited state.

## How it works

The value here is not text generation — it is **the reliability of the loop.** Feedback accumulates in an append-only queue and a cursor remembers how much has been processed; pending work is the arithmetic **lines − cursor** and nothing else, so a lost or duplicated wake-up notification is harmless and **feedback arriving mid-batch is never dropped.**
The internal slide ID (`data-sid`) is permanent and **nothing is ever renumbered** — otherwise queued feedback would start pointing at the wrong slide. Before applying, the slide title is cross-checked; on mismatch the edit stops and asks.
There is no agent team. For live editing **responsiveness is quality**, and a delegation layer costs more than it gives — three skills and one toolset instead.

## What you get

The overlay `<script>` is injected into the HTTP response and **never written to disk.** You can hand off the file at any point mid-editing and it is deployable as is; there is no "strip the editor" step at the end, because there is nothing to strip.
The deck uses **no external CDN**, so a single file opens offline and shares or prints as is.

Worked example: [three real round trips, before and after](examples/live-edit-demo/)

## Requirements & limits

- Only **`python3`** — standard library, no `pip install`. The browser pane comes from the Claude Code desktop app; without it, opening `localhost:4601` manually works identically
- **Decks whose slides are generated at runtime by JS** cannot be live-edited — there is no source location to fix
- **It does not produce `.pptx`.** The output is HTML
- Ambiguous instructions are queried back rather than guessed at. Two sessions editing the same project concurrently is unsupported
- Tuned for Korean-language lecture conventions (typography, Korean slides)
- [Ports, paths, fallbacks](docs/runtime-notes.md)

## Series

**Agent-team kits** — [policy-research-kit](https://github.com/parkjui92/policy-research-kit) · [rnd-proposal-kit](https://github.com/parkjui92/rnd-proposal-kit) · [socsci-paper-kit](https://github.com/parkjui92/socsci-paper-kit)

**Standalone skills** — [fact-verify](https://github.com/parkjui92/fact-verify) · [paper-proofread](https://github.com/parkjui92/paper-proofread) · [form-tailor](https://github.com/parkjui92/form-tailor) · [report-to-brief](https://github.com/parkjui92/report-to-brief)

## License

[MIT](LICENSE). The bundled example deck is synthetic placeholder content; no real lecture material or client deliverables are included.
