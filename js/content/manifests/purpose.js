/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "purpose",
  "title": "Networks",
  "route": "/concept/purpose",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "deploy",
    "docs": "docs/operators/networks.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / NETWORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "What does a Flux network isolate today?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A named network currently isolates miner-presence discovery. It does not isolate accounts, identities, DAOs, arbitrary records, or treasuries, and it is not an authoritative membership list or security boundary."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "UNDERSTAND NETWORK SCOPE"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "The current boundary is presence."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Miners configured with the same network ID announce into the same presence namespace. That is useful coordination, but it is not admission, authorization, or proof of trust."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Creation and selection use one directory primitive."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "flux-network network create <name> returns a new ID or selects an existing matching ID. Starting a miner with that ID participates in its presence namespace."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Directory results are best-effort discovery."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "A network with no listed miners may still exist but be idle or undiscovered. The directory is not an authoritative registry of members."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Governance is a separate decision."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "Selecting a network ID does not create a DAO, admit an identity, or grant authority. Those claims require their own policy and evidence."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Named examples still need evidence."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "A public example needs a network identifier, source or manifest location, observation date, and inspectable artifact before this site describes it as active."
    },
    "STATUS.TITLE": {
      "label": "Status heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Status / Partial"
    },
    "STATUS.TEXT": {
      "label": "Status text",
      "kind": "text",
      "section": "Evidence",
      "value": "The create/list command contract and miner-presence namespace are implemented in source. A complete independent live run is not registered in this audit."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Current limitation"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "Network IDs do not currently scope accounts, identities, DAOs, arbitrary records, or treasuries. Do not use them as a security boundary."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE NETWORK OPERATOR GUIDE"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "CREATE OR JOIN A NETWORK"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "OPERATING MODEL"
    }
  }
});
