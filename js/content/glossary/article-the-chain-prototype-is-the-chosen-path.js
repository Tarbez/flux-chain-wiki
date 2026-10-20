var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["base chain","The chain whose launch log is the registry ledger. It records which chains, resolvers and capabilities exist."],
  ["registry ledger","The launch log on the base chain: ChainLaunch, ResolverLaunch and ResolverUpgrade, CapabilityLaunch and CapabilityUpgrade. \"Registered\" means launched here."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["soak","A load run sustained for minutes, as opposed to a short burst."],
  ["segment","A block of chain lines that 6 of the 10 configured signers certify together."],
  ["ops/s","Operations per second: how many operations a run completed each second. A rate only means something once it names the operation it counts (a transfer, a store, a swap), because they cost different amounts of work."],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
