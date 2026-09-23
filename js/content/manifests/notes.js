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
      "value": "THE FLUX SPEC / NOTES"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Start with the notes."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "The notes go one level deeper than the spec: worked examples, the numbers behind a claim, and what changes if you push on it."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "START WITH THE NOTES"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "One claim, worked through."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Each note takes one line from the spec and walks through what it actually means in practice."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Tied to the lab."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Notes point back to the interactive lab, so an idea can be felt, not only read about."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Read what fits your question."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Pick the note that matches what you are curious about and begin there."
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
