/* DEFXN mockup: FXN's starting supply and its fee split, for the FXN view (2026-10-23).
   OWNER DECISIONS, mostly not in code yet. Every number is copied from
   flux/defxn-defi-rs/dense-wire/docs/design/fxn-fairness-by-design.md ("Owner decisions,
   2026-10-22" and the allocation table): three groups, public 68, team 15, operations 17; the 3%
   row is the investing fund (decision 6). The release rules are that file's and the designer
   brief's (defxn-concept.html, section 10). Fees: 65% to the computers, 35% to the network fund
   (brief, section 10). One tile in the scene is 1% of the supply, 10,000,000 FXN.
   Checked against dense-wire main a3dc2e8 (src/fxn_genesis.rs, genesis commit e80fef5) on 2026-10-24: the rows and
   percentages below match FXN_GENESIS. The local devnet node still runs code from before 2026-10-23 (mining 50%, no
   investing fund), so no allocation is ever read from that node.
   Copy rule from the brief: show the rules and the numbers; never call them fair or safe. */
window.DEFXN_FXN = {
  supply: 1000000000,
  groups: [
    { id: 'public', name: 'Public', parts: [
      { id: 'mining', name: 'Mining', pct: 47, rule: 'Paid out on the chain over many years, for measured storage and compute work. The payout halves every 4 years and never reaches zero.' },
      { id: 'investing', name: 'Investing fund', pct: 3, rule: 'It invests in people: early users, referrals, staking, network rewards and DAO rewards. It sits in a DAO safe and is released monthly over 3 years. Each spend needs a holder vote, within 10% of the free tokens per 30 days, and one key can receive at most 0.05% of the fund. The owner has not set these limits yet, so they are assumptions in the code.' },
      { id: 'sale', name: 'Public sale', pct: 10, rule: '0.34 EUR per FXN, in phases over the first year. At most 50,000 FXN per identity. Buyers get 25% at once and the rest monthly over 6 months.' },
      { id: 'service', name: 'Service fund', pct: 5, rule: 'Released monthly over 3 years. Each spend needs a holder vote, within 10% of the free tokens per 30 days. The owner has not set these limits yet.' },
      { id: 'buyback', name: 'Buyback', pct: 3, rule: 'Buys only through on-chain pools, from an address no one holds a key to, in equal monthly slices over 4 years. The rule that places a slice is not built, so for now the tokens stay at that address.' }
    ] },
    { id: 'team', name: 'Team', parts: [
      /* schedule: the design doc's allocation table, "Day 90, then each 90 days, all by day 720" */
      { id: 'creator', name: 'Creator', pct: 9, schedule: { first: 90, every: 90, last: 720 }, rule: 'In a DAO safe. One eighth is released at day 90, then one eighth every 90 days, all by day 720.' },
      { id: 'cofounder', name: 'Co-founder', pct: 6, schedule: { first: 90, every: 90, last: 720 }, rule: 'The same schedule as the creator: the first eighth at day 90, all by day 720.' }
    ] },
    { id: 'ops', name: 'Operations', parts: [
      { id: 'operations', name: 'Operations', pct: 17, rule: 'In a DAO safe, released monthly over 3 years. A 3-of-5 council spends it, only inside budgets that holders approved.' }
    ] }
  ],
  fees: { parts: [
    { id: 'computers', name: 'The computers that do the work', pct: 65 },
    { id: 'fund', name: 'The network fund', pct: 35 }
  ], note: 'No price is set yet. A resolver owner sets a price, and 15% of it pays for builder programs. A DAO vote can lower the 15%. Nothing can raise it.' }
};
