var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
