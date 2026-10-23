var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["flux protocol","The product and protocol name. Use this in titles, navigation, metadata, and explanatory copy.","Flux Protocol"],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."],
  ["substrate","The shared layer every network builds on, which no single network owns. Mesh operations governs it; a network's DAO governs only its own network."],
  ["miner presence","Which miners are reachable on the mesh under a name. A named network partitions this and nothing else: it does not isolate accounts, identities, DAOs, records or treasuries, and it is not a security boundary."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
