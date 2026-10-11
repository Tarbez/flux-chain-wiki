/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "chain",
  "title": "Every identity, its own chain",
  "route": "/chain",
  "group": "page",
  "meta": {
    "back": "zero"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / THE CHAIN OF CHAINS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Not one chain. A chain of chains."
    },
    "LEDE": {
      "label": "Introduction",
      "kind": "text",
      "section": "Page",
      "value": "Every identity signs its own append-only chain. No record waits on anyone else's. Watch one record join, from signature to the resolver that gives it meaning."
    },
    "NEXT": {
      "label": "Next-step link",
      "kind": "line",
      "section": "Page",
      "value": "See what each resolver reads from the chain"
    }
  }
});
