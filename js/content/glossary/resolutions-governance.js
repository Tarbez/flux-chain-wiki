var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
