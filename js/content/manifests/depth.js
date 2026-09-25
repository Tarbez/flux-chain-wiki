/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "depth",
  "title": "Theory: Depth",
  "route": "/concept/depth",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "proximity",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / 01"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "The agreement lifecycle."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Every agreement moves through five signed stages, each pointing to the last by CID: INTENT, OFFER, AGREEMENT, FULFILLMENT, RECEIPT."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEE THE LIFECYCLE RUN"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Five stages, each a signed manifest."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "INTENT states what a peer wants. OFFER answers it. AGREEMENT is the signed match. FULFILLMENT is the work. RECEIPT closes it, auditable end to end."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "No global order between unrelated agreements."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "A vote, a handoff, a resolver job — all close in parallel. Each agreement carries its own evidence trail, never serialized behind one block stream."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "This replaced a real block/validator chain."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A conventional chain (flxd-chain) came first, got measured against this lifecycle on the same mesh, and lost. See Benchmarks for the numbers."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Evidence is local to the agreement."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A receipt does not ask a global chain to remember everything. It points back through the signed trail so auditors can replay the exact path that mattered to that agreement."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Failure is scoped too."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "If one agreement stalls, unrelated agreements can still complete. The model avoids making every participant wait behind a single shared transaction lane."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "SEE IT WORKING"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
