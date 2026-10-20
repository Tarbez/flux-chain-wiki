var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["base chain","The chain whose launch log is the registry ledger. It records which chains, resolvers and capabilities exist."],
  ["chain id","The name a launch record gives a resolver's chain ([a-z0-9]{3,32}). A resolver's records name it."],
  ["control key","The one key named at launch that may sign an upgrade. A resolver with no control key is immutable."],
  ["immutable","Launched with no control key (GENESIS_PREV): nobody, including its creator, can ever change its manifests or provider set."],
  ["test vectors","Sample records with their expected verdicts, emitted by a capability crate's own tests and published in its manifest.","Test vectors (conformance vectors)"],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["published","Addressable and discoverable as a definition."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["served","Launched, and a provider is announcing for its chain (with proofs for every capability it composes). Replaces Deployed (earlier: \"backed by an admitted active provider with fresh execution capacity\")."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
