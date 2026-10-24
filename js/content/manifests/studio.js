/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "studio",
  "title": "Network evidence",
  "route": "/concept/studio",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "concept/spec",
    "docs": "docs/evidence/registry.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / NETWORK EVIDENCE"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "How do you verify a named network?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "A network name or a directory row is not enough evidence. To verify a network, record the command and its result, the network ID, the source revision, which processes or hosts took part, when you looked, and what the network ID does not separate today."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "INSPECT NETWORK EVIDENCE"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Record the source revision."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Record the exact flux-network and flux-miner revisions and versions. A command copied from another release is not evidence for the build you installed."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Record the network ID and command result."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Keep the output of create-or-select, the network ID you chose, the peer settings, and whether the directory already had that entry."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Observe from another process or host."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Show a miner being found from outside the process that announced it. A setting on your own machine does not prove participation."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Keep discovery and authority separate."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "Directory output shows who has announced themselves. It does not prove admission, trusted membership, a DAO roster or authority."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Publish the limitation beside the result."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "Print the limit next to every network result: what the network ID does not separate today. The Networks page lists it."
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
      "value": "The network commands are built in source. A complete independent run that creates a network and joins it is still pending."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Reference deployments"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "Named networks stay unverified until their IDs, sources, observation dates and artifacts are registered. The evidence registry tracks this as CAP-003."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "OPEN THE EVIDENCE REGISTRY"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "NEXT QUESTION: WHAT IS MEASURED"
    },
    "LIMITS": {
      "label": "Network limits link (in Evidence)",
      "kind": "line",
      "section": "Links",
      "value": "WHAT A NETWORK ID DOES NOT ISOLATE"
    },
    "LIMITS.HREF": {
      "label": "Network limits link (in Evidence): where it goes",
      "kind": "link",
      "section": "Links",
      "value": "route:concept/purpose"
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
