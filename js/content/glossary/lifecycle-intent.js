var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
