/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "studio",
  "title": "Theory: Publish",
  "route": "/concept/studio",
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
      "value": "FLUX PROTOCOL / CREATE"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Register. Join. Govern."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Creating a network is a real command today — it partitions presence, not accounts or authority. Not yet a security boundary."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEE THE NETWORK DIRECTORY"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Register."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "network create returns a networkId for a new, independently addressable network. Shared code, so it can't drift between apps."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Join."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Point an app or miner at an existing networkId to join it instead — same primitive, other direction."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Govern."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A network's own DAO governs it — its own roster, its own thresholds. Mesh-operations governance never substitutes for it."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "ABOUT FLUX PROTOCOL"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
