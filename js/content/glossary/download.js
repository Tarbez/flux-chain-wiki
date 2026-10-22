var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["served","Launched, and a provider is announcing for its chain (with proofs for every capability it composes). Replaces Deployed (earlier: \"backed by an admitted active provider with fresh execution capacity\")."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
