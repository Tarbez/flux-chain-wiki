var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["object","Addressed data evaluated or referenced by protocol logic."],
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["claim","A resolver's stated result. Its signature is its result; whether to rely on that resolver is decided before you send anything: its grammar, its capabilities, who can change it."],
  ["agreement","Accepted terms connecting requested work, provider, execution, and evidence."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["role letter","The label that opens a box and says what the box is."],
  ["threshold","How many of a roster's signers must approve before a decision counts, for example 4 of 7. Approval is not activation: the change runs only when its activation rule is also met."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
