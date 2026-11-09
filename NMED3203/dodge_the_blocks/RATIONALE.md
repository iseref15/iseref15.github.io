# Dodge the Blocks — Design Rationale

<!-- RATIONALE-BODY-START -->

## Idea

Dodge the Blocks explores how a simple decision changes when the time available to make it steadily decreases. The player moves a blue square horizontally to avoid falling striped blocks. Instead of adding power-ups or complex controls, I designed one repeated action whose consequences become harder to manage. Survival therefore depends less on learning new commands than on adapting familiar movement to increasing pressure.

## Premise A and B: Agency and Temporality

I combined Agency and Temporality so neither works as a separate feature. Agency is expressed through the player's immediate control of horizontal movement using the keyboard or on-screen buttons. Temporality is built into the run: elapsed time increases falling speed at regular milestones, reducing the opportunity to react. Because players choose their position, the speeding blocks change the consequences of that choice. Normal and Fast use different starting speeds but keep the same spawning rules, making time pressure the main variable. I also designed an unseen safe route through incoming obstacles, so a demanding pattern remains avoidable rather than arbitrarily impossible.

## Theory

Wardrip-Fruin et al. (2009) describe agency as a relationship between players' intentions and actions a game supports, rather than unlimited freedom. I made movement predictable: holding left or right immediately changes position, while collision gives that choice a consequence. Yet this agency is deliberately narrow: players cannot control when blocks appear, and having an available action does not guarantee time to execute it. Sicart (2008) defines mechanics as actions agents use to interact with a game's state. I therefore centred the experience on dodging, with speed progression, collisions and scoring forming the system around that action. Sicart's definition alone cannot establish fairness, so I kept a traversable route through obstacle patterns. The readings helped me make one action meaningful without assuming that adding features automatically creates more agency.

## What I learned

Testing at phone width showed the Mode indicator stranded on its own row, making the interface look broken before play began. I revised the score panel to keep information together. An automated steering test later ended in a collision in Normal mode; checking the route suggested the bot's steering, rather than an impossible pattern, caused it. I learned to distinguish layout problems, control performance and rule fairness.

<!-- RATIONALE-BODY-END -->

## Live Project

[Dodge the Blocks — GitHub Pages](https://iseref15.github.io/NMED3203/dodge_the_blocks/)

## References

- Sicart, M. (2008). *Defining game mechanics*. *Game Studies, 8*(2). https://www.gamestudies.org/0802/articles/sicart/
- Wardrip-Fruin, N., Mateas, M., Dow, S., & Sali, S. (2009). *Agency reconsidered*. *Proceedings of DiGRA 2009: Breaking New Ground: Innovation in Games, Play, Practice and Theory*. https://dl.digra.org/index.php/dl/article/view/369
