/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "practice",
  "title": "Authority",
  "route": "/concept/practice",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "dao",
    "docs": "docs/protocol/authority.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / AUTHORITY"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Who can approve this transition?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "The applicable policy derives an authority cell for one object and transition. The cell may certify only that bounded action, publishes threshold evidence, and then dissolves."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "UNDERSTAND BOUNDED AUTHORITY"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "1. Derive the eligible cell."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "The object's CID, next sequence number, authority registry root, and active policy CID bind the selection to this transition."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "2. Apply the policy threshold."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "The active policy states how many eligible approvals are required. A public claim must identify that policy and show the collected threshold evidence."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "3. Publish the certificate."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "The resulting evidence identifies the object, transition, policy, eligible cell, and approvals so another participant can inspect the decision."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "4. Dissolve the cell."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "After the bounded decision, the cell has no continuing mandate. A later transition derives authority again from its own inputs."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "5. Enforce the non-authority boundary."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "A certificate for one CID sequence cannot authorize another object, network, policy, or transition. Presence in the mesh does not grant authority."
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
      "value": "Authority policy structure and threshold concepts are documented in source. Independent production activation remains unverified."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "What the cell cannot authorize"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "A cell cannot reuse its certificate for another transition, replace mesh-operations governance, govern a network DAO, or turn a signature into semantic truth."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE AUTHORITY GUIDE"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "COMPARE GOVERNANCE ROSTERS"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
