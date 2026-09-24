/* Loaded only when this article is requested. */
LearningContent.load("governance-without-a-validator-set", {
  "core": "No standing validator set approves agreement transitions. Each contested object gets a short-lived authority cell. A separate seven-operator roster governs the substrate, never a network DAO.",
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
      "Flux Protocol still has a real, standing governance body — it just governs the substrate itself, not any network's transactions. A seven-operator ceremony closes the frozen production policy bundle: 4-of-7 for ordinary admission, 5-of-7 for economic or runtime changes or a member replacement, 3-of-7 to pause, 5-of-7 to unpause — asymmetric on purpose, easy to pause, hard to unpause.",
      "Even a fully signed result from that ceremony stays closed until separate network-proof and staged-activation gates open it. A completed signature ceremony is evidence toward activation, not activation itself — stated plainly in the ceremony's own documentation, not something this page is inferring."
    ],
    [
      "Why the two never substitute for each other",
      "The mesh-operations roster has no authority over any one network's DAO decisions. A network's own DAO has no authority over the mesh-operations roster. This isn't an oversight to be closed later — it's the actual design: a network shouldn't be able to change the substrate it runs on by voting, and the substrate's own operators shouldn't be able to overrule a network's governance from underneath it.",
      "Two authority sets, doing two different jobs, neither one a stand-in for the other. If something reads as governance on Flux Protocol, the first question worth asking is which of the two it actually is."
    ]
  ],
  "numbers": false
});
