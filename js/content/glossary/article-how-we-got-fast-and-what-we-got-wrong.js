var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["pattern","A definition of a recognizable request or statement shape."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["box","One field of a record: a label, usually one letter, followed by packed text."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
