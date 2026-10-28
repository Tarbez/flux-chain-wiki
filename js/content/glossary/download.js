var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["published","Addressable and discoverable as a definition."],
  ["served","Launched, and a provider is announcing for its chain (with proofs for every capability it composes). Replaces Deployed (earlier: \"backed by an admitted active provider with fresh execution capacity\")."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["fxn id","Your identity: one file (.auth.fxn) that holds your keys. It stays on your device and is never uploaded; you choose it to sign in.","FXN ID"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
