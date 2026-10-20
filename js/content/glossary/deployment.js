var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["launch record","The one signed ResolverLaunch (or CapabilityLaunch) that creates a resolver's chain (or declares a capability)."],
  ["control key","The one key named at launch that may sign an upgrade. A resolver with no control key is immutable."],
  ["immutable","Launched with no control key (GENESIS_PREV): nobody, including its creator, can ever change its manifests or provider set."],
  ["test vectors","Sample records with their expected verdicts, emitted by a capability crate's own tests and published in its manifest.","Test vectors (conformance vectors)"],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["served","Launched, and a provider is announcing for its chain (with proofs for every capability it composes). Replaces Deployed (earlier: \"backed by an admitted active provider with fresh execution capacity\")."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
