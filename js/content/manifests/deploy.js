/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deploy",
  "title": "Deploy a network",
  "route": "/deploy",
  "group": "page",
  "meta": {
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / DEPLOY"
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
      "value": "Real commands, against a live flux-miner daemon. Today network creation partitions presence only — not accounts, identities, or DAOs. Not yet a security boundary."
    },
    "BACK": {
      "label": "Link back (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
