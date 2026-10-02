/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "dao",
  "title": "Governance",
  "route": "/dao",
  "group": "page",
  "meta": {
    "back": "concept",
    "docs": "docs/protocol/governance.md"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / GOVERNANCE"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "Who can change what?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Mesh operations governs the shared Flux substrate. A network DAO governs only its own network. Their rosters, thresholds, activation rules, and evidence are separate; neither quorum acts for the other."
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Mesh operations / scope"
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "Source policy describes seven operators: 4-of-7 for ordinary admission, 5-of-7 for economic or runtime changes, 3-of-7 to pause, and 5-of-7 to unpause. This governs the substrate, not a network's decisions."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Network DAO / scope"
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Each network defines its own roster, threshold, governed objects, and activation rules. This audit did not establish a public live example with complete evidence, so named deployments remain unverified."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Explicit non-authority"
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Mesh operations cannot decide a network's internal proposal. A network DAO cannot change the shared substrate. Saying only \"Flux governance\" is not precise enough to identify authority."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Approval and activation are separate."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "A signed decision records consent under a policy. The change becomes active only after its separate activation conditions and evidence are satisfied."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Every claim needs a complete record."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "A governance record should identify the proposal, policy revision, roster, required threshold, approvals, activation condition, activation evidence, and observation time."
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
      "value": "The substrate policy structure and threshold rules exist in source. A public governance interface and independent production activation are not established by this audit."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Current evidence boundary"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "Policy text is not activation evidence. Named network DAOs require their own inspectable roster, decision, and activation records."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE GOVERNANCE GUIDE"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "THE SPEC"
    }
  }
});
