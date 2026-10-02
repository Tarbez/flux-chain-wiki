/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "depth",
  "title": "Agreement lifecycle",
  "route": "/concept/depth",
  "group": "theory",
  "meta": {
    "placement": "row",
    "next": "lifecycle",
    "docs": "docs/protocol/agreements.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / AGREEMENTS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "How does one agreement become verifiable?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "One signed trail records what was requested, offered, accepted, produced, and checked. Each stage references the relevant prior record so an auditor can inspect the path without relying on a global block order."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "FOLLOW ONE AGREEMENT"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Intent states the need."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "The requester signs a specific desired outcome. The record makes the request addressable, but no provider is committed yet."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Offer answers that exact intent."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "A provider proposes terms and references the intent CID. The offer is inspectable, but it is not an agreement until the terms are accepted."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Agreement records the accepted match."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "The participating peers sign the accepted terms. Unrelated work does not wait behind this agreement in one global transaction lane."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Fulfillment shows the work."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "The provider links result evidence to the agreement. Recording fulfillment does not prove that every downstream system has settled."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Receipt records the verification outcome."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "The verifying participant closes the trail under identified checker and authority rules. A receipt is evidence of that decision, not universal truth or legal finality."
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
      "value": "The intent-to-receipt lifecycle and agreement-fabric inspection contract are implemented in source. A complete public production run is not registered here."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "What this does not establish"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "The lifecycle does not by itself prove automated admission, economic settlement, production activation, or the semantic truth of a signed claim."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE AGREEMENT GUIDE"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "FOLLOW THE FIVE STAGES"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "OPERATING MODEL"
    }
  }
});
