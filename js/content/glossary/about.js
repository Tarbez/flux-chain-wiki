var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["pattern","A definition of a recognizable request or statement shape."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["test vectors","Sample records with their expected verdicts, emitted by a capability crate's own tests and published in its manifest.","Test vectors (conformance vectors)"],
  ["provider proof","The CID of a passing run of a capability's test vectors, carried on a provider's announce. Without it, a provider gets no seat on a resolver that composes that capability."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["published","Addressable and discoverable as a definition."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["fxn chain","One signed, append-only chain per identity. It checks grammar, signature and position, and nothing else; what a record means is up to the resolver that reads it.","FXN chain"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
