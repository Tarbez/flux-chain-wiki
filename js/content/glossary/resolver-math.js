var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["shard","One resolver process that resolves a batch of signed intents and signs the result. A resolver scales by running more shards, about one per performance core."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["box","One field of a record: a label, usually one letter, followed by packed text."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
