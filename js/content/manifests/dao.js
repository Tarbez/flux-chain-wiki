/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "dao",
  "title": "How DEFXN is governed",
  "route": "/dao",
  "group": "page",
  "meta": {
    "back": "concept",
    "topic": "Governance",
    "docs": "docs/protocol/governance.md",
    "diagrams": [
      {
        "id": "upgrade-supersedes",
        "place": "dao: beside POINT6 (Who can change a resolver?)",
        "caption": "Illustration · relationships, not live state",
        "line": "a declaration head moves right; the old declaration stays on the line, greyed but present",
        "declarations": [
          "launch",
          "upgrade",
          "upgrade"
        ],
        "head": "current",
        "superseded": "superseded, still on the line",
        "variants": [
          {
            "control": "key",
            "mark": "key",
            "label": "A control key was named at launch: each upgrade adds a declaration beside the old one",
            "shows": 3
          },
          {
            "control": "immutable",
            "mark": "lock",
            "label": "Launched immutable: no upgrade can be signed, ever",
            "shows": 1
          }
        ]
      }
    ]
  },
  "fields": {
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
      "value": "What it is: the rules for who can change what. What you do: sign a proposal with your FXN ID if you are on a roster. What you get back: a signed decision record. On the devnet, a multisig of five FXN IDs changes fees, budget and parameters when 4 of 5 sign, until attesters are filed. Each launched chain gets its own DAO. Status: built, not live."
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
      "value": "An earlier base policy in source names seven operators. Four must sign for ordinary admission, five for economic or runtime changes, three to pause and five to unpause. It governs the shared base, not a network’s decisions, and it is not how a resolver changes."
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
      "value": "Each network defines its own roster, threshold, governed objects and activation rules. On the development network the DAO runs as its own resolver chain, built on the shared N-of-M signature capability: at least two signers, and a threshold of at least two. No public live example with complete evidence is established, so named deployments remain unverified."
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
      "value": "Mesh operations cannot decide a network's internal proposal. A network DAO cannot change the shared base. The word \"governance\" alone does not say who holds authority."
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
    "POINT6.TITLE": {
      "label": "Point 6 title",
      "kind": "line",
      "section": "Point 6",
      "value": "Who can change a resolver?"
    },
    "POINT6.TEXT": {
      "label": "Point 6 text",
      "kind": "text",
      "section": "Point 6",
      "value": "The key its creator named at launch, or nobody. A resolver launched immutable can never change. An upgrade is a new signed declaration that sits beside the old one. Records signed under the old rules stay valid."
    },
    "POINT7.TITLE": {
      "label": "Point 7 title",
      "kind": "line",
      "section": "Point 7",
      "value": "Who can change a capability?"
    },
    "POINT7.TEXT": {
      "label": "Point 7 text",
      "kind": "text",
      "section": "Point 7",
      "value": "The same rule: the control key named when the capability was launched, or nobody. A capability controlled by a DAO is refused for now."
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
      "value": "The base policy and threshold rules exist in source, and the DAO runs as a resolver chain on the development network. A public governance page and a production activation do not exist yet."
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
      "value": "Policy text is not activation evidence. Each named network DAO needs its own roster record, decision records and activation records that anyone can inspect."
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
      "value": "OPERATING MODEL"
    }
  }
});
