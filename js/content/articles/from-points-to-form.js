/* Loaded only when this article is requested. */
LearningContent.load("from-points-to-form", {
  "sections": [
    [
      "Start with a small question",
      "Could the same visual become a different thing when you enter a different space? We began with a zero. We wanted it to become an experiment, then a title, without disappearing between pages. This article is the notebook for that attempt. You do not need to draw, design, or write code to follow the idea."
    ],
    [
      "A shape is a set of addresses",
      "Imagine a crowd holding small lights. Each person has a place to stand. From above, those lights might describe a circle. Give the same people a new set of places and they can form a word. In our scene, a particle is one of those lights. Its address has three numbers: left or right, up or down, and nearer or farther away. The shape is the collection of addresses, not a photograph pasted onto the page.",
      "The screen still displays a flat image. A small program called a shader projects those three-dimensional addresses onto it. Rotation changes which side we see; focus changes which depths look crisp. That is why turning the word reveals a little thickness instead of simply spinning a flat label."
    ],
    [
      "What we tried, and what fell short",
      "Our first background mixed several blue-green gradients. Behind the new particle zero, an older painted ring was still visible. The combination made two visual systems compete. We removed the overlap and let a quieter charcoal field support the light.",
      "For Proximity, we first arranged small particle volumes into literal groups. The explanation was clear, but the visual felt too much like a diagram. Studying Blurry led us toward continuous lines and surfaces. The current experiment follows three folded ribbons. Their strands approach, overlap, and separate in depth: a more expressive way to suggest relationships.",
      "We also discovered that particle order mattered. When disappearance followed that order, whole regions could vanish together. An independent, repeatable random value spreads the dissolution across the form. Random does not have to mean different every time."
    ],
    [
      "Building a form, one decision at a time",
      "First, choose something you want people to understand. We chose belonging: when do separate paths feel connected? Then draw a few paths in space. Our three ribbons contain 72 filaments, split into 9,216 short line segments. Those segments describe the paths; they are not 9,216 separate objects on the screen.",
      "Next, place points along the paths. Longer segments get proportionally more samples, so the light does not bunch up just because a line was divided differently. Give every point a destination on the original zero and another on the ribbon. Keep its identity when the destination changes.",
      "Finally, move between the two address lists. At the start, a point is entirely at its old address. Halfway through, it is between the two. At the end, it reaches the new one. A gentle timing curve lets the movement begin and end softly. The trip takes 1.8 seconds in this version."
    ],
    [
      "How a word joins the same system",
      "A word can supply addresses too. We draw its letters into a small, invisible image, find the filled pixels, and sample points inside them. A little thickness gives those points depth. The letters are generated from the title text; they are not a new model someone has to draw for each article.",
      "Try another title above, then rotate it. Longer phrases need smaller letters or more lines. Thin details may become harder to read. This is a useful limit: an expressive headline still needs to communicate. A normal text heading remains in the article so the meaning survives if the animated version cannot render."
    ],
    [
      "A page changes; the visual stays",
      "Think of the page as a stage. The scenery can change while one performer stays in the same space. Our canvas—the surface where the particles are drawn—belongs to the shared layout. The article and experiment are separate page layers. Fading a page therefore does not fade or rebuild the particle system.",
      "ARK and Flux keep one shared record of where we are. The page content and the mesh read that record. Before this, separate flags controlled shape, movement, and visibility, and could disagree. Now a request to open Proximity means one coherent destination: ribbons, moved aside, at 50% dissolution. Back asks for the whole zero again."
    ],
    [
      "Make the experiment safe to interrupt",
      "People do not wait politely for an animation to finish. They click Back halfway through. We start the next movement from the current pose instead of jumping to a preset beginning. An old exit is not allowed to hide the page you have just reopened.",
      "We also keep inactive pages out of keyboard navigation, move focus out of a page before it closes, and respect reduced-motion preferences. Pause stops the ambient movement. These decisions are part of the experience, not finishing touches."
    ],
    [
      "What we know—and what we still need to learn",
      "Automated checks cover route changes, reversals, the 50% hold, restoration, and the geometry remaining within its bounds. A static projection helped us inspect the ribbons. Those checks do not prove that the experience feels smooth on every phone or that everyone understands the visual. Live device testing and feedback are still needed.",
      "The next useful question is not how much more we can add. It is whether a new movement helps someone understand where they are. We will keep the experiment and these notes together, so each teaches us how to improve the other."
    ]
  ],
  "numbers": false
});
