/* One page's copy. Edit it in admin.html, or by hand: keep the object valid JSON. */
ArkManifest.define({
  "id": "deployment",
  "title": "How DEFXN works",
  "route": "/how-deployment-works",
  "group": "page",
  "meta": {
    "next": "download",
    "back": "resolver",
    "primary": true
  },
  "fields": {
    "EYEBROW": {
      "label": "Eyebrow",
      "kind": "line",
      "section": "Page",
      "value": "DEFXN / HOW IT WORKS"
    },
    "TITLE": {
      "label": "Heading",
      "kind": "line",
      "section": "Page",
      "value": "From a network ID to a verifiable receipt."
    },
    "BODY1": {
      "label": "First paragraph",
      "kind": "text",
      "section": "Page",
      "value": "1. Register or select a named network ID. Today this creates a miner-presence namespace, not a complete security boundary."
    },
    "BODY2": {
      "label": "Second paragraph",
      "kind": "text",
      "section": "Page",
      "value": "2. Publish or select the addressed resolver logic that defines the input and claim. Publication alone does not establish active execution capacity."
    },
    "BODY3": {
      "label": "Third paragraph",
      "kind": "text",
      "section": "Page",
      "value": "3. Open an intent describing the work and constraints. A provider can answer with an offer, but no agreement exists until terms are accepted."
    },
    "BODY4": {
      "label": "Fourth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "4. Accept the offer, execute the resolver, and submit fulfillment evidence through the signed agreement path."
    },
    "BODY5": {
      "label": "Fifth paragraph",
      "kind": "text",
      "section": "Page",
      "value": "5. Verify the receipt under the identified checker and authority rules. A receipt records that decision; it is not universal truth or proof of production readiness."
    },
    "NEXT": {
      "label": "Main button",
      "kind": "line",
      "section": "Links",
      "value": "Run DEFXN from source"
    },
    "BACK": {
      "label": "Back link",
      "kind": "line",
      "section": "Links",
      "value": "What is a resolver?"
    },
    "SUMMARY": {
      "label": "Primary answer",
      "kind": "text",
      "section": "Story",
      "value": "DEFXN runs work through addressed logic and signed agreements. Register a named network, choose a resolver, agree on terms, submit work evidence, and verify the receipt under the applicable rules."
    },
    "BOUNDARY": {
      "label": "Essential boundary",
      "kind": "text",
      "section": "Story",
      "value": "Named-network isolation currently covers miner presence only. Publication does not establish active execution capacity; public production activation remains unverified."
    },
    "FABRIC.NETWORK": {
      "label": "Network fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A name for miner presence."
    },
    "FABRIC.LOGIC": {
      "label": "Logic fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "Inputs and claims meet at an addressed resolver."
    },
    "FABRIC.INTENT": {
      "label": "Intent fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "A request waits for an offer and accepted terms."
    },
    "FABRIC.FULFILLMENT": {
      "label": "Fulfillment fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "Signed evidence joins the agreement trail."
    },
    "FABRIC.RECEIPT": {
      "label": "Receipt fabric explanation",
      "kind": "line",
      "section": "Story",
      "value": "An outcome is recorded under identified rules."
    },
    "SIMPLE.TITLE": {
      "label": "Title",
      "kind": "line",
      "section": "Simple story",
      "value": "One request. One agreement. One verifiable result."
    },
    "SIMPLE.INTRO": {
      "label": "Intro",
      "kind": "text",
      "section": "Simple story",
      "value": "DEFXN keeps the request, accepted terms, returned work, and verification connected."
    },
    "SIMPLE.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "line",
      "section": "Simple story",
      "value": "State the request"
    },
    "SIMPLE.ASK.TEXT": {
      "label": "Ask Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Name the work, the result you expect, and the limits that matter."
    },
    "SIMPLE.ASK.ACTION": {
      "label": "Ask action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore the request"
    },
    "SIMPLE.WORK.TITLE": {
      "label": "Work Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Agree on the terms"
    },
    "SIMPLE.WORK.TEXT": {
      "label": "Work Text",
      "kind": "text",
      "section": "Simple story",
      "value": "A provider proposes terms. Work begins after both sides accept the same promise."
    },
    "SIMPLE.WORK.ACTION": {
      "label": "Work action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore the agreement"
    },
    "SIMPLE.CHECK.TITLE": {
      "label": "Check Title",
      "kind": "line",
      "section": "Simple story",
      "value": "Verify the result"
    },
    "SIMPLE.CHECK.TEXT": {
      "label": "Check Text",
      "kind": "text",
      "section": "Simple story",
      "value": "Return the work with evidence, check it against the agreement, and record the outcome."
    },
    "SIMPLE.CHECK.ACTION": {
      "label": "Check action",
      "kind": "line",
      "section": "Simple story",
      "value": "Explore verification"
    },
    "SIMPLE.BOUNDARY": {
      "label": "Boundary",
      "kind": "text",
      "section": "Simple story",
      "value": "Named networks currently scope miner presence only. Public production activation remains unverified."
    },
    "SIMPLE.CONTEXT": {
      "label": "Context disclosure",
      "kind": "line",
      "section": "Simple story",
      "value": "Context / see the complete agreement path"
    },
    "SIMPLE.PATH": {
      "label": "Lifecycle context",
      "kind": "text",
      "section": "Simple story",
      "value": "The full path records intent, offer, agreement, fulfillment, and receipt."
    },
    "CHAPTER.ASK.TITLE": {
      "label": "Ask Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Tell them what you need."
    },
    "CHAPTER.ASK.INTRO": {
      "label": "Ask Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A clear request gives someone a job they can understand."
    },
    "CHAPTER.ASK.JOB": {
      "label": "Ask Job",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Make a copy of these files."
    },
    "CHAPTER.ASK.CHOICE1": {
      "label": "Ask Choice1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The job"
    },
    "CHAPTER.ASK.CHOICE2": {
      "label": "Ask Choice2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "A good result"
    },
    "CHAPTER.ASK.CHOICE3": {
      "label": "Ask Choice3",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The limits"
    },
    "CHAPTER.ASK.DETAIL1": {
      "label": "Ask Detail1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Say which saved version of the files should be copied. That keeps everyone talking about the same job."
    },
    "CHAPTER.ASK.DETAIL2": {
      "label": "Ask Detail2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Explain what the finished copy should contain, so the result can be checked later."
    },
    "CHAPTER.ASK.DETAIL3": {
      "label": "Ask Detail3",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Include any conditions the work must follow. A request is only the starting point; nobody has agreed to help yet."
    },
    "CHAPTER.WORK.TITLE": {
      "label": "Work Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Make the same promise."
    },
    "CHAPTER.WORK.INTRO": {
      "label": "Work Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "An offer is a suggestion. An agreement means you both accept the same terms."
    },
    "CHAPTER.WORK.CHOICE1": {
      "label": "Work Choice1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Your request"
    },
    "CHAPTER.WORK.CHOICE2": {
      "label": "Work Choice2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Their offer"
    },
    "CHAPTER.WORK.DETAIL1": {
      "label": "Work Detail1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Your request says what you want and which conditions matter."
    },
    "CHAPTER.WORK.DETAIL2": {
      "label": "Work Detail2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The helper proposes the terms. Once you both accept the match, the work and its evidence must follow those terms."
    },
    "CHAPTER.WORK.JOIN": {
      "label": "Work Join",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The same job. The same rules."
    },
    "CHAPTER.CHECK.TITLE": {
      "label": "Check Title",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Look at what came back."
    },
    "CHAPTER.CHECK.INTRO": {
      "label": "Check Intro",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Finishing the job and checking it are two different steps."
    },
    "CHAPTER.CHECK.CHOICE1": {
      "label": "Check Choice1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The promise"
    },
    "CHAPTER.CHECK.CHOICE2": {
      "label": "Check Choice2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The result"
    },
    "CHAPTER.CHECK.CHOICE3": {
      "label": "Check Choice3",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The decision"
    },
    "CHAPTER.CHECK.DETAIL1": {
      "label": "Check Detail1",
      "kind": "text",
      "section": "How it works chapters",
      "value": "Start with the rules everyone agreed to. They say what the result should be checked against."
    },
    "CHAPTER.CHECK.DETAIL2": {
      "label": "Check Detail2",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The helper shares what they produced and the supporting evidence required by the agreement. Sharing a result does not mean it has passed."
    },
    "CHAPTER.CHECK.DETAIL3": {
      "label": "Check Detail3",
      "kind": "text",
      "section": "How it works chapters",
      "value": "The checking participant records an outcome under the identified rules. That decision can be followed back to the work and the original request."
    }
  }
});
