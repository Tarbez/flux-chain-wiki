/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "How Flux works",
  "route": "/how-deployment-works",
  "group": "page",
  "meta": {
    "next": "download",
    "back": "references",
    "primary": true
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / HOW IT WORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "From a network ID to a verifiable receipt."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "1. Register or select a named network ID. Today this creates a miner-presence namespace, not a complete security boundary."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "2. Publish or select the addressed resolver logic that defines the input and claim. Publication alone does not establish active execution capacity."
    },
    "BODY3": {
      "label": "Third paragraph",
      "kind": "text",
      "section": "Page",
      "value": "3. Open an intent describing the work and constraints. A provider can answer with an offer, but no agreement exists until terms are accepted."
    },
    "BODY4": {
      "label": "Fourth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "4. Accept the offer, execute the resolver, and submit fulfillment evidence through the signed agreement path."
    },
    "BODY5": {
      "label": "Fifth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "5. Verify the receipt under the identified checker and authority rules. A receipt records that decision; it is not universal truth or proof of production readiness."
    },
    "NEXT": {
      "label": "Main button",
      "kind": "line",
      "section": "Links",
      "value": "Run Flux from source"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "Reference resolvers"
    }
  }
});
