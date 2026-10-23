var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["pattern","A definition of a recognizable request or statement shape."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["named network","Currently a miner-presence namespace. It is not a security boundary, account namespace, identity namespace, DAO namespace, or authoritative membership list."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["resolution","A named resolver combined with signed records, so the mesh can find, run and verify an outcome. The resolver is the rulebook; a resolution is a use of it that you can choose."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["bundle","A site's or app's reviewed content and assets, packaged to be shared on the mesh as signed records. Browsing a site or signing in never deploys one."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
