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
      "value": "A network name or directory row is not sufficient evidence. Verification records the command contract, network ID, source revision, participating processes or hosts, observation time, and current isolation boundary."
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
      "value": "Capture the exact flux-network and flux-miner revisions and versions. A command copied from another release is not evidence for the installed build."
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
      "value": "Preserve the create-or-select output, the chosen network ID, peer configuration, and whether the directory found an existing entry."
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
      "value": "Show presence discovery from outside the process that announced it. A local configuration value alone does not prove participation."
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
      "value": "Directory output is best-effort presence. It does not prove admission, trusted membership, a DAO roster, or authority."
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
      "value": "Every network result must state, beside it, what the network ID does not isolate today. The Networks page lists it."
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
      "value": "The network command contract is source-backed. A complete independent live create-and-participate artifact remains pending."
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
      "value": "Named networks remain evidence pending until their identifiers, sources, observation dates, and artifacts are registered. The evidence registry tracks this as CAP-003."
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
