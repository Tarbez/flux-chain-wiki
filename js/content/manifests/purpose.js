/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "purpose",
  "title": "Networks",
  "route": "/concept/purpose",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "concept/depth",
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
      "value": "What does a DEFXN network do today?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A named network is a name that miners can start with. Miners that start with the same name announce themselves in the same place, so they can find each other. That is all a network separates today. What it does not separate is listed under Evidence."
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
      "value": "Miners started with the same network ID announce themselves in the same place. This helps them find each other. It does not admit anyone, give anyone authority, or show that a miner can be trusted."
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
      "value": "The command flux-network network create <name> returns a new network ID, or the ID of an existing network with that name. A miner started with that ID joins that network’s place."
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
      "value": "A network that lists no miners may still exist. Its miners may be idle or not yet found. The list is not a complete record of members."
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
      "value": "Choosing a network ID does not create a DAO (a group of signers who vote), admit an identity, or give anyone authority. Each of those needs its own policy and evidence."
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
      "value": "This site calls a network active only when it has a network ID, a source or manifest location, an observation date and an artifact you can inspect."
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
      "value": "The create and list commands, and the shared place where miners announce themselves, are built in source. No complete independent live run is registered in this audit."
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
      "value": "A named network currently isolates only miner-presence discovery, which is how miners find each other. A network ID does not scope accounts, identities, DAOs, records or treasuries. It is not an authoritative membership list or security boundary. Do not use it as one."
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
      "value": "NEXT QUESTION: HOW AN AGREEMENT IS CHECKED"
    },
    "SETUP": {
      "label": "Setup link (in Evidence)",
      "kind": "line",
      "section": "Links",
      "value": "CREATE OR JOIN A NETWORK"
    },
    "SETUP.HREF": {
      "label": "Setup link (in Evidence): where it goes",
      "kind": "link",
      "section": "Links",
      "value": "route:deploy"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "OPERATING MODEL"
    }
  }
});
