/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "notes",
  "title": "Theory: Notes",
  "route": "/concept/notes",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "learnings",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / GOVERNANCE"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Governance, two ways."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Mesh-operations governance and any network's DAO are separate signer sets, separate thresholds. Neither quorum acts for the other."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEE THE TWO ROSTERS"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Mesh-operations: seven operators."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Seven operators. 4-of-7 ordinary admission, 5-of-7 economic or runtime changes, 3-of-7 to pause, 5-of-7 to unpause. Governs the substrate, not any one network."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Per-network: each DAO governs itself."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "A network's own DAO signs its own decisions, its own threshold. DAO Chain and CR3TV are two examples — neither governs the other."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "An approved ceremony is not activation."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A fully signed result stays closed until separate activation gates open it. A signature is evidence, not a live switch."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "READ THE NOTES"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
