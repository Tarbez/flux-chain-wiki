var ArkGlossary=window.ArkGlossary||{map:{}};
[
  ["resolver","A rulebook launched as its own chain: a composition of capabilities plus its own grammar."],
  ["capability","A shared mechanism (multisig, signer, custody, ledger, escrow) published once on the registry ledger with a derived manifest: version, seam, test vectors, source hash. A resolver composes capabilities; it never carries its own copy."],
  ["control key","The one key named at launch that may sign an upgrade. A resolver with no control key is immutable."],
  ["provider","A process that serves a resolver's chain: it announces an address for the chain and, if the resolver composes capabilities, proves it runs them by passing their test vectors."],
  ["published","Addressable and discoverable as a definition."],
  ["launched","On the registry ledger, with a chain of its own."],
  ["node","One machine in the fleet. It runs a chain-server or a resolver shard, and each node is measured on its own hardware."],
  ["fleet","The machines this project runs the network on (the flx-* nodes). A fleet figure is a sum of measurements taken on each node, never one node's figure multiplied."],
  ["shard","One resolver process that resolves a batch of signed intents and signs the result. A resolver scales by running more shards, about one per performance core."],
  ["replica","A node that stores a signed result as it is, without re-verifying or changing it."],
  ["ed25519","The signature scheme every record and result here is signed with. Verifying these signatures is most of the work a resolver does."],
  ["cid","Content identifier: a record's address, derived from a hash of its bytes, so the same bytes always have the same address.","CID"],
  ["batch auction","A batch of swap intents cleared together at one price, so a place in the batch cannot change what anyone pays."],
  ["grammar","The rules a record must follow to be admitted: which labelled boxes it holds and what each box may contain."],
  ["mesh","The peers that find, store and check records together. Taking part means running a correctly configured miner; there is no separate join step."],
  ["fxn","The name of this system (signed resolution over dense grammar) and of its native token, the unit of the transfers and balances shown on these pages. Credits are a separate unit, bound to one identity and not transferable.","FXN"],
  ["bundle","A site's or app's reviewed content and assets, packaged to be shared on the mesh as signed records. Browsing a site or signing in never deploys one."],
  ["dao","A decision group that belongs to one network, with its own roster, threshold, governed objects and activation rules. It cannot change the shared substrate, and mesh operations cannot decide its proposals.","DAO"],
  ["roster","The list of signers eligible to take a decision. A decision record names the roster, the threshold and the approvals collected."]
].forEach(function(e){ArkGlossary.map[e[0]]={term:e[2]||e[0][0].toUpperCase()+e[0].slice(1),definition:e[1]}});
