var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["named network","Currently a miner-presence namespace. It is not a security boundary, account namespace, identity namespace, DAO namespace, or authoritative membership list."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
