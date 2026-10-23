var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["flux protocol","The product and protocol name. Use this in titles, navigation, metadata, and explanatory copy.","Flux Protocol"],
  ["object","Addressed data evaluated or referenced by protocol logic."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["authority cell","An identified roster and threshold authorized for a specified decision."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."],
  ["substrate","The shared layer every network builds on, which no single network owns. Mesh operations governs it; a network's DAO governs only its own network."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
