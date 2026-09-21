/* The theory's detail pages. The concept page, its routes and the scene state all derive from this list. */
var TheoryContent = (function () {
  var pages = [
    {
      slug: 'purpose', number: '01', cta: 'PURPOSE IN PRACTICE',
      eyebrow: 'THE SUBZERO THEORY / 01', title: 'Give every step a purpose.',
      deck: 'Each page, transition, and pause should help someone discover, understand, or decide. When a step cannot say what it is for, it does not belong yet.',
      points: [
        { h: 'Name the job.', p: 'Before adding a screen or a motion, say what it helps someone do. If the answer is vague, the step is decoration.' },
        { h: 'Pace the path.', p: 'Give people room to take something in before asking for the next move. Pauses are part of the design, not gaps in it.' },
        { h: 'Leave a way forward.', p: 'Every step ends somewhere meaningful: a next idea, a next thing to try, or a clear place to stop.' }
      ],
      next: { label: 'READ THE TUTORIALS', page: 'learnings' }
    },
    {
      slug: 'depth', number: '02', cta: 'DEPTH, EXPLAINED',
      eyebrow: 'THE SUBZERO THEORY / 02', title: 'Make depth accessible.',
      deck: 'Complex ideas deserve thoughtful explanations. People should be able to try things, see what changes, and learn at their own pace, without needing to know the tools first.',
      points: [
        { h: 'Start with something you can touch.', p: 'Show the idea working before explaining it. A control that visibly changes something teaches faster than a definition.' },
        { h: 'Explain in plain language.', p: 'Every number, term, and setting gets a sentence about what it does and what it costs.' },
        { h: 'Let people go deeper by choice.', p: 'The simple version comes first. More detail waits one step below for whoever wants it.' }
      ],
      next: { label: 'TRY THE EXPERIMENTS', page: 'proximity' }
    },
    {
      slug: 'practice', number: '03', cta: 'HOW WE SHARE',
      eyebrow: 'THE SUBZERO THEORY / 03', title: 'Build a shared practice.',
      deck: 'Subzero is a starting point for a community of curious people: designers, learners, and people with something to build. We want to share questions, experiments, and discoveries that make the next experience better.',
      points: [
        { h: 'Share the questions.', p: 'Open questions are worth publishing. Naming what is not understood yet invites other people in.' },
        { h: 'Show the experiments.', p: 'Work in progress teaches more than a finished surface. We explain what we tried and what we learned from it.' },
        { h: 'Leave it better.', p: 'Each discovery should make the next experience easier to build for whoever comes after.' }
      ],
      next: { label: 'MEET THE STUDIO', page: 'about' }
    },
    {
      slug: 'notes', cta: 'START WITH THE NOTES',
      eyebrow: 'THE SUBZERO THEORY / NOTES', title: 'Start with the notes.',
      deck: 'The notes are short written explanations of what we build and what we learn from it, in plain language, for designers, curious beginners, and anyone making something new.',
      points: [
        { h: 'Written to be understood.', p: 'Each note explains one idea and the reasoning behind it.' },
        { h: 'Tied to something you can try.', p: 'Notes point to an experiment, so an idea can be seen working and not only read about.' },
        { h: 'Read what fits your question.', p: 'Pick the note that matches what you are curious about and begin there.' }
      ],
      next: { label: 'OPEN THE TUTORIALS', page: 'learnings' }
    },
    {
      slug: 'studio', cta: 'ABOUT THE STUDIO',
      eyebrow: 'THE SUBZERO THEORY / STUDIO', title: 'About the studio.',
      deck: 'Subzero is an independent design and experimentation studio. We build rich digital experiences with a purpose: to enrich, educate, and make room for discovery.',
      points: [
        { h: 'Thoughtful journeys.', p: 'Every step has a reason. We shape the path, the pace, and the small interactions so people can explore with intention.' },
        { h: 'Carefully crafted.', p: 'Form, motion, words, and behavior work together. The details change how an experience feels and how well it serves someone.' },
        { h: 'Learning belongs here.', p: 'We share experiments and explain what we learn in plain language, so the work leaves people with more than an impression.' }
      ],
      next: { label: 'MORE ABOUT SUBZERO', page: 'about' }
    }
  ];
  function find(slug) { return pages.find(function (page) { return page.slug === slug; }); }
  return { pages: pages, find: find };
})();
