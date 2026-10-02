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
      "value": "Choose the miner-presence namespace you intend to serve."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "These commands use the current flux-network CLI contract. A named network partitions miner presence only; it does not isolate accounts, identities, DAOs, arbitrary records, or treasuries, and it is not a security boundary."
    },
    "BACK": {
      "label": "Link back (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "RUN FLUX FROM SOURCE"
    }
  }
});
