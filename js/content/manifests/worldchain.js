/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "worldchain",
  "title": "Your chain",
  "route": "/chain",
  "group": "page",
  "meta": {},
  "fields": {
    "COMMON.ROOT": {
      "label": "Shared: root crumb",
      "kind": "line",
      "section": "Shared",
      "value": "DEFXN"
    },
    "COMMON.WHERE": {
      "label": "Shared: \"where you are\" label",
      "kind": "line",
      "section": "Shared",
      "value": "Where you are"
    },
    "COMMON.HERE": {
      "label": "Shared: breadcrumb for this page",
      "kind": "line",
      "section": "Shared",
      "value": "Your chain"
    },
    "COMMON.SIGNED": {
      "label": "Shared: \"Signed\" state",
      "kind": "line",
      "section": "Shared",
      "value": "Signed"
    },
    "COMMON.NOTSIGNED": {
      "label": "Shared: \"Not signed\" state",
      "kind": "line",
      "section": "Shared",
      "value": "Not signed"
    },
    "COMMON.SIGNEDBY": {
      "label": "Shared: \"signed by\" line",
      "kind": "line",
      "section": "Shared",
      "value": "Signed by {name}"
    },
    "COMMON.MISSING": {
      "label": "Shared: dash for a missing value",
      "kind": "line",
      "section": "Shared",
      "value": "—"
    },
    "COMMON.FACT.TYPE": {
      "label": "Shared: fact label, type",
      "kind": "line",
      "section": "Shared",
      "value": "Type"
    },
    "COMMON.FACT.STATE": {
      "label": "Shared: fact label, build state",
      "kind": "line",
      "section": "Shared",
      "value": "State"
    },
    "COMMON.FACT.SIGNEDBY": {
      "label": "Shared: fact label, \"signed by\" line",
      "kind": "line",
      "section": "Shared",
      "value": "Signed by"
    },
    "FLOW.LABEL": {
      "label": "Flow strip: label",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your identity, in nine steps"
    },
    "FLOW.STEP": {
      "label": "Flow strip: step",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Step {n} of 9 · {label}"
    },
    "FLOW.BACK": {
      "label": "Flow strip: back link",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Back: {label}"
    },
    "FLOW.NEXT": {
      "label": "Flow strip: next",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Next: {label}"
    },
    "FLOW.GOTO": {
      "label": "Flow strip: jump-to-step link",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Step {n}: {label}"
    },
    "FLOW.S1": {
      "label": "Flow strip: step 1",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your FXN ID"
    },
    "FLOW.S2": {
      "label": "Flow strip: step 2",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Signing in"
    },
    "FLOW.S3": {
      "label": "Flow strip: step 3",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Security"
    },
    "FLOW.S4": {
      "label": "Flow strip: step 4",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your identity"
    },
    "FLOW.S5": {
      "label": "Flow strip: step 5",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Your chain"
    },
    "FLOW.S6": {
      "label": "Flow strip: step 6",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Revisions"
    },
    "FLOW.S7": {
      "label": "Flow strip: step 7",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Record"
    },
    "FLOW.S8": {
      "label": "Flow strip: step 8",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "Connections"
    },
    "FLOW.S9": {
      "label": "Flow strip: step 9",
      "kind": "line",
      "section": "The identity flow strip",
      "value": "One identity, many chains"
    },
    "ONE.TITLE": {
      "label": "Chain page: heading",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Sample chain."
    },
    "ONE.ANSWER.ALL": {
      "label": "Chain page: answer line, when every record is signed",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{count}, all signed by your key"
    },
    "ONE.ANSWER.SOME": {
      "label": "Chain page: answer line, when some records are unsigned",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{count}, {s} signed by your key"
    },
    "ONE.COUNT.ONE": {
      "label": "Chain page: count of one record",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "1 record"
    },
    "ONE.COUNT.MANY": {
      "label": "Chain page: count of records",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{n} records"
    },
    "ONE.ROW.REV": {
      "label": "Chain page: record row: revision",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Revision {n}"
    },
    "ONE.LIST": {
      "label": "Chain page: record list name, for screen readers",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Records, newest first"
    },
    "ONE.OF": {
      "label": "Chain page: under the drum: where you are",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{n} of {total}"
    },
    "ONE.TURN.LABEL": {
      "label": "Chain page: drum control: group name",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Turn the chain"
    },
    "ONE.TURN.NEWER": {
      "label": "Chain page: drum control: newer",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newer record"
    },
    "ONE.TURN.OLDER": {
      "label": "Chain page: drum control: older",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Older record"
    },
    "ONE.SECTIONS": {
      "label": "Chain page: section row name, for screen readers",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "About the chosen record"
    },
    "ONE.SEC.RECORD": {
      "label": "Chain page: section: revisions",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Revisions"
    },
    "ONE.SEC.OPEN": {
      "label": "Chain page: section: one record",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "One record"
    },
    "ONE.SEC.LINKS": {
      "label": "Chain page: section: links",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Links"
    },
    "ONE.SEC.TRACE": {
      "label": "Chain page: section: trace",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Trace"
    },
    "ONE.CTA": {
      "label": "Chain page: button",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Open record"
    },
    "ONE.REV.THIS": {
      "label": "Chain page: revisions: this version",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "You are looking at revision {n}."
    },
    "ONE.REV.NOREV": {
      "label": "Chain page: revisions: no revision number",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "This record has no revision number."
    },
    "ONE.REV.EARLIER": {
      "label": "Chain page: revisions: earlier versions",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Revisions {a} to {b} are kept. Nothing is rewritten."
    },
    "ONE.REV.NONE": {
      "label": "Chain page: revisions: no earlier versions",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "No earlier versions."
    },
    "ONE.REV.STEP": {
      "label": "Chain page: revisions: history step",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "{what} by {by}"
    },
    "ONE.OPEN.NOCONTENT": {
      "label": "Chain page: one record: no content",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "No content recorded."
    },
    "ONE.FACT.DATE": {
      "label": "Chain page: one record: fact label, date",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Date"
    },
    "ONE.SIG.SUMMARY": {
      "label": "Chain page: one record: signature disclosure",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "How it is signed"
    },
    "ONE.SIG.TYPE": {
      "label": "Chain page: signature: field 1",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Type"
    },
    "ONE.SIG.TITLE": {
      "label": "Chain page: signature: field 2",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Title"
    },
    "ONE.SIG.DATE": {
      "label": "Chain page: signature: field 3",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Date"
    },
    "ONE.SIG.LINKS": {
      "label": "Chain page: signature: field 4",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Links to"
    },
    "ONE.SIG.SIGNATURE": {
      "label": "Chain page: signature: last field",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signature"
    },
    "ONE.SIG.FIRST": {
      "label": "Chain page: signature: first record links to nothing",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Nothing. It is the first record."
    },
    "ONE.SIG.YOURKEY": {
      "label": "Chain page: signature: your key",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Your key"
    },
    "ONE.SIG.CAPTION": {
      "label": "Chain page: signature: caption",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Its fields in order, then your signature."
    },
    "ONE.SIG.SIGNED": {
      "label": "Chain page: signature: signed line",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signed by {name} on {date}. Anyone with your public key can check it."
    },
    "ONE.SIG.NOTE": {
      "label": "Chain page: signature: what it proves",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "A signature shows who signed. It does not prove the words are true."
    },
    "ONE.SIG.NONE": {
      "label": "Chain page: signature: unsigned",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Not signed. A record counts once its key signs it."
    },
    "ONE.LINKS.G.LINKSTO": {
      "label": "Chain page: links: group, links to",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Links to"
    },
    "ONE.LINKS.G.LINKEDFROM": {
      "label": "Chain page: links: group, linked from",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Linked from"
    },
    "ONE.LINKS.G.RELATED": {
      "label": "Chain page: links: group, related",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Related"
    },
    "ONE.LINKS.G.SIGNEDBY": {
      "label": "Chain page: links: group, signed by",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signed by"
    },
    "ONE.LINKS.BEFORE": {
      "label": "Chain page: links: the record before",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "The record before it"
    },
    "ONE.LINKS.AFTER": {
      "label": "Chain page: links: the record after",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "The record after it"
    },
    "ONE.LINKS.NONE.LINKSTO": {
      "label": "Chain page: links: first record",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Nothing. It is the first record."
    },
    "ONE.LINKS.NONE.LINKEDFROM": {
      "label": "Chain page: links: newest record",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Nothing yet. It is the newest record."
    },
    "ONE.LINKS.NONE.RELATED": {
      "label": "Chain page: links: no related records",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "No related records."
    },
    "ONE.LINKS.NONE.SIGNEDBY": {
      "label": "Chain page: links: unsigned",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Not signed."
    },
    "ONE.LINKS.SIGNEDDATE": {
      "label": "Chain page: links: signed date",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signed on {date}"
    },
    "ONE.TRACE.LEDE": {
      "label": "Chain page: trace: intro",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Follow the links back to the first record: {count}."
    },
    "ONE.TRACE.FIRST": {
      "label": "Chain page: trace: the first record",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "The first record"
    },
    "ONE.TAG.KEY": {
      "label": "Chain page: label drawn in the 3D scene: the chain",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Your chain"
    },
    "ONE.TAG.OLDEST": {
      "label": "Chain page: label drawn in the 3D scene: oldest",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Oldest"
    },
    "ONE.TAG.NEWEST": {
      "label": "Chain page: label drawn in the 3D scene: newest",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newest"
    },
    "ONE.STAT.RECORDS": {
      "label": "Number label: records",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Records"
    },
    "ONE.STAT.SIGNED": {
      "label": "Number label: signed",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Signed"
    },
    "ONE.STAT.NEWEST": {
      "label": "Number label: newest date",
      "kind": "line",
      "section": "Your chain (/chain)",
      "value": "Newest"
    }
  }
});
