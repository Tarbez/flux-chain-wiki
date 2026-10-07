/* Loaded only when this article is requested. */
LearningContent.load("the-grammar-does-almost-no-work", {
  "core": "A transfer is five short lines of text. The parser splits each on a dash and nothing more; each block's own resolver decides what it means only when it is reached. Measured on a busy server, that whole layer is about 2 percent of the work.",
  "relevance": "Read this to understand what the registered grammar is, why it is built this way, and what it can and cannot make faster.",
  "reviewed": "2026-10-07",
  "evidenceLabel": "BENCH-003 section 14: the real grammar, measured",
  "evidenceHref": "docs/evidence/bench-003-rust-fleet-ceiling.md",
  "relatedPage": "stats",
  "actionLabel": "Open the measurements",
  "actionPage": "stats",
  "questions": [
    "What is a transfer, concretely?",
    "What is a block?",
    "What does the parser know?",
    "Why does a signature cover raw text?",
    "How do records point at each other?",
    "What needs an order?",
    "What does it refuse?",
    "Where does the speed come from?"
  ],
  "sections": [
    [
      "A transfer is five short lines",
      "Moving value takes five records, each one a single line of text. An intent says what the sender offers. An offer says the recipient will take it. An agreement names both and carries both signatures. A value object is the new holding the recipient ends up with. A fulfillment, signed by the sender, closes it.",
      "Each is signed by the party who makes the claim. Nobody needs a block, a height, or a validator who is not part of the transfer."
    ],
    [
      "Every block is a letter and a value",
      "A record is blocks joined by dashes. Each block is one role letter followed by its value: G is the signer's key, Y is the kind of record, V a version, M the moment it was made, D a deadline, C a reference to another record, S a signature. The only characters allowed anywhere are letters, digits and the dash.",
      "There is no escape character, because an escape character is a second piece of punctuation. A value that cannot survive the alphabet is re-encoded in hex instead."
    ],
    [
      "The parser knows the dash and nothing else",
      "Parsing a record means splitting it on dashes. That is all. What each block means is decided by the resolver registered for its letter, and only when that block is reached. A letter nobody registered is refused outright.",
      "This is cheap, and it was measured. For an eleven-block agreement, splitting takes about 1.5 microseconds and running every block's resolver brings it to about 2.9. Two signatures on the same record take 113. On a busy server the whole grammar layer was 2.1 percent of the work.",
      "Building a full tree of fields for every record up front costs about 2.6 times as much as that door check, which is why the server slices stored records by letter instead."
    ],
    [
      "A signature covers the exact text",
      "A signature covers every character before its own signature block, as written. It is never recomputed from parsed fields, because a copy that differs by one character would silently break every signature ever made. A record's identifier is the SHA-256 of its whole text, signatures included.",
      "This gives the two-party agreement for free. The second signature sits after the first, so it covers the first. The recipient cannot sign a body different from the one the sender signed."
    ],
    [
      "Records point at each other by content",
      "Records do not nest. They reference each other by identifier, in a fixed order. An agreement points at an intent and an offer; a fulfillment points at the agreement. Change one referenced record and every signature downstream stops matching.",
      "Standing documents, such as the authority policy or the terms of a transfer, are not stored or sent at all. The server recomputes the identifier it expects, and a record that points anywhere else is refused."
    ],
    [
      "Only one thing needs an order",
      "Almost everything here is addressed by content, so it needs no agreement on sequence. The one exception is spending: two different fulfillments must not both consume the same input. That is a single atomic check on one key.",
      "Because of that, records can be spread across independent stores by the first byte of their identifier, and no store ever has to agree with another about order. This is a bilateral design. There is no threshold certificate on this path, which is exactly why it is faster than the certified fabric and exactly why the two must not be compared as equals."
    ],
    [
      "What it refuses",
      "A test suite throws attacks at the server and expects each to fail in a specific way: a flipped signature digit, a repeated role, a reserved letter, punctuation outside the alphabet, an empty block, an unregistered type, prose that merely starts with a registered letter, a missing required block, a stranger's countersignature, a policy that is not the registered one, a wrong amount, a fulfillment signed by the wrong party, a replay, a second spend, and two spends at the same instant where exactly one may close.",
      "It also checks that batch signature checking cannot let one forged record spoil or hide behind its neighbours. All 36 checks pass in every verification mode."
    ],
    [
      "Where the speed comes from, and where it does not",
      "It does not come from size. A transfer in this grammar is about 2,500 characters across five records, more than the 1,560 bytes of JSON the old version sent in three. The gain came from dropping HTTP, not rebuilding trees, and not re-serializing, which took one server from about 1,900 transfers a second to about 5,000 on the same four cores.",
      "What is left is cryptography. Signatures are about 55 percent of the server, which is why batch checking and removing signatures that are not needed are the next steps, not a faster parser."
    ]
  ],
  "numbers": false
});
