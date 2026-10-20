var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["bundle","A site's or app's reviewed content and assets, packaged to be shared on the mesh as signed records. Browsing a site or signing in never deploys one."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
