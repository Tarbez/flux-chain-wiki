var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["base chain","The chain whose launch log is the registry ledger. It records which chains, resolvers and capabilities exist."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["published","Addressable and discoverable as a definition."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["shard","One resolver process that resolves a batch of signed intents and signs the result. A resolver scales by running more shards, about one per performance core."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["ed25519","The signature scheme every record and result here is signed with. Verifying these signatures is most of the work a resolver does."],
  ["batch auction","A batch of swap intents cleared together at one price, so a place in the batch cannot change what anyone pays."],
  ["soak","A load run sustained for minutes, as opposed to a short burst."],
  ["segment","A block of chain lines that 6 of the 10 configured signers certify together."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["resolution","A named resolver combined with signed records, so the mesh can find, run and verify an outcome. The resolver is the rulebook; a resolution is a use of it that you can choose."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
