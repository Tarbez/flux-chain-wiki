/* Loaded only when this article is requested. */
LearningContent.load("governance-without-a-validator-set", {
  "core": "The protocol model derives a short-lived authority cell for each contested transition instead of using a standing validator set. A separate mesh-operations policy describes a seven-operator substrate roster; production activation remains unverified.",
  "relevance": "Use this note to tell transition authority apart from substrate policy and a network's own DAO.",
  "reviewed": "2026-09-30",
  "evidenceLabel": "Authority model, thresholds, and current limits",
  "evidenceHref": "docs/protocol/authority.md",
  "relatedPage": "concept/practice",
  "actionLabel": "Inspect activation limits",
  "actionPage": "concept/notes",
  "questions": [
    "Who approves a transition?",
    "How is a cell derived?",
    "Who governs mesh operations?",
    "Can either roster overrule the other?"
  ],
  "sections": [
    [
      "No standing roster",
      "Most chains answer \"who can approve this\" with a fixed list: a validator set, elected or staked, that stays the same until the next election. Flux Protocol answers it differently — there is no roster that governs everything. For a contested transition, a small committee is derived just for that object, does exactly one job, and disappears."
    ],
    [
      "How a cell is derived",
      "An ephemeral authority cell is computed deterministically from four inputs: the object's own CID, its next sequence number, the authority registry root, and the policy CID in force. Change any one of those and a different cell is derived — there's no way for a cell certified for one object to reach over and certify unrelated work.",
      "Its job is narrow on purpose: verify one manifest transition, publish threshold evidence, persist its markers, and dissolve. Not proof-of-authority in the usual sense — there's no authority left standing once the job is done."
    ],
    [
      "The other roster: mesh operations",
      "The mesh-operations policy describes a separate seven-operator roster for substrate changes, not network transactions. Its documented thresholds are 4-of-7 for ordinary admission, 5-of-7 for economic or runtime changes and member replacement, 3-of-7 to pause, and 5-of-7 to unpause. These are policy rules, not evidence that production activation completed.",
      "Even a fully signed result from that ceremony stays closed until separate network-proof and staged-activation gates open it. A completed signature ceremony is evidence toward activation, not activation itself — stated plainly in the ceremony's own documentation, not something this page is inferring."
    ],
    [
      "Why the two never substitute for each other",
      "In the documented design, the mesh-operations roster has no authority over a network DAO's decisions, and a network DAO has no authority over mesh operations. A network should not be able to change its substrate by voting, and substrate operators should not overrule network governance.",
      "Two authority sets, doing two different jobs, neither one a stand-in for the other. If something reads as governance on Flux Protocol, the first question worth asking is which of the two it actually is."
    ]
  ],
  "numbers": false
});
