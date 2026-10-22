var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["tier","A label that tells one kind of asset from another in the treasury preview. Tier 1 is FXN, the native token; Credits are a separate unit, bound to one identity and not transferable."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
