var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["auth kit","The recovery file (.auth.flx) that holds your keys. It stays on your device and is never uploaded; you choose it to unlock your account.","Auth Kit"],
  ["ghost id","Your identity ID as developer tools name it: the public name your Auth Kit unlocks.","Ghost ID"]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
