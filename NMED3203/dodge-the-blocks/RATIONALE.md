# Dodge the Blocks — Design Rationale

> **DRAFT — not final.** Items marked **[VERIFY]** or **[TO COMPLETE]** need your personal action before submission. See the checklist at the bottom. Delete this note and the checklist when finished.

<!-- RATIONALE-BODY-START -->
## Idea

Dodge the Blocks asks one question: what changes when the same action must be made in less time? The player only slides a blue square left or right, yet that single choice is judged against falling blocks that speed up the longer the run lasts. I kept the game small so the argument stays visible.

## Premise A and B: Agency and Temporality

Agency here means that input has a clear, visible effect: holding a key moves the square, and its position alone decides whether a block collides. Temporality means the run's own elapsed time, not a clock outside the game, raises obstacle speed by a fixed step at fixed milestones. The two depend on each other. Because of Agency, the participant can choose where to stand, and because of Temporality, that same choice must be made in a shrinking window. Normal and Fast differ only in starting speed, so the comparison isolates time pressure rather than adding a second mechanic. For the same reason spawn timing is identical in both modes, and an invisible safe path keeps every block avoidable.

## Theory

Wardrip-Fruin et al. (2009) discuss agency as something that depends on how a system responds to player action **[VERIFY: check this paraphrase against the paper]**. This shaped my mapping: one input, one direct result, one consequence. A limit is that my agency is thin, because players choose only position, never risk or strategy. Sicart (2008) treats a mechanic as something a player does that acts on the state of the game **[VERIFY: check against the article]**. That led me to treat movement, collision, scoring and speed progression as one small connected set rather than a feature list. A counterpoint is that this definition says little about whether a mechanic feels fair, so I added a fairness check myself.

## What I learned

**[TO COMPLETE AFTER USER TEST: write about 55 words. Describe one real observation from someone unfamiliar with the game, and one design change you made because of it. Do not invent this.]**
<!-- RATIONALE-BODY-END -->

## References

- Sicart, M. (2008). Defining Game Mechanics. *Game Studies, 8*(2). <https://gamestudies.org/0802/articles/sicart>
- Wardrip-Fruin, N., Mateas, M., Dow, S., & Sali, S. (2009). Agency Reconsidered. *DiGRA 2009*. <https://dl.digra.org/index.php/dl/article/view/369>

## Live game

**[TO COMPLETE]** `https://USERNAME.github.io/dodge-the-blocks/` (not published yet; replace after GitHub Pages is live and tested)

---

## Verification checklist (delete before submitting)

- [ ] Read Wardrip-Fruin et al. (2009) yourself. Rewrite the "Readings" sentence in your own words and fix it if it does not match the paper.
- [ ] Read Sicart (2008) yourself. Check the definition of mechanics and rewrite it in your own words.
- [ ] Do not cite either text if you have not opened it.
- [ ] On the lab's Bibliography page, check that both readings are on the reading shelf and belong to your premises (Agency, Temporality) or to the shelf's method/learning sections, as the assignment guide requires.
- [ ] Run a real test with someone who has not seen the game. Write one true observation and one true change in "Testing and revisions".
- [ ] Count words again after filling in the placeholder. The body must be 315–385 words. Paste the text between the RATIONALE-BODY markers into any word counter (headings count too if your teacher counts them).
- [ ] Publish on GitHub Pages, open the URL in a private window (and ideally on a phone), then fill in the link.
- [ ] Optional: Jota et al. (2013) is about input latency, not obstacle speed. Use it only with a clearly qualified argument.
