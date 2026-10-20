var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["shard","One resolver process that resolves a batch of signed intents and signs the result. A resolver scales by running more shards, about one per performance core."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["ed25519","The signature scheme every record and result here is signed with. Verifying these signatures is most of the work a resolver does."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["equivocation","Signing two different records at the same position of one's own chain. Each of the two is evidence against the signer, and the chain is frozen."],
  ["segment","A block of chain lines that 6 of the 10 configured signers certify together."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["box","One field of a record: a label, usually one letter, followed by packed text."],
  ["ops/s","Operations per second: how many operations a run completed each second. A rate only means something once it names the operation it counts (a transfer, a store, a swap), because they cost different amounts of work."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
