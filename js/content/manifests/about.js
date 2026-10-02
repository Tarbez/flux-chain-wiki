/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "about",
  "title": "Protocol overview",
  "route": "/about",
  "group": "page",
  "meta": {
    "next": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / OVERVIEW"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Shared infrastructure for independently governed networks."
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Flux separates network discovery, signed agreement execution, and governance so one network can define its own rules without becoming the shared substrate. DAO Chain is one network on Flux Protocol, not Flux Protocol itself."
    },
    "CONTEXT": {
      "label": "Supporting explanation disclosure",
      "kind": "line",
      "section": "Page",
      "value": "Context / inspect how Flux fits together"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Directory: address a network."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "The directory creates or discovers a named network ID. Today that ID partitions miner presence only; it does not isolate accounts, identities, DAOs, arbitrary records, or treasuries, and it is not a security boundary."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Agreement fabric: close a verifiable path."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Work moves from intent to offer, agreement, fulfillment, and receipt. Each stage preserves what was requested, accepted, produced, and checked without requiring a global block order."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Governance: identify who may change what."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Authority belongs to an identified scope and threshold. Mesh-operations policy is separate from a network DAO, and neither silently gains authority over the other."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "What the source establishes."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "The miner daemon, network CLI, resolver model, and agreement lifecycle are implemented in source. Full automated provider activation remains partial; public repositories, packaged downloads, independent production activation, and benchmark artifacts remain unverified in this audit."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "How to verify it."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "Start the miner from a trusted checkout, record its status response, and inspect agreement evidence under a named source revision. Treat a successful local start as local evidence, not as proof of production readiness."
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "SEE HOW FLUX WORKS"
    },
    "STATUS": {
      "label": "Status documentation link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE CURRENT STATUS"
    }
  }
});
