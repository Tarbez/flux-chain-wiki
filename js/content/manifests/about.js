/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "about",
  "title": "About",
  "route": "/about",
  "group": "page",
  "meta": {
    "next": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "ABOUT FLUX CHAIN"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "What Flux Chain actually is."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Flux Chain is a shared, content-addressed table: records referenced by a dense symbol-table encoding, fetched by CID, resolved byte-identical, and held by a five-node quorum. This site is the spec, published the same way everything else on it is."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Compact, not spelled out."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Flux Compact (.compact) replaces a word with a reference into a shared symbol table instead of writing it out — no hex, no base64. See the spec's Compact page for the encoding and the measured numbers."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Addressed, not guessed at."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Every record's CID hashes its JSON serialization. Fetch a CID and the same JSON resolves, exactly as hashed, for every reader — never a different answer for a different observer."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Held by a quorum, not one server."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Five independent flx-* nodes hold the same ledger, queried through /explorer/v1. There is no single writer to trust and no raw reads to guess at."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "EXPLORE THE FLUX SPEC"
    }
  }
});
