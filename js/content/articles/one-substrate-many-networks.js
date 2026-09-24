/* Loaded only when this article is requested. */
LearningContent.load("one-substrate-many-networks", {
  "core": "Flux Protocol is the shared substrate; DAO Chain is one network on it. Network creation currently partitions miner presence, not a complete security boundary.",
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
      "The network directory's network create command returns a networkId for a new, independently addressable network. Pointing an app or miner at an existing networkId joins that network instead of creating a new isolated one — the same primitive, read the other direction. It's real, working code, not a roadmap item.",
      "It's also honestly scoped. Today it partitions presence only — the miner registry, not accounts, identities, or DAOs. The directory's own documentation says plainly that network creation is not yet a security boundary. That's not a criticism; it's the accurate current state, and pretending otherwise would cost more than it's worth the first time someone relies on isolation that isn't there yet."
    ],
    [
      "Two networks, one substrate, no hierarchy",
      "DAO Chain (De Ark OS's own constitutional network) and CR3TV are two networks already registered this way — each with its own separately frozen DAO, neither one inferred from the other's name, neither implicitly governing the other. De Ark OS runs on Flux Protocol; it doesn't own it, and it isn't the only thing on it.",
      "This matters because it's an easy conflation to make by accident: a network built on a substrate can start to sound like the substrate itself, especially once it's the first or best-documented one. Keeping the two nouns separate — Flux Protocol the substrate, DAO Chain one network on it — is a discipline this site enforces on purpose."
    ],
    [
      "Where the boundary actually is",
      "A network's own DAO governs that network: its own roster, its own signature threshold, its own scope. Flux Protocol's separate mesh-operations governance — the seven-operator ceremony that closes the substrate's own production policy — has no authority over any one network's internal decisions, and no network's DAO has authority over it. Two authority sets, not one, on purpose.",
      "If a claim about \"the chain\" doesn't say which of these two things it means, it isn't precise enough to act on yet."
    ]
  ],
  "numbers": false
});
