var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["object","Addressed data evaluated or referenced by protocol logic."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["published","Addressable and discoverable as a definition."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
