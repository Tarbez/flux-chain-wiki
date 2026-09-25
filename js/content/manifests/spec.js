/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "spec",
  "title": "Theory: Spec",
  "route": "/concept/spec",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "about",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / BENCHMARKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Measured, release by release."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Every number names its release and what it was tested against. No flattening into one clean figure."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "READ THE FULL BREAKDOWN"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Best measured sustained throughput: 65.2/s."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Release 2.0.4: 65.2/s concurrent, five-validator mesh (500 ops, concurrency 100). No valid concurrent Solana comparison exists — its own Devnet attempts hit rate limits every time."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "vs. Solana: sequential only, three different releases."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Every multiplier compares a Flux sequential run to Solana Devnet's own sequential baseline (0.134/s): flxd-chain 5.85x, agreement fabric 7.34x early build, 20.46x at 1.5.1, 18.81x at 2.0.4 — three releases, not one number said three ways."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "The most recent release is still soaking."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Release 2.1.0's 24-hour soak had started, not finished, at last measurement — early batches ran near 2.8/s. A smoke sample, not a ceiling."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Sequential and concurrent are separate claims."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "The page keeps sequential baselines, concurrent mesh runs, and failed comparison attempts separate because combining them would make a cleaner but less truthful story."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Benchmarks are audit notes, not slogans."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "Each number should answer: which release, which mode, how many validators, how much concurrency, and what baseline. If any of those are missing, the claim is incomplete."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "ABOUT THE STUDIO"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
