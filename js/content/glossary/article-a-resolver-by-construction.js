var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["object","Addressed data evaluated or referenced by protocol logic."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["equivocation","Signing two different records at the same position of one's own chain. Each of the two is evidence against the signer, and the chain is frozen."],
  ["segment","A block of chain lines that 6 of the 10 configured signers certify together."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["ops/s","Operations per second: how many operations a run completed each second. A rate only means something once it names the operation it counts (a transfer, a store, a swap), because they cost different amounts of work."],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
