var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["base chain","The chain whose launch log is the registry ledger. It records which chains, resolvers and capabilities exist."],
  ["test vectors","Sample records with their expected verdicts, emitted by a capability crate's own tests and published in its manifest.","Test vectors (conformance vectors)"],
  ["provider proof","The CID of a passing run of a capability's test vectors, carried on a provider's announce. Without it, a provider gets no seat on a resolver that composes that capability."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["published","Addressable and discoverable as a definition."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["fxn chain","One signed, append-only chain per identity. It checks grammar, signature and position, and nothing else; what a record means is up to the resolver that reads it.","FXN chain"],
  ["bundle","A site's or app's reviewed content and assets, packaged to be shared on the mesh as signed records. Browsing a site or signing in never deploys one."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
