var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["soak","A load run sustained for minutes, as opposed to a short burst."],
  ["segment","A block of chain lines that 6 of the 10 configured signers certify together."],
  ["ops/s","Operations per second: how many operations a run completed each second. A rate only means something once it names the operation it counts (a transfer, a store, a swap), because they cost different amounts of work."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
