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
   "id:purpose-title": "the question names the site, DEFXN, not \"Flux\" (first-visit audit 2026-10-22, P1)",
   "page:/div:1/div:1/div:1/p:1": "the short answer says first what a network is for; its \"does not\" list is the limit, in Evidence (first-visit audit 2026-10-22, P1)",
   "page:/nav:3": "the hero action is the next question of the sequence (first-visit audit 2026-10-22, P1: the setup link left before the page said what it is for); the old action is a quiet link in Evidence",
   "page:/nav:3/a:1": "the hero action is the next question of the sequence (first-visit audit 2026-10-22, P1: the setup link left before the page said what it is for); the old action is a quiet link in Evidence",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "page:/nav:1/span:1": "the breadcrumb names the sheet \"Checkable agreements\": \"Agreement lifecycle\" is /lifecycle's name (first-visit audit 2026-10-22, P1)",
   "id:depth-title": "the sheet is \"Checkable agreements\", its question \"How does an agreement become checkable?\": \"Agreement lifecycle\" is /lifecycle's name (first-visit audit 2026-10-22, P1)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "id:practice-title": "the question in problem words, \"Who can approve a change?\" (first-visit audit 2026-10-22, P1)",
   "page:/div:1/div:1/div:1/p:1": "the short answer in plain words; \"authority cell\" stays in Step by step (first-visit audit 2026-10-22, P1)",
   "page:/nav:3": "the hero action says where it goes, \"See who can change what\" (first-visit audit 2026-10-22, P1: \"Compare governance rosters\" was a fifth undefined term)",
   "page:/nav:3/a:1": "the hero action says where it goes, \"See who can change what\" (first-visit audit 2026-10-22, P1)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "page:/nav:3": "the hero action is the next question; \"Compare governance rosters\" was /concept/practice's action too (first-visit audit 2026-10-22, P2); /dao is a quiet link in Evidence",
   "page:/nav:3/a:1": "the hero action is the next question (first-visit audit 2026-10-22, P2)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "page:/div:1/div:1/aside:1/strong:1": "the status is titled \"Status / Partial\" like its siblings; CAP-003 moved to the limit in Evidence (first-visit audit 2026-10-22, P2)",
   "page:/div:1/div:1/aside:1": "the same status callout, titled \"Status / Partial\" (first-visit audit 2026-10-22, P2)",
   "page:/nav:3": "the hero action is the next question of the sequence (first-visit audit 2026-10-22, P1: the setup link left before the page said what it is for); the old action is a quiet link in Evidence",
   "page:/nav:3/a:1": "the hero action is the next question of the sequence (first-visit audit 2026-10-22, P1: the setup link left before the page said what it is for); the old action is a quiet link in Evidence",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "page:/div:1/div:1/div:1/p:1": "the short answer leads with three verified figures, each with its machine or fleet and date (first-visit audit 2026-10-22, P1)",
   "page:/div:1/div:1/aside:1/p:1": "the status says six records are verified and where their numbers are; the BENCH codes are in Step by step and Evidence (first-visit audit 2026-10-22, P1)",
   "page:/div:1/div:1/aside:1": "the same status callout, without the list of BENCH codes (first-visit audit 2026-10-22, P1)",
   "page:/nav:3": "the hero action answers the page's question: \"See the measured results\" (/stats), not \"Run DEFXN from source\", which is a link in Evidence (first-visit audit 2026-10-22, P1)",
   "page:/nav:3/a:1": "the hero action is \"See the measured results\" (first-visit audit 2026-10-22, P1)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept)",
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
   "page:/nav:3": "the hero action is the product, \"Open DAO\"; the notes link (\"Separate approval from activation\") leads the ways on in The idea (first-visit audit 2026-10-22, P1)",
   "page:/nav:3/a:1": "the hero action is \"Open DAO\"; the notes link is the first of the ways on in The idea (first-visit audit 2026-10-22, P1)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model / this page (Overview since 2026-10-22, the same trail as /concept); the page is \"How DEFXN is governed\" (the owner's call 2026-10-22)",
   "page:/nav:1/span:1": "the page's name in the trail: \"Governance\" reads \"How DEFXN is governed\" (the owner's call 2026-10-22: \"Governance\" was also /resolutions/governance and a /chain tab; \"Network DAO\" names the DAO product only). The eyebrow \"DEFXN / GOVERNANCE\" that repeated it is gone (first-visit audit 2026-10-22, P2); it came after the census, so no old key carried it",
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
   "page:/div:1/figure:1/strong:1": "the count is \"5\" with its unit beside it (\"records\"): the bare \"05\" said nothing (first-visit audit 2026-10-22, P1)",
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
   "page:/div:1/div:1/h1:1": "the stage heading names the state its record makes true, not a command: the page is read-only and the command sent a visitor looking for a field (first-visit audit 2026-10-22, P2)",
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
   "page:/div:1/div:1/h1:1": "the stage heading names the state its record makes true, not a command: the page is read-only and the command sent a visitor looking for a field (first-visit audit 2026-10-22, P2)",
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
   "page:/div:1/div:1/h1:1": "the stage heading names the state its record makes true, not a command: the page is read-only and the command sent a visitor looking for a field (first-visit audit 2026-10-22, P2)",
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
   "page:/div:1/div:1/h1:1": "the stage heading names the state its record makes true, not a command: the page is read-only and the command sent a visitor looking for a field (first-visit audit 2026-10-22, P2)",
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
   "page:/div:1/div:1/h1:1": "the stage heading names the state its record makes true, not a command: the page is read-only and the command sent a visitor looking for a field (first-visit audit 2026-10-22, P2)",
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
   "page:/div:1/section:2/nav:1/button:1": "the chapter's \"How it works\" view is the \"Step by step\" tab since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Agreement lifecycle / this part (the parent it had before the conversion; from 2026-10-19 to the first-visit audit 2026-10-22 it read \"Deploy a resolver\", which these request/offer/agreement parts are not)",
   "page:/nav:1/span:1": "this part in the breadcrumb, with no ordinal: the eyebrow says \"n of 3\"",
   "id:how-ask-title": "\"Tell them what you need.\" reads \"Tell a provider what you need.\": \"them\" came before any provider was introduced (first-visit audit 2026-10-22)",
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
   "page:/div:1/section:2/nav:1/button:1": "the chapter's \"How it works\" view is the \"Step by step\" tab since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Agreement lifecycle / this part (the parent it had before the conversion; from 2026-10-19 to the first-visit audit 2026-10-22 it read \"Deploy a resolver\", which these request/offer/agreement parts are not)",
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
   "page:/div:1/section:2/nav:1/button:1": "the chapter's \"How it works\" view is the \"Step by step\" tab since 2026-10-22 (first-visit audit, P1): the header's \"How it works\" opens /how-deployment-works, so one name opened two things",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Agreement lifecycle / this part (the parent it had before the conversion; from 2026-10-19 to the first-visit audit 2026-10-22 it read \"Deploy a resolver\", which these request/offer/agreement parts are not)",
   "page:/nav:1/span:1": "this part in the breadcrumb, with no ordinal: the eyebrow says \"n of 3\"",
   "page:/header:1/p:1": "the same intro, reworded: it names the checker and the approvers in its opening, where the approvers first appeared two cards later (first-visit audit 2026-10-22)",
   "page:/div:1/section:2/div:1": "the same three reasons; the first is reworded (see its paragraph)",
   "page:/div:1/section:2/div:1/article:1": "the same reason, \"Trust is decided before\"; its paragraph is reworded (see it)",
   "page:/div:1/section:2/div:1/article:1/p:1": "the paragraph that repeated /what-is-a-resolver's trust boundary word for word now says what this step decides: a signature proves who submitted a result, the agreement judges it (first-visit audit 2026-10-22, one definition of a resolver)",
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
  "retired": {}
 },
 "/how-deployment-works": {
  "reshaped": {
   "page:/div:1/article:3/ol:1/li:2/span:1": "step 6 (Watch it) keeps its first sentence unchanged and now ends with the signature framing (W4-S13): the signature on a record is the result, and whether to rely on a resolver is decided from its grammar, capabilities and control before anyone sends it anything",
   "page:/header:1/p:1": "the intro, reworded to say what deploying is (\"in three stages: write its grammar, sign one launch record, and have a provider serve it\"); it re-defined a resolver, a third wording of /what-is-a-resolver's (first-visit audit 2026-10-22)",
   "id:deployment-title": "the heading is the page's one name, \"Deploy a resolver\", as the header, the breadcrumb and the links to it say (\"From a grammar to a chain.\" was a fifth name: first-visit audit 2026-10-22)",
   "page:/div:2/nav:1/strong:1": "\"The earlier agreement path\" reads \"Hire a provider: the earlier path\": it said the path was old, not what it was (first-visit audit 2026-10-22)",
   "page:/div:2/nav:1/p:1": "the same sentence, reworded: \"how a client hired a provider under the earlier agreement path\"",
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
   "page:/footer:1/div:2": "the hero's actions row: since the first-visit audit 2026-10-22 it holds the one action, Open Deploy; Explore and the registry are Evidence's \"What is launched\" links",
   "page:/footer:1/div:2/a:1": "the hand-off is the hero's action; a link that leaves the site now also says so to a screen reader (\"opens another site\")",
   "page:/footer:1/div:2/a:2": "the Explore hand-off is a link in Evidence (\"What is launched\"), out of the hero since the first-visit audit 2026-10-22; a link that leaves the site says so to a screen reader (\"opens another site\")",
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
   "page:/nav:2": "the question-group tabs: \"Inspect evidence & activation\" is \"Evidence & activation\" (first-visit audit 2026-10-22, P2)",
   "page:/div:1/article:1": "the card reads its sheet's question, reworded in its manifest: \"What does a DEFXN network do today?\" (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:1/a:1": "the card title is its sheet's question, reworded in its manifest (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:2": "the card reads its sheet's question and name, reworded: \"How does an agreement become checkable?\" / \"Checkable agreements\" (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:2/a:1": "the card title is its sheet's question, reworded in its manifest (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:2/span:2": "the card names its sheet \"Checkable agreements\": \"Agreement lifecycle\" is /lifecycle's name (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:3": "the card reads its sheet's question, reworded: \"Who can approve a change?\" (first-visit audit 2026-10-22, P1)",
   "page:/div:1/article:3/a:1": "the card title is its sheet's question, reworded in its manifest (first-visit audit 2026-10-22, P1)",
   "page:/nav:1": "the breadcrumb is Ark's: Home / Overview / Operating model",
   "page:/div:1": "the question grid is the chosen group's tab panel (Ark card grid)",
   "page:/nav:2/button:2": "\"Inspect evidence & activation\" is \"Evidence & activation\" since 2026-10-22 (first-visit audit, P2): the long label was cut off at 390px"
  },
  "retired": {}
 }
};
