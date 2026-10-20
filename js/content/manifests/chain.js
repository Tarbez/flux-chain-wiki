/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "chain",
  "title": "Every identity, its own chain",
  "route": "/chain",
  "group": "page",
  "meta": {
    "back": "zero",
    "diagrams": [
      {
        "id": "swap-signed-resolution",
        "place": "chain: the Swaps case, in place of the payload-read illustration",
        "caption": "Illustration · relationships, not live state",
        "flow": [
          "Two intents enter",
          "One signer resolves the batch",
          "One signed result goes to peers"
        ],
        "refusal": {
          "from": "A second node",
          "tag": "resolved by <signer>"
        }
      }
    ]
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
      "value": "Every identity signs its own chain. Every resolver runs its own chain. One base chain records which resolvers and capabilities exist. No record waits on anyone else’s. Watch one record join, from signature to the resolver that gives it meaning."
    },
    "NEXT": {
      "label": "Next-step link",
      "kind": "line",
      "section": "Page",
      "value": "See what each resolver reads from the chain"
    },
    "NEXT.HREF": {
      "label": "Next-step link target",
      "kind": "link",
      "section": "Page",
      "value": "route:resolvers"
    },
    "SOURCE.LINK": {
      "label": "Where resolver chains come from (link)",
      "kind": "line",
      "section": "Page",
      "value": "Where do resolver chains come from?"
    },
    "SOURCE.HREF": {
      "label": "Where resolver chains come from (link target)",
      "kind": "link",
      "section": "Page",
      "value": "route:resolver"
    }
  }
});
