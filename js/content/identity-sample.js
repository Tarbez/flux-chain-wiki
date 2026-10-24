/* DEFXN mockup: a SAMPLE identity for the "your identity" step of the identity flow.
   SAMPLE, not chain data. Copied from the owner's identity board (2026-10-23, panel 04): the name
   alex.fxn and two of its devices. Left out on purpose:
     - the board's alex.eth and alex.base: DEFXN has one name system, flat .fxn names
       (docs/DEFXN-NAMES-ONE-SYSTEM.md), so the page does not show names from other systems;
     - the board's "Active", "Strong, all systems good", "last seen 2h ago" and its device ids:
       live status and activity that nothing measures;
     - the board's network numbers (93 chains, 6.0M records, 71K identities, 27 apps): no source.
   The pages count what the data files hold instead. */
window.DEFXN_IDENTITY = {
  name: 'alex.fxn',
  devices: [
    { kind: 'laptop', name: 'MacBook Pro', note: 'This device' },
    { kind: 'phone', name: 'iPhone 15', note: 'Another device of yours' }
  ]
};
