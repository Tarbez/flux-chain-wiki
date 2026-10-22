'use strict';
/* Layout-key continuity of the story pages (tests/story-blocks.cjs): for each route, the old keys
   whose words changed shape (`reshaped`: pinned onto their successor by the page's `was`) and the
   ones nothing carries now (`retired`), each with its reason. Derived from
   `node tests/lib/layout-continuity.cjs derive <route>`'s unresolved list against the frozen
   censuses in tests/fixtures/layout-keys/ (2026-10-19, W3-STORY); icons inside old links are
   retired by tests/story-blocks.cjs itself. Read only by that test. */
module.exports = {
 "/concept/purpose": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:4": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/concept/depth": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:7": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/concept/practice": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:2": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/concept/notes": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:4": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/concept/studio": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:2": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/concept/spec": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:3": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/dao": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Operating model / this page",
   "page:/nav:2": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/nav:2/button:1": "\"The core idea\" is \"The idea\", the one label set on every story page",
   "page:/nav:2/button:2": "\"How it works\" is \"Step by step\" since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:2/button:3": "\"Evidence & limits\" is \"Evidence\", the one label set on every story page",
   "page:/div:1": "the answer beside its figure: the story body",
   "page:/div:1/div:1": "the answer and its status: the story body's main column",
   "page:/div:1/div:1/div:1": "the answer surface is The idea's panel",
   "page:/div:1/div:1/div:1/p:1": "the short answer opens with one plain sentence (W4-S13: two separate groups decide, each only inside its own scope) before the old sentence about mesh operations and the network DAO, which follows unchanged",
   "page:/div:1/figure:1": "the figure is Ark's frame (its kind label says \"Illustration\"; its caption names the drawing) around the same drawing and legend",
   "page:/div:1/figure:1/figcaption:1": "the caption carries the drawing's title too, which was drawn inside it at 8px",
   "page:/div:1/figure:1/svg:1": "the same drawing; its title moved to the caption",
   "page:/nav:3": "the closing link leads on with the words its destination authored for it (NOTES.CTA, in the one sentence case: W4-S14), not the hand-typed \"Inspect activation gates\"",
   "page:/nav:3/a:1": "the same link: its words are the destination's own (NOTES.CTA)"
  },
  "retired": {
   "page:/div:1/figure:1/svg:1/text:3": "the drawing's title is the figure's caption now: drawn inside the drawing at 8px it was unreadable"
  }
 },
 "/lifecycle": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/figure:1": "the reference fabric sits in Ark's figure frame, whose caption is the old figcaption",
   "page:/div:1/figure:1/div:1": "the fabric's top row; its \"ILLUSTRATION\" is the frame's kind label now",
   "page:/nav:2/a:1": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:2": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:3": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:4": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:5": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:1": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:2": "\"ILLUSTRATION\": the frame's kind label says it",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now"
  }
 },
 "/lifecycle/intent": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/div:1/p:1": "the kicker \"0n / STAGE\" is the eyebrow \"Agreement lifecycle · n of 5\": one numbering; the stage is the breadcrumb's last item",
   "page:/div:1/figure:1": "the stage scene sits in Ark's figure frame, which carries its label and caption now",
   "page:/div:1/figure:1/div:1": "the scene's top bar is the frame's kind label: \"Illustration -- not live data\"",
   "page:/div:1/div:1/div:1": "the answer view is The idea's panel; what becomes true is labelled there now",
   "page:/nav:2/a:2": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:3": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:4": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:5": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:1": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:1": "part of the scene's old top bar; the frame's kind label says \"Illustration\"",
   "page:/div:1/figure:1/div:1/span:2": "part of the scene's old top bar; the frame's kind label says \"not live data\"",
   "page:/nav:2/a:1": "the current stage's own trail link: the breadcrumb and the eyebrow name it",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now"
  }
 },
 "/lifecycle/offer": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/div:1/p:1": "the kicker \"0n / STAGE\" is the eyebrow \"Agreement lifecycle · n of 5\": one numbering; the stage is the breadcrumb's last item",
   "page:/div:1/figure:1": "the stage scene sits in Ark's figure frame, which carries its label and caption now",
   "page:/div:1/figure:1/div:1": "the scene's top bar is the frame's kind label: \"Illustration -- not live data\"",
   "page:/div:1/div:1/div:1": "the answer view is The idea's panel; what becomes true is labelled there now",
   "page:/nav:2/a:1": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:3": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:4": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:5": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:2": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:1": "part of the scene's old top bar; the frame's kind label says \"Illustration\"",
   "page:/div:1/figure:1/div:1/span:2": "part of the scene's old top bar; the frame's kind label says \"not live data\"",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2": "the current stage's own trail link: the breadcrumb and the eyebrow name it",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:3/a:1": "the previous-stage link: that stage is in the pager's related row, keyed by the trail link it was"
  }
 },
 "/lifecycle/agreement": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/div:1/p:1": "the kicker \"0n / STAGE\" is the eyebrow \"Agreement lifecycle · n of 5\": one numbering; the stage is the breadcrumb's last item",
   "page:/div:1/figure:1": "the stage scene sits in Ark's figure frame, which carries its label and caption now",
   "page:/div:1/figure:1/div:1": "the scene's top bar is the frame's kind label: \"Illustration -- not live data\"",
   "page:/div:1/div:1/div:1": "the answer view is The idea's panel; what becomes true is labelled there now",
   "page:/nav:2/a:1": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:2": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:4": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:5": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:2": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:1": "part of the scene's old top bar; the frame's kind label says \"Illustration\"",
   "page:/div:1/figure:1/div:1/span:2": "part of the scene's old top bar; the frame's kind label says \"not live data\"",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3": "the current stage's own trail link: the breadcrumb and the eyebrow name it",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:3/a:1": "the previous-stage link: that stage is in the pager's related row, keyed by the trail link it was"
  }
 },
 "/lifecycle/fulfillment": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/div:1/p:1": "the kicker \"0n / STAGE\" is the eyebrow \"Agreement lifecycle · n of 5\": one numbering; the stage is the breadcrumb's last item",
   "page:/div:1/figure:1": "the stage scene sits in Ark's figure frame, which carries its label and caption now",
   "page:/div:1/figure:1/div:1": "the scene's top bar is the frame's kind label: \"Illustration -- not live data\"",
   "page:/div:1/div:1/div:1": "the answer view is The idea's panel; what becomes true is labelled there now",
   "page:/nav:2/a:1": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:2": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:3": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:5": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:2": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:1": "part of the scene's old top bar; the frame's kind label says \"Illustration\"",
   "page:/div:1/figure:1/div:1/span:2": "part of the scene's old top bar; the frame's kind label says \"not live data\"",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4": "the current stage's own trail link: the breadcrumb and the eyebrow name it",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:3/a:1": "the previous-stage link: that stage is in the pager's related row, keyed by the trail link it was"
  }
 },
 "/lifecycle/receipt": {
  "reshaped": {
   "page:/div:1": "the answer beside its illustration: the story body",
   "page:/div:1/div:1": "the answer column: the depth control and the boundary (its kicker and heading are the hero's now)",
   "page:/div:1/div:1/nav:1": "the depth buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/div:1/nav:1/button:1": "\"Answer\" is \"The idea\", the one label set on every story page",
   "page:/div:1/div:1/nav:1/button:2": "\"Understand why\" is \"Step by step\", the one label set on every story page",
   "page:/nav:2": "the five-stage trail is the pager's related row",
   "page:/nav:3": "the onward links are Ark's pager",
   "page:/div:1/div:1/p:1": "the kicker \"0n / STAGE\" is the eyebrow \"Agreement lifecycle · n of 5\": one numbering; the stage is the breadcrumb's last item",
   "page:/div:1/figure:1": "the stage scene sits in Ark's figure frame, which carries its label and caption now",
   "page:/div:1/figure:1/div:1": "the scene's top bar is the frame's kind label: \"Illustration -- not live data\"",
   "page:/div:1/div:1/div:1": "the answer view is The idea's panel; what becomes true is labelled there now",
   "page:/nav:2/a:1": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:2": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:3": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:2/a:4": "the stage link, in the pager's related row; its number is the eyebrow's now",
   "page:/nav:3/a:2": "the onward link is the pager's next (\"Next\" over the same words)"
  },
  "retired": {
   "page:/div:1/figure:1/div:1/span:1": "part of the scene's old top bar; the frame's kind label says \"Illustration\"",
   "page:/div:1/figure:1/div:1/span:2": "part of the scene's old top bar; the frame's kind label says \"not live data\"",
   "page:/nav:2/a:1/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:2/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:3/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:4/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:2/a:5": "the current stage's own trail link: the breadcrumb and the eyebrow name it",
   "page:/nav:2/a:5/span:1": "the stage number in the trail: the eyebrow alone carries the position now",
   "page:/nav:3/a:1": "the previous-stage link: that stage is in the pager's related row, keyed by the trail link it was"
  }
 },
 "/how-deployment-works/ask": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb follows the address: Home / Deploy a resolver / this part (the lifecycle it named is in the pager)",
   "page:/nav:1/span:1": "this part in the breadcrumb, with no ordinal: the eyebrow says \"n of 3\"",
   "page:/header:1": "the header is Ark's hero",
   "page:/div:1": "the record beside its explanation: the story body",
   "page:/div:1/section:1": "the record card is the figure: its heading and mesh in Ark's frame, its label the caption, its fields in the Evidence view",
   "page:/div:1/section:1/dl:1": "the record's fields are Ark facts in the Evidence view",
   "page:/div:1/section:2": "the three views are the story's depth control",
   "page:/div:1/section:2/nav:1": "the view buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/section:2/nav:1/button:2": "\"Why this way\" is \"The idea\", the one label set on every story page",
   "page:/div:1/section:2/nav:1/button:3": "\"What it proves\" is \"Evidence\", the one label set on every story page",
   "page:/nav:2": "the footer is Ark's pager",
   "page:/div:1/section:1/dl:1/dd:1": "the value names the step that explains it (the old row lit up for that step)",
   "page:/div:1/section:1/dl:1/dd:2": "the value names the step that explains it (the old row lit up for that step)",
   "page:/div:1/section:1/dl:1/dd:3": "the value names the step that explains it (the old row lit up for that step)",
   "page:/div:1/section:1/dl:1/dd:4": "the value names the step that explains it (the old row lit up for that step)",
   "page:/div:1/section:1/dl:1/dd:5": "the value names the step that explains it (the old row lit up for that step)",
   "page:/div:1/section:2/ol:1/li:1/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:2/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:3/button:1": "the step's number is its marker now, its title and text one step item"
  },
  "retired": {}
 },
 "/how-deployment-works/work": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb follows the address: Home / Deploy a resolver / this part (the lifecycle it named is in the pager)",
   "page:/nav:1/span:1": "this part in the breadcrumb, with no ordinal: the eyebrow says \"n of 3\"",
   "page:/header:1": "the header is Ark's hero",
   "page:/div:1": "the record beside its explanation: the story body",
   "page:/div:1/section:1": "the record card is the figure: its heading and mesh in Ark's frame, its label the caption, its fields in the Evidence view",
   "page:/div:1/section:1/dl:1": "the record's fields are Ark facts in the Evidence view",
   "page:/div:1/section:2": "the three views are the story's depth control",
   "page:/div:1/section:2/nav:1": "the view buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/section:2/nav:1/button:2": "\"Why this way\" is \"The idea\", the one label set on every story page",
   "page:/div:1/section:2/nav:1/button:3": "\"What it proves\" is \"Evidence\", the one label set on every story page",
   "page:/nav:2": "the footer is Ark's pager",
   "page:/div:1/section:1/dl:1/dt:1": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:2": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:3": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:4": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:5": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:6": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dd:1": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:2": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:3": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:4": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:5": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:6": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:2/ol:1/li:1/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:2/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:3/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/nav:2/a:2": "\"Previous part\" is the previous part, by name, in the pager's related row"
  },
  "retired": {}
 },
 "/how-deployment-works/check": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb follows the address: Home / Deploy a resolver / this part (the lifecycle it named is in the pager)",
   "page:/nav:1/span:1": "this part in the breadcrumb, with no ordinal: the eyebrow says \"n of 3\"",
   "page:/header:1": "the header is Ark's hero",
   "page:/div:1": "the record beside its explanation: the story body",
   "page:/div:1/section:1": "the record card is the figure: its heading and mesh in Ark's frame, its label the caption, its fields in the Evidence view",
   "page:/div:1/section:1/dl:1": "the record's fields are Ark facts in the Evidence view",
   "page:/div:1/section:2": "the three views are the story's depth control",
   "page:/div:1/section:2/nav:1": "the view buttons are Ark tabs with the one label set: The idea / Step by step / Evidence",
   "page:/div:1/section:2/nav:1/button:2": "\"Why this way\" is \"The idea\", the one label set on every story page",
   "page:/div:1/section:2/nav:1/button:3": "\"What it proves\" is \"Evidence\", the one label set on every story page",
   "page:/nav:2": "the footer is Ark's pager",
   "page:/div:1/section:1/dl:1/dt:1": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:2": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:3": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:4": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dt:5": "the row's field name (a record key such as inputCid) moved from the term to the value, set in mono; the term is the plain meaning that was the value (a raw field name is never the primary label)",
   "page:/div:1/section:1/dl:1/dd:1": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:2": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:3": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:4": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:1/dl:1/dd:5": "the value is now the row's field name in mono; the step that explains the row (the old row lit up for it) is named in the term",
   "page:/div:1/section:2/ol:1/li:1/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:2/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/div:1/section:2/ol:1/li:3/button:1": "the step's number is its marker now, its title and text one step item",
   "page:/nav:2/a:2": "\"Previous part\" is the previous part, by name, in the pager's related row"
  },
  "retired": {
   "page:/nav:1/a:1": "the old breadcrumb's lifecycle link: this last part's pager leads \"Back to the lifecycle\""
  }
 },
 "/how-deployment-works": {
  "reshaped": {
   "page:/div:1/article:3/ol:1/li:2/span:1": "step 6 (Watch it) keeps its first sentence unchanged and now ends with the signature framing (W4-S13): the signature on a record is the result, and whether to rely on a resolver is decided from its grammar, capabilities and control before anyone sends it anything",
   "page:/header:1": "the header is Ark's hero; its hand-offs are the hero's actions",
   "page:/div:1": "the three cards are The idea's three stages (Ark steps)",
   "page:/div:2": "the hazard, the plan and the earlier path are the Evidence view's accordion, each closed until asked for as before",
   "page:/div:2/details:1": "the hazard is an Evidence accordion item",
   "page:/div:2/details:2": "the plan is an Evidence accordion item",
   "page:/div:2/nav:1": "the earlier agreement path is an Evidence accordion item, its chapters inside",
   "page:/div:1/article:1": "each card is a stage of The idea (Ark steps)",
   "page:/div:1/article:1/div:2": "the card's mesh, in the figure of the three meshes, named by its stage",
   "page:/div:1/article:1/ol:1/li:1": "the step is an accordion item of Step by step",
   "page:/div:1/article:1/ol:1/li:1/strong:1": "the step's title, numbered across the page",
   "page:/div:1/article:1/ol:1/li:2": "the step is an accordion item of Step by step",
   "page:/div:1/article:1/ol:1/li:2/strong:1": "the step's title, numbered across the page",
   "page:/div:1/article:2": "each card is a stage of The idea (Ark steps)",
   "page:/div:1/article:2/div:2": "the card's mesh, in the figure of the three meshes, named by its stage",
   "page:/div:1/article:2/ol:1/li:1": "the step is an accordion item of Step by step",
   "page:/div:1/article:2/ol:1/li:1/strong:1": "the step's title, numbered across the page",
   "page:/div:1/article:2/ol:1/li:2": "the step is an accordion item of Step by step",
   "page:/div:1/article:2/ol:1/li:2/strong:1": "the step's title, numbered across the page",
   "page:/div:1/article:3": "each card is a stage of The idea (Ark steps)",
   "page:/div:1/article:3/div:2": "the card's mesh, in the figure of the three meshes, named by its stage",
   "page:/div:1/article:3/ol:1/li:1": "the step is an accordion item of Step by step",
   "page:/div:1/article:3/ol:1/li:1/strong:1": "the step's title, numbered across the page",
   "page:/div:1/article:3/ol:1/li:2": "the step is an accordion item of Step by step",
   "page:/div:1/article:3/ol:1/li:2/strong:1": "the step's title, numbered across the page",
   "page:/footer:1/div:2": "the hand-off is the hero's action; a link that leaves the site now also says so to a screen reader (\"opens another site\")",
   "page:/footer:1/div:2/a:1": "the hand-off is the hero's action; a link that leaves the site now also says so to a screen reader (\"opens another site\")",
   "page:/footer:1/div:2/a:2": "the hand-off is the hero's action; a link that leaves the site now also says so to a screen reader (\"opens another site\")",
   "page:/footer:1/div:1": "the boundary block is Ark's callout: an icon before the same words"
  },
  "retired": {
   "page:/header:1/div:1": "a wrapper around the heading; the hero holds the heading itself",
   "page:/div:1/article:1/div:1": "the card's top row: its number is the stage's marker, its signal labels the stage's mesh",
   "page:/div:1/article:1/ol:1": "the card's two steps are items of the six-step accordion (Step by step), each keyed by the step it was",
   "page:/div:1/article:2/div:1": "the card's top row: its number is the stage's marker, its signal labels the stage's mesh",
   "page:/div:1/article:2/ol:1": "the card's two steps are items of the six-step accordion (Step by step), each keyed by the step it was",
   "page:/div:1/article:3/div:1": "the card's top row: its number is the stage's marker, its signal labels the stage's mesh",
   "page:/div:1/article:3/ol:1": "the card's two steps are items of the six-step accordion (Step by step), each keyed by the step it was"
  }
 },
 "/concept": {
  "reshaped": {
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model",
   "page:/div:1": "the question grid is the chosen group's tab panel (Ark card grid)"
  },
  "retired": {}
 }
};
