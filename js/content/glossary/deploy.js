var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["named network","Currently a miner-presence namespace. It is not a security boundary, account namespace, identity namespace, DAO namespace, or authoritative membership list."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["bundle","A site's or app's reviewed content and assets, packaged to be shared on the mesh as signed records. Browsing a site or signing in never deploys one."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
