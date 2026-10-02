/* Loaded only when this article is requested. */
LearningContent.load("one-substrate-many-networks", {
  "core": "Flux Protocol is the shared substrate; project material describes DAO Chain as a network on it. Network creation currently partitions miner presence, not a complete security boundary. Live registration of named examples remains unverified here.",
  "relevance": "Use this note to distinguish the shared protocol from a network using it before relying on network isolation.",
  "reviewed": "2026-09-30",
  "evidenceLabel": "Named-network command and boundary documentation",
  "evidenceHref": "docs/operators/networks.md",
  "relatedPage": "concept/purpose",
  "actionLabel": "Inspect network evidence",
  "actionPage": "concept/studio",
  "questions": [
    "What is the substrate?",
    "What does create do today?",
    "Can networks govern each other?",
    "Where is the authority boundary?"
  ],
  "sections": [
    [
      "The EVM comparison, and where it holds",
      "Flux Protocol isn't one chain with DeadArk's own data on it. It's a substrate: a network directory, agreement-fabric mechanics, and its own mesh-operations governance, all shared by whoever registers a network on it. The closest familiar shape is an EVM-compatible chain — any party can deploy its own contracts on it without asking the base layer's permission. Registering a network here works the same way, structurally.",
      "That comparison is this page's own framing, not a term the underlying specs use — worth saying plainly, since precision about naming is most of what this site is for."
    ],
    [
      "What network create actually does today",
      "The network CLI defines a create command that returns a networkId. Pointing a miner at an existing networkId selects that presence namespace. The command contract is implemented in source; this audit did not complete a live create-and-participate run.",
      "It's also honestly scoped. Today it partitions presence only — the miner registry, not accounts, identities, or DAOs. The directory's own documentation says plainly that network creation is not yet a security boundary. That's not a criticism; it's the accurate current state, and pretending otherwise would cost more than it's worth the first time someone relies on isolation that isn't there yet."
    ],
    [
      "Two networks, one substrate, no hierarchy",
      "Project material names DAO Chain and CR3TV as intended network examples. A dated public directory record, network identifier, and independent live observation have not been registered here, so this note does not claim that either is currently active.",
      "This matters because it's an easy conflation to make by accident: a network built on a substrate can start to sound like the substrate itself, especially once it's the first or best-documented one. Keeping the two nouns separate — Flux Protocol the substrate, DAO Chain one network on it — is a discipline this site enforces on purpose."
    ],
    [
      "Where the boundary actually is",
      "Under the documented policy model, a network DAO governs its own scope, while the separate mesh-operations roster governs substrate policy. Neither roster substitutes for the other. The policy distinction is documented; production activation and named live-network governance need separate evidence.",
      "If a claim about \"the chain\" doesn't say which of these two things it means, it isn't precise enough to act on yet."
    ]
  ],
  "numbers": false
});
