var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["ed25519","The signature scheme every record and result here is signed with. Verifying these signatures is most of the work a resolver does."],
  ["box","One field of a record: a label, usually one letter, followed by packed text."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
