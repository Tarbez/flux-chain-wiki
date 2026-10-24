/* DEFXN mockup: SAMPLE records for the chain, record and open-record pages.
   SAMPLE, not chain data. Every title, date, revision and line below is copied from the owner's
   boards A1-A9 and C1-C9 (2026-10-23). Nothing here was invented. Where the boards say nothing,
   the field is absent, and the pages say "not in this sample" rather than show a zero.

   Added 2026-10-23 from the owner's second board set (the six-panel boards): each record's
   revision and date as the record list shows them (panel 02: "Design direction REV 07 · 03 MAR
   2024", "Client feedback REV 04 · 28 FEB 2024", "Research summary REV 03 · 14 FEB 2024", "Initial
   concept REV 01 · 02 FEB 2024"), and Project notes' content (panel 04: key decisions, next steps,
   open questions). The signed count stays the boards' "Signed 2 of 5".

   The chain is newest first, the order of the owner's record list (board A2). "Next in chain"
   (board A7) is the following record in this order. */
window.DEFXN_RECORDS = {
  owner: 'you',
  chain: 'Personal chain',
  records: [
    { id: 'project-notes', title: 'Project notes', type: 'Note', glyph: 'doc', date: '12 Mar 2024', revision: 8,
      signedBy: 'you', state: 'Signed',
      about: 'Notes from the project direction conversation. Key decisions, next steps and open questions.',
      earlier: [5, 7],
      content: [
        { head: 'Key decisions', items: ['Focus on developer experience', 'Simplify onboarding flow', 'Improve resolver performance'] },
        { head: 'Next steps', items: ['Draft updated design direction', 'Share with core team', 'Schedule follow up for next week'] },
        { head: 'Open questions', items: ['How to measure adoption?'] }
      ],
      provenance: [
        { what: 'Created', date: '12 Mar 2024', by: 'you' },
        { what: 'Updated', date: '12 Mar 2024', by: 'you' },
        { what: 'Signed', date: '12 Mar 2024', by: 'you' }
      ],
      links: [
        { title: 'Record 03', note: 'Related note' },
        { title: 'Record 12', note: 'Follow-up idea' }
      ] },
    { id: 'design-direction', title: 'Design direction', type: 'Note', glyph: 'img', date: '03 Mar 2024', revision: 7, signedBy: 'you', state: 'Signed' },
    { id: 'client-feedback', title: 'Client feedback', type: 'Note', glyph: 'doc', date: '28 Feb 2024', revision: 4 },
    { id: 'research-summary', title: 'Research summary', type: 'Note', glyph: 'doc', date: '14 Feb 2024', revision: 3 },
    { id: 'initial-concept', title: 'Initial concept', type: 'Note', glyph: 'iii', date: '02 Feb 2024', revision: 1 }
  ]
};
/* a record's day, for the timeline: the sample's dates are "DD Mon YYYY" */
window.DEFXN_RECORDS.day = function (r) { var t = Date.parse(r.date + ' UTC'); return isNaN(t) ? null : t / 864e5; };
window.DEFXN_RECORDS.byId = function (id) {
  var list = window.DEFXN_RECORDS.records;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return { record: list[i], index: i };
  return { record: list[0], index: 0 };
};
