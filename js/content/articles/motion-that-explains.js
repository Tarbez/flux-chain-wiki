/* Loaded only when this article is requested. */
LearningContent.load("motion-that-explains", {
  "sections": [
    [
      "Give change a reference point",
      "Imagine every object in a room being replaced when you walk through the door. Now imagine one familiar object remaining while the room changes around it. That object gives you a reference. In this experiment, the persistent particle form plays that role."
    ],
    [
      "A transformation can carry meaning",
      "The home form is a zero: a place to begin. In the experiment, its points follow intertwined paths that suggest proximity. In the learning pages, they form words. The same material takes on the role of the place you entered.",
      "That does not mean everyone will interpret the shapes in the same way. Labels, headings, and ordinary navigation still explain the destination. Motion supports those signals; it should not be the only way to understand them."
    ],
    [
      "Keep one account of where you are",
      "An interface can hold several pieces of information: which page is open, whether motion is paused, the current title, and the chosen viewing angle. Those pieces need one reliable home. Otherwise, the page can say “article” while the visual still behaves like the experiment.",
      "We use an ARK/Flux state record for that account. The content reads it to decide which page is available. The renderer reads it to choose a target shape. This is useful even outside visual experiments: a menu, a map, or a checkout can also become confusing when different parts disagree about the current step."
    ],
    [
      "Design the journey back",
      "A beautiful arrival is only half a transition. Returning should restore a recognizable place. Press Back while a shape is halfway through its movement. Does it reverse from where it is, or jump somewhere else first? Does a hidden button accidentally keep keyboard focus? These are things you can notice without reading the code.",
      "Browser history matters too. A learning article has its own address in the page hash. Back and Forward should restore the corresponding page, rather than leave the headline, controls, and visual in different states."
    ],
    [
      "Teach through the thing itself",
      "The title above this article is also a small experiment. Change its text and turn it. You are not only reading that a word can be made of particles; you are changing the addresses that make it. The example and explanation live together.",
      "The content comes from a reusable record: title, summary, sections, and a route. Dense Flux patterns pass that record to ARK’s page resolvers. New articles can share the layout and title-generation process without copying an entire page. This makes the publication a foundation for future work, as well as something useful to read today."
    ],
    [
      "Leave room for a quiet experience",
      "Some people want to explore the movement. Others want to read. A pause control, reduced motion, readable headings, and keyboard navigation let both use the same space. The aim is not to make every visit dramatic. It is to make change understandable, and learning possible at the reader’s pace."
    ]
  ],
  "numbers": false
});
