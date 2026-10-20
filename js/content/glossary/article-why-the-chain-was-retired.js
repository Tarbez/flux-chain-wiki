var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["soak","A load run sustained for minutes, as opposed to a short burst."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
