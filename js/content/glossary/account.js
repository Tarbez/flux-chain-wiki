var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["fxn id","Your identity: one file (.auth.fxn) that holds your keys. It stays on your device and is never uploaded; you choose it to sign in.","FXN ID"],
  ["master id","The key at the centre of your FXN ID. Its secret half never leaves the file, and it signs nothing that others see. Your recovery phrase and Secret Key rebuild it.","Master ID"],
  ["public id","The identity you show others. It has its own key and its own name, and it makes its own wallets. Nothing public links one Public ID to another or to your Master ID.","Public ID"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
