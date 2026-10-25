/* DEFXN identity card: the INTERFACE VOCABULARY. What each card piece does in an interface, which
   interface elements it may dress, and the claim it must never change.

   The owner's frame (2026-10-24): every interface element makes a claim. A card means a bounded concept, a
   progress bar measures something, a toast fires only when the system truly succeeded. A skin may change how
   an element looks. It may never change what the element claims. The element list below is the owner's own
   vocabulary, in its eight groups; it is a vocabulary, not a shopping menu.

   DefxnVocabulary.GROUPS    the owner's eight groups: { key, name, elements: [{ name, claim }] }
   DefxnVocabulary.PIECES    each card piece by its interface name (traits.js UI_NAMES): what it does, the
                             elements it may dress, and the claim it keeps
   DefxnVocabulary.MOTION    what a timeline may move, and the claim it keeps
   The claims that can be measured are checked on every wear by the audit (WEAR-AUDIT.md, loop 4): words,
   values and meaning colours stay; nothing new can take focus; every drawn piece is hidden from assistive
   technology. Works in the browser (window.DefxnVocabulary) and in Node (globalThis). */
(function (root) {
  'use strict';

  function g(key, name, list) { return { key: key, name: name, elements: list.map(function (x) { return { name: x[0], claim: x[1] }; }) }; }
  var GROUPS = [
    g('layout', 'Layout and structure', [
      ['Containers', 'these things belong together'], ['Grid systems', 'these line up'], ['Panels', 'this is secondary content'],
      ['Cards', 'one cohesive concept'], ['Dividers', 'the context changes here'], ['Accordions', 'more detail is folded here'],
      ['Tabs', 'equal views, one shown'], ['Masonry', 'equal importance, different lengths'], ['Carousels', 'more lies to the side'],
      ['Split views', 'two related views side by side'], ['Modals', 'this needs your attention now'], ['Drawers', 'temporary context, the page stays'],
      ['Popovers', 'tied to what opened it'], ['Tooltips', 'context you need, kept out of the way']]),
    g('navigation', 'Navigation', [
      ['Navbars', 'the map of the whole site'], ['Navigation rails', 'the map of a complex app'], ['Breadcrumbs', 'the exact path back'],
      ['Tab bars', 'the main places, in reach of a thumb'], ['Pagination', 'discrete pages in order'], ['Infinite scroll', 'more follows'],
      ['Steppers', 'required steps in order'], ['Dropdown menus', 'hidden options'], ['Context menus', 'options for this item'],
      ['Mega menus', 'a deep map'], ['Skip links', 'jump past the navigation'], ['Search bars', 'this searches everything'],
      ['Command palettes', 'every action by keyboard'], ['Back and forward', 'your history']]),
    g('input', 'Input and forms', [
      ['Text fields', 'short text'], ['Text areas', 'long text'], ['Password fields', 'hidden, secure'], ['Checkboxes', 'many can be true'],
      ['Radio buttons', 'one can be true'], ['Toggle switches', 'it changes now'], ['Selects', 'choose one'], ['Sliders', 'a value in a range'],
      ['Date and time pickers', 'an exact time'], ['File uploads', 'files are accepted here'], ['Colour pickers', 'a colour'],
      ['Number steppers', 'a number by steps'], ['Autocomplete', 'suggestions as you type'], ['Code inputs', 'a secure code in order'],
      ['Ratings', 'how you feel'], ['Input chips', 'separate tokens']]),
    g('display', 'Display and data', [
      ['Tables', 'rows and columns of data'], ['Data grids', 'data you can sort and filter'], ['Lists', 'items in order or in a group'],
      ['Avatars', 'who this is'], ['Badges', 'a status or a count'], ['Chips', 'a category'], ['Icons', 'a function or a category'],
      ['Progress bars', 'how much is done'], ['Skeletons', 'content is loading'], ['Charts', 'what the data does'], ['Heatmaps', 'where it is dense'],
      ['Maps', 'where it is'], ['Timelines', 'when it happened'], ['Tree views', 'what contains what'], ['Kanban boards', 'which state each task is in']]),
    g('feedback', 'Feedback and status', [
      ['Alerts', 'this matters'], ['Toasts', 'that action finished'], ['Inline validation', 'this field is wrong'], ['Empty states', 'nothing here yet, and what to do'],
      ['Loaders', 'the system is working'], ['Confirmations', 'are you sure'], ['Error boundaries', 'it failed, safely']]),
    g('media', 'Media and content', [
      ['Images', 'a picture'], ['Video players', 'time-based content'], ['Audio players', 'sound'], ['Embeds', 'content from elsewhere'], ['Code blocks', 'technical content']]),
    g('motion', 'Motion and transitions', [
      ['Micro-interactions', 'it responded to you'], ['Page transitions', 'you moved'], ['Shared element transitions', 'this is the same thing'],
      ['Scroll animations', 'this is revealed in order'], ['Staggered entrances', 'these arrived together, in order']]),
    g('game', 'Game elements', [
      ['HUDs', 'your state, always'], ['Minimaps', 'where you are'], ['Reticles', 'what you aim at'], ['Virtual controls', 'move here'],
      ['Inventory grids', 'what you hold'], ['Dialogue boxes', 'someone speaks'], ['Quest logs', 'your goals'], ['Floating text', 'that just happened'],
      ['Diegetic UI', 'part of the world'], ['Spatial UI', 'a menu in the space']])
  ];

  // each card piece, by its interface name: what it does, what it may dress, and what it must keep true
  var PIECES = {
    palette: { does: 'the colours every part reads', dresses: ['Containers', 'Cards', 'Navbars', 'Text fields', 'Charts', 'HUDs'],
      keeps: 'Meaning colours stay the site\'s: alerts, validation, status, success, danger, chain kinds and networks.' },
    background: { does: 'the scene behind content. How much it builds sets how strongly the page takes the card\'s hue.', dresses: ['Containers', 'Panels', 'Cards', 'Empty states', 'Spatial UI', 'HUDs'],
      keeps: 'It sits behind words only with the fade that keeps their contrast, every text colour passes 4.5:1 on every surface, and it never stands for data.' },
    glow: { does: 'light around what is in focus. Raised parts cast its colour. It sets how light the page is.', dresses: ['Micro-interactions', 'Tabs', 'Popovers', 'Modals', 'Dropdown menus', 'Inventory grids', 'Diegetic UI'],
      keeps: 'It never stands for a state: a glow is not success, error or live.' },
    logo: { does: 'the identity mark in the card\'s style', dresses: ['Avatars', 'Loaders', 'Error boundaries', 'Empty states'],
      keeps: 'It never replaces the site\'s own mark, and a loading mark shows only while something loads.' },
    beam: { does: 'beams and flares', dresses: ['Loaders', 'Page transitions', 'Steppers', 'Timelines', 'Floating text'],
      keeps: 'It never fills a progress bar past its value, and a sweep runs only during a real transition.' },
    particles: { does: 'small points of light', dresses: ['Panels', 'Empty states', 'Staggered entrances', 'Floating text'],
      keeps: 'It never stands for data: no particle field is a chart or a heatmap.' },
    corner: { does: 'marks at a surface\'s corners', dresses: ['Cards', 'Panels', 'Modals', 'Drawers', 'Reticles', 'HUDs'],
      keeps: 'It never covers a control\'s hit area or its focus ring.' },
    frame: { does: 'the outline around a surface. Its line sets the headings\' voice: straight is mono, mixed is sans, curved keeps the display face. Its corner shapes the focus ring\'s corner.', dresses: ['Containers', 'Cards', 'Panels', 'Modals', 'Drawers', 'Popovers', 'Tooltips', 'Code blocks', 'Inventory grids', 'Dialogue boxes'],
      keeps: 'It keeps to the edge, never draws over content, and frames only what the site already groups. A voice picks one of the site\'s three faces: the words, their size and their order stay.' },
    nameplate: { does: 'a small labelled shape on a surface\'s top edge. Its letter spacing becomes the eyebrows\' spacing and sets the headings\'.', dresses: ['Cards', 'Panels', 'Dialogue boxes', 'Quest logs', 'Avatars', 'Breadcrumbs'],
      keeps: 'It shows the wearer\'s own name and number only, and never invents a status, a count or "new".' },
    'accent-strip': { does: 'a decorative strip after a title or before items', dresses: ['Tabs', 'Cards', 'Panels', 'Quest logs'],
      keeps: 'It sits after a heading, so it never reads as a divider that claims a change of context.' },
    divider: { does: 'a rule between sections', dresses: ['Dividers', 'Breadcrumbs', 'Pagination', 'Steppers', 'Timelines', 'Lists', 'HUDs'],
      keeps: 'It goes only where the site already separates, so it never adds a change of context.' },
    icon: { does: 'the card\'s own small symbol. Its ink sets the headings\' weight, and it marks the wearer\'s seal.', dresses: ['Lists', 'Empty states', 'Inventory grids', 'Avatars', 'Ratings'],
      keeps: 'It is decoration only: it never replaces an action icon or a status icon, and a rating keeps its value.' }
  };

  var MOTION = { moves: ['Micro-interactions', 'Page transitions', 'Staggered entrances', 'Scroll animations'],
    keeps: 'Every timeline ends within 1.2 s, never fades on the site, jumps to its end under reduced motion, and a loader moves only while something loads.' };

  root.DefxnVocabulary = { GROUPS: GROUPS, PIECES: PIECES, MOTION: MOTION };
})(typeof window !== 'undefined' ? window : globalThis);
