/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "dao",
  "title": "Governance",
  "route": "/dao",
  "group": "page",
  "meta": {
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
      "value": "Two rosters. Neither substitutes for the other."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Mesh operations and a network's DAO are separate signer sets, separate thresholds. Two rosters, named plainly, never mixed."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Mesh operations: seven operators, asymmetric thresholds."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "4-of-7 ordinary admission. 5-of-7 economic or runtime changes. 3-of-7 to pause, 5-of-7 to unpause. Governs the substrate, not any one network — and stays closed until separate activation gates open it."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Each network: its own DAO, its own threshold."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Signs its own decisions under its own roster — Ed25519 + ML-DSA-87, N-of-M per network. DAO Chain and CR3TV are registered today. Execution stops at a receipt, not treasury settlement."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Neither roster governs the other."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Mesh operations has no say in any network's decisions. No DAO has say over mesh operations. \"Flux governance\" alone doesn't mean either one."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Activation is separate from approval."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A signed ceremony records consent, but execution waits for the activation path that applies to that change. The signature is evidence; it is not automatically a live switch."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Governance is intentionally plural."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "The system should let many networks govern themselves without inheriting the substrate's operator ceremony. That distinction is the point, not a naming detail."
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
