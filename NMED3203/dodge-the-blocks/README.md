# Dodge the Blocks

**Course:** NMED 3203 — Interactive Media Applications
**Selected premises:** Agency (01) + Temporality (04)

**Experience in one line:** Slide a blue square to dodge falling red blocks, and feel your reaction window shrink as the blocks speed up over time.

## How to play

1. Choose **Normal** or **Fast** and press **Start Game**.
2. Move the blue square left and right so the red striped blocks never touch it.
3. Blocks arrive one by one at random moments and heights, several at the same time. You never wait for one to leave before the next appears, and some moments bring no block. A way through always exists. Each block that passes you safely gives **1 point**.
4. Every 10 seconds of survival the blocks fall faster ("Speed increased!") and change to a new random colour. The Speed panel shows the current level and the time until the next speed-up.
5. If a block touches you, the run ends. Press **Restart** to try again.

## Controls

| Action | Keyboard | Touch / mouse |
| --- | --- | --- |
| Move left | `←` or `A` | Hold the **Left** button |
| Move right | `→` or `D` | Hold the **Right** button |

- Holding left and right together cancels out (no movement).
- The on-screen buttons also work with the keyboard: focus one with `Tab`, then hold `Space` or `Enter`.
- Releasing a key, leaving the window or switching tabs stops movement.

## Premises

- **Agency:** Your input moves the player; your position decides whether a block hits you. Dodging earns points, a bad position ends the run.
- **Temporality:** The elapsed time of the run raises the block speed at fixed steps. The same distance takes a block less time to fall, so the same move must be made faster.
- **Interaction:** You keep full control of movement, but time changes how well that control can be used. Compare **Normal** and **Fast** (they differ only in starting speed), or compare the same dodge early and late in one run.

## GitHub Pages URL

`https://USERNAME.github.io/dodge-the-blocks/` — **not published yet.** Replace `USERNAME` after publishing and testing the link.

## Run locally

ES modules do not load from `file://`, so use a tiny local server:

```bash
cd dodge-the-blocks
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure: title, score panel, canvas, menus, on-screen buttons |
| `styles.css` | Layout, colours, focus styles, phone layout |
| `src/config.js` | **All rule settings. Edit here.** |
| `src/game.js` | Game state, update loop, random spawning, collision, difficulty, drawing |
| `src/scenery.js` | Pixel-art sky, clouds, city, trees and grass (drawn in code) |
| `src/main.js` | Buttons, keyboard and touch events, updates the page text |
| `RATIONALE.md` | Design rationale and references |

### Where to change the rules

Open `src/config.js`, change a number, save and refresh the page.

| Setting | Effect |
| --- | --- |
| `initialObstacleSpeedPxPerSecond` | How fast blocks fall at the start |
| `speedIncreasePxPerSecond` | How much faster they get at each milestone |
| `difficultyIntervalSeconds` | Time between milestones |
| `maximumObstacleSpeedPxPerSecond` | Speed cap |
| `playerSpeedPxPerSecond` | How fast the player moves (strength of agency) |
| `obstacleWidth` | Block width (room for successful choices) |
| `fastModeMultiplier` | Fast mode start speed = initial speed × this |
| `spawnDelayMinMilliseconds` / `spawnDelayMaxMilliseconds` | Random wait between blocks (smaller = more blocks) |
| `spawnSkipChance` | Chance that a moment brings no block |
| `safeGapMarginPx` | Extra room around the invisible safe path (bigger = easier) |
| `corridorSafetyFactor` | How fast the safe path may move (lower = easier) |

If a setting could make the game impossible, a warning appears in the browser console (`checkFairness` in `src/game.js`).

## Rationale

See [RATIONALE.md](./RATIONALE.md).

## Credits

- Code, design and graphics: written for this course project. All graphics, including the pixel-art scenery, are drawn in code with the HTML canvas and CSS. No external images, libraries or fonts are used. The visual style was inspired by a pixel-art reference image supplied by the student.
- Readings (listed in [RATIONALE.md](./RATIONALE.md)): Wardrip-Fruin et al. (2009); Sicart (2008).
- Course lab materials: <https://mertseven.com/ima/lab/bibliography.html>

## AI use note

- **Tool:** Claude Code (Claude Sonnet 5.5, Anthropic) generated the first version of the code (`index.html`, `styles.css`, `src/*.js`), the README, the draft of RATIONALE.md and CLAUDE.md, following `SPEC.md`.
- **What I did myself:** *[TO COMPLETE: describe what you personally did, e.g. reading the papers, user testing, choosing and editing settings, writing the final rationale.]*
- **Corrections made during the build (true):** After the first build, Claude Code checked the game at phone width in a browser. The score panel showed the "Mode" box alone on its own row, which looked broken, so the layout was corrected. Later, an automated test bot crashed in Normal mode; this turned out to be a mistake in the test bot (it steered toward the wrong row), not in the game rules, and the bot was fixed.
- *[TO COMPLETE — the assignment asks for one example where YOU rejected or corrected what the tool produced. Add your own true example here.]*
