var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["checker","Logic that evaluates a claim against defined rules or evidence."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
