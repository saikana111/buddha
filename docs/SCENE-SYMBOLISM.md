# The grove throughout the day

The clock phases use original SVG pixel-style scenery and CSS animation. These
are artistic interpretations of images and teachings in the Dhammapada, not
claims that the canon assigns particular symbols to particular hours. No text
from these research translations is copied into the app.

| Phase | Scene event | Textual basis and interpretation |
| --- | --- | --- |
| Dawn (`sunrise`) | Golden bodhi leaves slowly fall from the tree. | [Dhp 277](https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.20.than.html): conditioned things are impermanent. Falling leaves are our visual interpretation; this verse does not mention leaves or dawn. |
| Morning | A small bird perches on a branch, hops, flies away, and returns. | [Dhp 92–93](https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.07.than.html): the liberated person's course is compared to the untraceable flight of birds. The bird species and perch are artistic choices, not sacred attributes. |
| Midday | A bee gently visits a lotus, with a slight ripple below it. | [Dhp 49 and 58–59](https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.04.than.html): the bee takes nectar without damaging a flower, a model for the sage's conduct; the lotus is an image of discernment arising amid unfavorable surroundings. The verse does not specifically identify the bee's flower as a lotus. |
| Sunset | An earthen oil lamp flickers beside the path. | [Dhp 146](https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.11.than.html): seeking a lamp while enveloped in darkness. The scene makes the metaphor visible; it does not prescribe a sunset ceremony. |
| Night | A full moon emerges as a cloud moves aside; small fireflies glow below. | [Dhp 382](https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.25.than.html): a young monk devoted to the teaching illuminates the world like the moon freed from clouds. Fireflies are atmosphere, not a claim about this verse. |

Research references: Thanissaro Bhikkhu's translations hosted by Access to
Insight, consulted 2026-10-20. Their translation licenses remain their own.
These links document design choices and do not add a new translation corpus.

Daytime uses only the clouds already painted into the background, avoiding
competing overlay styles. At night, one subdued, slightly softened cloud
drifts past the moon; its opacity ranges from 0.08 to 0.4. Nighttime
fireflies have bright centers and soft green-gold halos around the pond and tree;
they remain visible when motion is disabled. Existing time-of-day palette swaps
are preserved. Props are phase-specific; no additional dialogue-panel text
is introduced. Scene descriptions are exposed through the existing title and
accessible label.

Use Profile → Debug: time of day to preview each phase. Automatic mode follows
the local clock. Clicking the scene pauses all animations. Reduced-motion
preferences keep static props, stop movement, hide falling leaves, and leave
the moon uncovered. No external assets or network requests are required.
