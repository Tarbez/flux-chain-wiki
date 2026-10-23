var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["object","Addressed data evaluated or referenced by protocol logic."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["control key","The one key named at launch that may sign an upgrade. A resolver with no control key is immutable."],
  ["immutable","Launched with no control key (GENESIS_PREV): nobody, including its creator, can ever change its manifests or provider set."],
  ["named network","Currently a miner-presence namespace. It is not a security boundary, account namespace, identity namespace, DAO namespace, or authoritative membership list."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."],
  ["substrate","The shared layer every network builds on, which no single network owns. Mesh operations governs it; a network's DAO governs only its own network."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
