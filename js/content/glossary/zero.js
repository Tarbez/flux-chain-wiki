var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["published","Addressable and discoverable as a definition."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["resolution","A named resolver combined with signed records, so the mesh can find, run and verify an outcome. The resolver is the rulebook; a resolution is a use of it that you can choose."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
