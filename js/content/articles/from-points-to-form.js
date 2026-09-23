/* Loaded only when this article is requested. */
LearningContent.load("from-points-to-form", {
  "sections": [
    [
      "A reference is an address, not a spelling",
      "Flux Compact (.compact; .flx is now a legacy read-only alias) never writes a word out. It replaces it with a reference into a shared symbol table: \"what\" becomes \"W392\". There is no hex and no base64 anywhere in the encoding — a symbol is an address into a table, the same way a variable name is an address into memory, not the value itself.",
      "That distinction matters more than it sounds. A table of addresses only pays off if the thing on the other end of the address is worth not repeating. Below a certain size, or with no shared vocabulary at all, an address costs more than just writing the word."
    ],
    [
      "What gets embedded, and what gets addressed",
      "Not every symbol is the same kind of symbol. A closed, structural vocabulary — function words, grammar, the scaffolding every entry shares — gets embedded: a small, fixed set the encoder can afford to represent densely, because it repeats constantly. An open vocabulary — every name of a thing, every entry-specific word — gets addressed instead, because weights are for resolution behaviour, not for holding facts.",
      "Measured on one real corpus: 244 embedded symbols against 594,371 addressed ones. Counting a symbol table and multiplying by an embedding dimension only makes sense for the embedded half. Assuming every symbol gets a learned row is exactly the mistake this split exists to avoid."
    ],
    [
      "Measuring against the right shape",
      "Flux Compact was measured against a real 3,000-entry corpus with a genuine shared vocabulary, not a synthetic benchmark. Without the shared table, it comes out to 47.3% of the equivalent JSON+base64 shape. With the table included — 0.9 MB, measured rather than estimated — it's closer to 57%.",
      "Those two numbers matter for different reasons: the first is what the encoding buys you per entry once the table already exists somewhere; the second is the honest cost of shipping the table along with the data, which you only pay once. Break-even against plain text lands around 430 entries; against the retired JSON+base64 wrapper, closer to 215."
    ],
    [
      "What it replaced",
      "Two earlier envelope formats — legacy-hex-json and legacy-base64-json — are retired now: read-only, and never written by new code. Both existed for the same reason people reach for hex or base64 today: they feel like the safe, obvious choice for \"binary-looking\" data. Flux Compact's own numbers are the argument against that instinct. The assumption that table-coding inflates text is backwards — but that doesn't mean it's free, either.",
      "The rule that falls out of this: prefer Flux Compact over JSON for stored dictionary-style entries once there's a real shared vocabulary behind them. Below the break-even point, or for a document with no shared vocabulary at all — a model profile, a manifest, a log — store plain JSON. Never hex."
    ],
    [
      "The address, not the payload",
      "The habit this all reinforces is the same one that shows up everywhere else in the spec: think about what's being resolved before deciding how to store it. A symbol table entry is a reference, the CID is a reference, the quorum is five copies agreeing on what a reference resolves to. None of it is about compressing bytes for its own sake — it's about not spelling out what a shared table already knows."
    ]
  ],
  "numbers": false
});
