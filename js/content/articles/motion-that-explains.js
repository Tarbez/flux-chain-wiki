/* Loaded only when this article is requested. */
LearningContent.load("motion-that-explains", {
  "sections": [
    [
      "Five nodes, not a public chain",
      "\"Flux\" names more than one thing in this stack, and it's worth being precise about which one a quorum actually is. The five flx-* nodes are DeadArk's own mesh — a small, known writer quorum running its own miner software — not the open public Flux chain that wallets and tokens live on. Same word, different system. The quorum this spec describes is the mesh: five nodes holding the same ledger."
    ],
    [
      "Why raw reads are off",
      "Reading the mesh used to mean talking to GUN directly, the peer-to-peer database the nodes run on. That path is closed now: raw gun.js client reads are rejected, and GUN federation between the five nodes has its own known problems that make a direct read unreliable in ways that are hard to distinguish from a real fault. The one way in is the /explorer/v1 HTTP API — a query surface in front of the mesh, not a window straight into it."
    ],
    [
      "Publishing is distribution, not privacy",
      "By default, everything published this way — every page, every article, every image — becomes one content-addressed archive on the mesh, unencrypted. Anyone with the address, or who finds the name record, can fetch and read all of it, the same as any public IPFS file. That's a deliberate property, not an oversight: publishing here means distributing, and distribution and privacy are different problems.",
      "When privacy actually matters, it's handled as its own layer on top: content encrypted client-side before it's published, with the file key wrapped separately for each intended reader. The archive is still content-addressed and still fetchable by anyone — what changes is that only someone holding a matching key can turn the ciphertext back into anything readable."
    ],
    [
      "What quorum promises, and what it doesn't",
      "Five nodes holding the same ledger buys you one specific thing: no single writer gets to unilaterally decide what a name resolves to. It doesn't, by itself, buy you anonymity, and it doesn't make content private — those are the encryption layer's job, not the quorum's. Knowing which promise comes from which layer is most of what it takes to reason about this system correctly.",
      "It's the same discipline as the rest of the spec, applied one level up: don't ask a layer for a guarantee it never made. Compact promises density, not privacy. A CID promises identity, not availability. The quorum promises agreement among five known writers, not who else might be reading. Query the layer that actually makes the promise you need — don't guess at it."
    ]
  ],
  "numbers": false
});
