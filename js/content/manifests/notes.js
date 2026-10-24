/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "notes",
  "title": "Activation",
  "route": "/concept/notes",
  "group": "theory",
  "meta": {
    "placement": "rail",
    "next": "concept/studio",
    "docs": "docs/protocol/governance.md",
    "back": "concept"
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "FLUX PROTOCOL / ACTIVATION"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "When does an approved change become active?"
    },
    "DECK": {
      "label": "Intro",
      "kind": "text",
      "section": "Page",
      "value": "Approval records who agreed, under a policy. Activation is a separate step: it applies the approved change after its readiness and safety checks pass."
    },
    "CTA": {
      "label": "Link on the theory page",
      "kind": "line",
      "section": "Links",
      "value": "SEPARATE APPROVAL FROM ACTIVATION"
    },
    "POINT1.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 1",
      "value": "Approval answers who consented."
    },
    "POINT1.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 1",
      "value": "The decision record names the policy, the eligible people, the number of approvals needed and the approvals collected. It does not show that the change is running."
    },
    "POINT2.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 2",
      "value": "Activation answers what was applied."
    },
    "POINT2.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 2",
      "value": "Activation evidence must name the approved action, the target environment, the revision applied, who or what applied it, and when it was observed."
    },
    "POINT3.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 3",
      "value": "Readiness gates remain independent."
    },
    "POINT3.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 3",
      "value": "Three checks are separate from the approval signatures: readiness on independent hosts, hostile testing, and signed soak evidence (a long run under load). Do not infer one from the others."
    },
    "POINT4.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 4",
      "value": "Pause and unpause are intentionally asymmetric."
    },
    "POINT4.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 4",
      "value": "In the source policy, pausing is easier than unpausing. That lowers the risk of recovery mistakes. It does not show that any production system is active."
    },
    "POINT5.TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Point 5",
      "value": "Missing evidence stays unverified."
    },
    "POINT5.TEXT": {
      "label": "Text",
      "kind": "text",
      "section": "Point 5",
      "value": "If the revision, environment, observation time or readiness evidence is missing, report activation as Unverified. Do not treat signatures as proof that a change is live."
    },
    "STATUS.TITLE": {
      "label": "Status heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Status / Unverified"
    },
    "STATUS.TEXT": {
      "label": "Status text",
      "kind": "text",
      "section": "Evidence",
      "value": "Independent production activation is not established by the evidence registered in this repository."
    },
    "LIMIT.TITLE": {
      "label": "Limitation heading",
      "kind": "line",
      "section": "Evidence",
      "value": "Do not infer"
    },
    "LIMIT.TEXT": {
      "label": "Limitation text",
      "kind": "text",
      "section": "Evidence",
      "value": "Do not infer that a change is running, paid for or ready for production from a full set of approval signatures."
    },
    "EVIDENCE": {
      "label": "Canonical evidence link",
      "kind": "line",
      "section": "Links",
      "value": "READ THE GOVERNANCE GUIDE"
    },
    "NEXT": {
      "label": "Onward link (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "NEXT QUESTION: HOW TO VERIFY A NETWORK"
    },
    "GOVERNANCE": {
      "label": "Governance link (in Evidence)",
      "kind": "line",
      "section": "Links",
      "value": "SEE WHO CAN CHANGE WHAT"
    },
    "GOVERNANCE.HREF": {
      "label": "Governance link (in Evidence): where it goes",
      "kind": "link",
      "section": "Links",
      "value": "route:dao"
    },
    "BACK": {
      "label": "Link back to the theory (an arrow is added)",
      "kind": "line",
      "section": "Links",
      "value": "OPERATING MODEL"
    }
  }
});
