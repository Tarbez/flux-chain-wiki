/* Loaded only when this article is requested. */
LearningContent.load("what-the-numbers-do", {
  "sections": [
    [
      "The hash is the fixed point",
      "stable_content_cid hashes the JSON serialization of a payload, computed from the in-memory value — not from whatever bytes happen to be sitting on disk. That's a narrower guarantee than it might sound: the CID doesn't promise anything about storage. It promises one thing, exactly: this JSON, hashed this way, produces this address."
    ],
    [
      "Storage can move; the CID can't",
      "Because the hash is over the JSON and not the file, storage is free to change shape entirely — a different layout, a different encoding, a different database — while every CID stays identical. The one condition is that the JSON a reader reconstructs has to round-trip byte-identical to what was originally hashed. Move a field, reorder a key in a way that changes the serialization, and the CID stops matching, silently, for every record built that way."
    ],
    [
      "What an inexact round trip costs",
      "An inexact round trip doesn't just break one record — it re-addresses the whole store, because every CID downstream was computed against an assumption that no longer holds. This is also why a content store is described as holding a VIEW of the data, not the source: reading the store back out means parsing whatever rendering it kept, and that cost is invisible right up until something tries to consume it.",
      "The practical form of this law: before calling a store finished, write the reader and prove extract(parse(render(x))) equals extract(x). If that doesn't hold, the CID was never really addressing the thing you think it was addressing."
    ],
    [
      "No observer-relative anything",
      "This is the part that rules out a whole category of tempting designs: there is no per-reader, per-node, or per-moment resolution. A CID does not render differently because a different observer fetched it, and it does not change because time passed or someone asked from a different node. Determinism here isn't a performance property — it's the thing that makes \"verified\" mean anything at all."
    ],
    [
      "Verifying is recomputation, not opinion",
      "Checking a record is mechanical: recompute the same hash over the same JSON serialization and compare it to the CID you were handed. It is not a matter of whether the content looks right, reads plausibly, or comes from a source you trust. A record that fails that recomputation is not \"probably fine\" — it's not the thing the CID names, full stop."
    ]
  ],
  "numbers": false
});
