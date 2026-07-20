# lecture-deck-kit

[![Version](https://img.shields.io/badge/version-0.9.2-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple.svg)

[한국어](README.md) · **English**

A [Claude Code](https://claude.com/claude-code) plugin that builds your lecture slides as an HTML deck — and lets you **fix them right in the browser window where they're showing.**

Highlight the sentence you want changed, type something like "make this less stiff", and that spot gets fixed and the page refreshes. You stay on the slide you were looking at.

![A sentence is dragged to select it, an instruction is typed, and that sentence alone changes while the slide stays put](docs/live-edit-demo.gif)

## What makes it different

The thing you want to fix is right there on screen, but **describing where it is takes longer than fixing it.** If you've ever typed "you know that second line on slide 3, the end of it…" into a chat window, you know the feeling. The tedious part was never the writing. It was the pointing.

| | Telling it in chat | This plugin |
|---|---|---|
| Pointing at the spot | Count the slides, describe the paragraph | **One drag** |
| Checking the result | Refresh, then find that slide again | Updates itself, **stays on your slide** |
| The file itself | — | Ready to hand off at any moment, even mid-edit |

Ten edits go from about ten round trips down to three. More precisely, what disappears isn't the round trips — it's **the edits you used to skip because explaining them wasn't worth the trouble.**

→ [Why I built this, and fuller usage notes](docs/why.md) · [Why it's built this way, and what I tried first](docs/architecture.md)

## How it runs

```
A few questions → Outline → ★You confirm the outline → Build the HTML and show it → 🔁Fix it on screen → Done
```

**The questions are deliberately few.** Who's listening, what the session is for, how long it runs, what tone you want, and whether there's existing material to work from — five things, then it starts building. Asking about every last phrase up front would throw away the very thing this plugin is for.

**It stops just once.** The skeleton — slide order, the point each slide makes — is expensive to change later, so it gets your OK before anything is written. Wording is cheap to change on screen, so nothing stands in its way.

## Install

```
/plugin marketplace add parkjui92/lecture-deck-kit
/plugin install lecture-deck-kit@lecture-deck-kit
```

## Using it

Just ask in plain language.

```
Make me a 2-hour workshop deck for new researchers on policy research methods   ← from scratch
Open this deck so I can fix it on screen                                        ← a deck you already have
Undo that last one                                                              ← back to how it was
```

As that second line shows, **decks you built earlier can be opened and edited the same way.**

On the deck in your browser: **drag across the sentence** you want changed, click the `💬` that pops up, and type what you want. To change a whole slide, use the `💬` at the top of it; for the whole deck, `Deck-wide` at the bottom right; for a table, list, or figure, `Pick element`.

Send several in a row if you like. They get collected and applied together, and the page refreshes **once, at the end** — so you never catch it half-finished.

## How it works

What this plugin is really good at isn't writing prose. It's **not losing track of your edits.**

Everything you send is stacked up in order, and it keeps a separate note of how far it has gotten. So if the "there's something to fix" nudge goes missing or arrives twice, nothing breaks — and **anything you send while it's mid-edit still gets done**, in order, exactly once.

Every slide carries its own number, and that number never changes once assigned. Insert a slide or split one in two, and all the others keep the numbers they had. That's what stops a note you left earlier from landing on the wrong slide. Right before applying anything it also checks that the slide title matches; if it doesn't, it stops and asks instead of guessing.

There's no team of AIs dividing up the work here. When you're fixing things on screen, **fast is the same thing as good**, and extra layers in the middle only slow it down.

## What you end up with

The editing tools are **attached only while the deck is being shown to you.** They never go into the saved HTML file. So you can grab the file at any point mid-edit and use it as is, and there's no "strip out the editing bits" step at the end, because there's nothing to strip.

The deck doesn't fetch anything from the internet, so **one file is all you need** — it opens offline, and shares or prints just as it is.

## Good to know

- **All you need is `python3`.** Nothing to install. The browser window comes from the Claude Code desktop app; if you don't have it, opening `localhost:4601` yourself works exactly the same.
- **Decks whose slides are generated on the fly by JavaScript** can't be edited this way — there's no sentence in the file to fix.
- **It doesn't make `.pptx` files.** What you get is HTML.
- If an instruction is ambiguous, it asks rather than guessing. Two people editing the same deck at the same time isn't supported.
- It's shaped around Korean lecture conventions (Korean typography, Korean-language slides).
- [If setup gives you trouble](docs/runtime-notes.md)

## Related work

**Plugins that write reports and proposals** — [policy-research-kit](https://github.com/parkjui92/policy-research-kit) (policy research reports) · [rnd-proposal-kit](https://github.com/parkjui92/rnd-proposal-kit) (Korean government R&D proposals) · [socsci-paper-kit](https://github.com/parkjui92/socsci-paper-kit) (social science papers)

**Single-purpose tools** — [fact-verify](https://github.com/parkjui92/fact-verify) (check whether sources are real) · [paper-proofread](https://github.com/parkjui92/paper-proofread) (Korean academic proofreading) · [form-tailor](https://github.com/parkjui92/form-tailor) (match an organization's document format) · [report-to-brief](https://github.com/parkjui92/report-to-brief) (shorten long reports)

## License

[MIT](LICENSE). No real lecture material or client deliverables are included.
