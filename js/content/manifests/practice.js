/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "practice",
  "title": "Theory: Practice",
  "route": "/concept/practice",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "about",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / 03"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Authority appears, then dissolves."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "No standing validator set. A small committee is derived for one object, certifies it, and disappears."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEE A CELL FORM"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Derived per object, not assigned forever."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Derived deterministically from the object's CID, its next sequence, the registry root, and the policy CID. Never a fixed roster."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "One job, then it's gone."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Verifies one transition, publishes threshold evidence, dissolves. It can't certify unrelated work."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Separate again from mesh-operations governance."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "The seven-operator ceremony that governs Flux Protocol itself is a separate authority set. See Governance, Two Ways."
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
