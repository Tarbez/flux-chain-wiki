/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deploy",
  "title": "Create or join a network",
  "route": "/deploy",
  "group": "page",
  "meta": {
    "back": "download"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "OPERATE FLUX / NAMED NETWORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Choose a network for miner presence."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Named networks partition miner presence only. They do not isolate accounts, identities, DAOs, records, or treasuries, and are not a security boundary."
    },
    "BACK": {
      "label": "Link back (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "RUN FLUX FROM SOURCE"
    }
  }
});
