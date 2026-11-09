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
      "value": "DEFXN / ONE CHAIN PER SIGNER"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Each key keeps its own chain."
    },
    "LEDE": {
      "label": "Introduction",
      "kind": "text",
      "section": "Page",
      "value": "What it is: every FXN ID signs records onto its own list, and every resolver runs its own chain. One base chain lists which resolvers and capabilities exist. What you do: sign a record. What you get back: a keeper's signed receipt, which makes it final. No record waits on another key's list. Status: built, not live. The new devnet is not deployed."
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
