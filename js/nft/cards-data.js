/* DEFXN identity card: SAMPLE records. Nothing here is live or read from a chain.

   One record per card. The card renders only from a record like these, so the owner can later swap
   this file (or the URL params on card.html) for real data. The field names are a proposal: the
   owner confirms the real fields before anything is wired to data.

     genesisId  the number top right, under "Genesis ID" ("009")
     identity   the short identity under "Identity" ("0x6D4...F0C8"), shown as given
     name       the name under it, shown in lower case
     status     the first row of the list; "Minted" is drawn in green, any other value in grey
     role       the second row
     network    the third row
     joined     the fourth row, shown as given ("22 NOV 2026")
     serial     the small number bottom right ("03")
     tagline    the two footer lines
     traits     optional: pins the card's DNA, one element name for every layer folder in layers/
                (traits.js). A real mint stores the DNA it was made with; the reference pins its
                DNA so it keeps drawing the reference.

   The DNA is not stored here. traits.js gives each genesis number its own DNA, one element per layer,
   and never gives one DNA to two numbers. The art inside those elements is seeded from identity +
   genesisId, so the same record always draws the same card.

   RECORD 0 is copied from the owner's reference card (2026-10-24), word for word, so the build can
   be checked against it. Two things on it need the owner's call before real data:
     - "defxn.eth": DEFXN has one name system, flat .fxn names (docs/DEFXN-NAMES-ONE-SYSTEM.md).
       The reference shows an .eth name, so record 0 keeps it only to match the picture. The other
       samples use .fxn names.
     - "22 NOV 2026" is after today's date (2026-10-24). It is the reference's text, not a join date.
   Records 1 to 8 are made-up placeholders that only show how the art varies with the record. Their
   identities are random hex, their names, roles and dates are invented, and none of them exists. */
(function () {
  var TAGLINE = ['A chain of chains.', 'For a more open internet.'];

  window.DEFXN_CARDS = [
    { genesisId: '009', identity: '0x6D4...F0C8', name: 'defxn.eth', status: 'Minted', role: 'Protocol',
      network: 'DEFXN', joined: '22 NOV 2026', serial: '03', tagline: TAGLINE,
      traits: { backdrop: 'Void', palette: 'Mono', aura: 'None', mark: 'Glitch', signal: 'None', particles: 'None',
        corner: 'Bracket', frame: 'Hairline', tag: 'None', ornament: 'None', divider: 'Rule', emblem: 'Hexagon' } },
    { genesisId: '001', identity: '0x1A9...7E21', name: 'radio.fxn', status: 'Minted', role: 'Protocol',
      network: 'DEFXN', joined: '01 NOV 2026', serial: '01', tagline: TAGLINE },
    { genesisId: '012', identity: '0xB37...04D9', name: 'alex.fxn', status: 'Minted', role: 'Builder',
      network: 'DEFXN', joined: '24 NOV 2026', serial: '04', tagline: TAGLINE },
    { genesisId: '027', identity: '0x9E0...C35A', name: 'mira.fxn', status: 'Minted', role: 'Resolver',
      network: 'DEFXN', joined: '26 NOV 2026', serial: '05', tagline: TAGLINE },
    { genesisId: '044', identity: '0x52F...A61B', name: 'atlas.fxn', status: 'Minted', role: 'Member',
      network: 'DEARK', joined: '29 NOV 2026', serial: '06', tagline: TAGLINE },
    { genesisId: '058', identity: '0xC81...3F07', name: 'kite.fxn', status: 'Minted', role: 'Builder',
      network: 'CR3TV', joined: '02 DEC 2026', serial: '07', tagline: TAGLINE },
    { genesisId: '073', identity: '0x3D6...E9B4', name: 'nova.fxn', status: 'Minted', role: 'Member',
      network: 'DEFXN', joined: '05 DEC 2026', serial: '08', tagline: TAGLINE },
    { genesisId: '101', identity: '0xF14...6C2E', name: 'orbit.fxn', status: 'Minted', role: 'Resolver',
      network: 'DEFXN', joined: '09 DEC 2026', serial: '09', tagline: TAGLINE },
    { genesisId: '256', identity: '0x07B...D85F', name: 'lumen.fxn', status: 'Minted', role: 'Member',
      network: 'DEARK', joined: '14 DEC 2026', serial: '10', tagline: TAGLINE }
  ];
})();
