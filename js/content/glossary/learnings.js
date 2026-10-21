var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["authority cell","An identified roster and threshold authorized for a specified decision."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["equivocation","Signing two different records at the same position of one's own chain. Each of the two is evidence against the signer, and the chain is frozen."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["ops/s","Operations per second: how many operations a run completed each second. A rate only means something once it names the operation it counts (a transfer, a store, a swap), because they cost different amounts of work."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["substrate","The shared layer every network builds on, which no single network owns. Mesh operations governs it; a network's DAO governs only its own network."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
