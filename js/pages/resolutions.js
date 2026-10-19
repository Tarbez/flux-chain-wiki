/* Resolutions: the category index (/resolutions) and one page per resolution
   (/resolutions/<slug>, 20 of them), as pages of Ark blocks.

   Converted to data in DEFXN polish Wave 3 (W3-GUIDE). The 20 detail pages are ONE template
   (detailSpec below), fed by js/content/resolutions.js (which resolutions exist, their shift and
   three movements) and js/content/resolution-products.js (who each is for, the problem, the
   products ready today, three proposed ideas). The hand-built pages these replace met the fold
   rule by cutting: on a phone the lede, the Problem row, the main action and the status legend
   were display:none and every product line was clamped to one line with no way to read it
   (docs/ux-audit/pages-ux-b.md "/resolutions/*" P1). Every one of those words is on the page
   now, at every width; what does not fit a phone's first screens folds behind Ark's tabs and
   disclosures, a press away. The two hand-built ARIA tablists (and their missing focus ring),
   the idea rail (a second selection model inside a tab panel), the status mark painted in the
   identity colour, the breadcrumb and the prev/all/next footer are Ark's tabs, accordion, card
   status (an SDK meaning tone), breadcrumb and pager.

   Words: the manifest's words go in as copy: keys (the Content lens edits them in place); the
   structure's words (product lines, ideas, the shift) are read from the content modules above,
   as before. Layout keys: every element of the old pages with words keeps the key it had (the
   `was` pins below, derived from the same structure the old page was built from -- see
   oldKeys()), so a CMS edit saved against an old page still lands. Regression:
   tests/resolutions-blocks.cjs. */
(function () {
  'use strict';

  var groupIntroductions = {
    BUILD: 'Make, publish and keep digital work available without building a server stack around it.',
    VALUE: 'Keep value exchange between the partners involved, with an inspectable trail of agreement and receipt.',
    PEOPLE: 'Coordinate people as peers: shared rules and records without a platform sitting above the group.',
    INTELLIGENCE: 'Put data, logic and provenance in the same resolvable fabric so results can be checked.',
    OPERATIONS: 'Run the connective work of a network without handing its keys or continuity to a cloud account.'
  };
  /* A product's state, said in words beside its name ("Ready" was painted in --primary, the
     identity colour, where /resolvers paints deployed green: docs/ux-audit/pages-ux-b.md
     cross-page #8). The tab's first line says what each state means. */
  var STATUS = { ready: { label: 'Ready' }, building: { label: 'Building' } };
  var STEP_NAMES = ['Define', 'Publish', 'Resolve'];

  function words(role) { return ArkCopy.text('RESOLUTIONS.' + role); }
  function short(item) { return ArkResolutions.shortName(item.title); }
  function two(n) { return String(n).padStart(2, '0'); }
  function lower(text) { return text.charAt(0).toLowerCase() + text.slice(1); }

  /* ---- layout-key pins ------------------------------------------------------------------- */
  /* `was`: the key each element had on the hand-built pages, so a CMS edit saved against them
     still lands (docs/cms-architecture.md "Layout keys"). Derived from the same structure the old
     pages were built from (one crumb trail, one intro, one tile per ready product -- a link tile
     when the product has a page, a plain one when not -- one legend, one footer), never typed per
     page: 20 pages, one rule. tests/resolutions-blocks.cjs proves every old key of every page
     against its frozen census (tests/fixtures/layout-keys/resolutions*.tsv). */
  var CRUMBS_WAS = { ':root': 'page:/nav:1', 'breadcrumb-item': 'page:/nav:1/a:1', 'breadcrumb-item#2': 'page:/nav:1/span:1' };
  function indexWas(groups) {
    var list = 'page:/section:1/div:2/div:2', domains = {
      ':root': { key: 'page:/section:1', self: true }, 'tabs-list': { key: 'page:/section:1/div:1', self: true },
      'tabs-content': { key: 'id:resolution-domain-panel', self: true },
      ':scope > div:nth-of-type(2) > p:nth-of-type(1)': 'page:/section:1/div:2/div:1/p:1',
      'card-grid': { key: list, self: true }
    };
    groups.forEach(function (group, i) { domains['tabs-trigger' + (i ? '#' + (i + 1) : '')] = 'id:resolution-domain-' + group.key.toLowerCase(); });
    /* the old panel showed the first domain: one entry link per resolution */
    groups[0].items.forEach(function (item, i) {
      var n = i ? '#' + (i + 1) : '', entry = list + '/a:' + (i + 1);
      domains[':scope > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(' + (i + 1) + ')'] = { key: entry, self: true };
      domains['card' + n] = entry + '/span:2';
      domains['card-title' + n] = entry + '/span:2/strong:1';
      domains['card-description' + n] = entry + '/span:2/span:1';
    });
    return {
      'resolutions-crumbs': CRUMBS_WAS,
      'resolutions-hero': { ':root': { key: 'page:/header:1', self: true }, eyebrow: { key: 'page:/header:1/div:1/p:1', self: true },
        ':scope > p:nth-of-type(1) > span:nth-of-type(1)': 'page:/header:1/dl:1', 'hero-title': 'id:resolutions-title' },
      'resolutions-deck': { ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/header:1/div:1/p:2', 'disclosure-trigger': 'page:/header:1/div:1/button:1' },
      'resolutions-domains': domains,
      'resolutions-note-text': { ':root': { key: 'page:/aside:1', self: true }, ':scope > div:nth-of-type(1) > p:nth-of-type(1)': 'page:/aside:1/p:1',
        'disclosure-trigger': 'page:/aside:1/button:1', 'button': 'page:/aside:1/a:1' },
      insert: 'page:/div:1'
    };
  }
  function detailWas(item, shelf, hasAlso, related) {
    var id = 'resolution-' + item.slug, intro = 'page:/div:1/header:1', shelfKey = 'page:/div:1/section:1', was = {};
    was[id + '-crumbs'] = CRUMBS_WAS;
    was[id + '-hero'] = { ':root': { key: intro, self: true }, eyebrow: { key: intro + '/p:1', self: true }, 'hero-title': 'id:resolution-title-' + item.slug,
      'hero-lede': intro + '/p:2', 'actions': { key: intro + '/div:1', self: true }, 'button': intro + '/div:1/a:1' };
    var pager = { ':root': { key: 'page:/nav:2', self: true }, 'pager-prev': 'page:/nav:2/a:1', 'pager-next': 'page:/nav:2/a:3' };
    var link = function (n) { return ':scope > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(' + n + ') > a:nth-of-type(1)'; };
    if (hasAlso) pager[link(1)] = intro + '/div:1/a:2';
    pager[link(related - 1)] = 'page:/nav:2/a:2';
    pager[link(related)] = shelfKey + '/p:1/a:1';
    if (shelf) {
      was[id + '-brief'] = { 'facts': intro + '/dl:1' };
      var tabs = {
        ':root': { key: shelfKey, self: true }, 'tabs-list': { key: shelfKey + '/div:1', self: true },
        'tabs-trigger': 'id:resolution-level-tab-' + item.slug + '-0', 'tabs-trigger#2': 'id:resolution-level-tab-' + item.slug + '-1', 'tabs-trigger#3': 'id:resolution-level-tab-' + item.slug + '-2',
        'tabs-content': { key: 'id:resolution-level-' + item.slug, self: true },
        ':scope > div:nth-of-type(2) > p:nth-of-type(1)': shelfKey + '/p:1',
        ':scope > div:nth-of-type(3) > p:nth-of-type(1)': shelfKey + '/p:1/span:3',
        'accordion': { key: shelfKey + '/div:2/div:1', self: true }
      };
      var seen = { a: 0, div: 0 };
      shelf.ready.forEach(function (product, i) {
        var linked = !!(product.page && ArkUI.pageCatalog[product.page]), tag = linked ? 'a' : 'div';
        var tile = shelfKey + '/div:2/div:1/' + tag + ':' + (++seen[tag]), n = i ? '#' + (i + 1) : '';
        var body = ':scope > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(' + (i + 1) + ') > div:nth-of-type(1) > div:nth-of-type(1)';
        tabs['accordion-item' + n] = { key: tile, self: true };
        /* self: the row title's inner spans are new; the old head's name and state spans are retired */
        tabs['accordion-trigger' + n] = { key: tile + '/span:1', self: true };
        tabs[body + ' > p:nth-of-type(1)'] = tile + '/span:2';
        if (linked) tabs[body + ' > div:nth-of-type(1) > a:nth-of-type(1)'] = tile + '/span:3';
      });
      was[id + '-shelf'] = tabs;
    }
    was[id + '-pager'] = pager;
    was.insert = 'page:/div:2';
    return was;
  }

  /* ---- the index ------------------------------------------------------------------------- */
  function indexSpec() {
    var groups = ArkResolutions.list(), all = ArkResolutions.all(), was = indexWas(groups);
    return [
      { block: 'breadcrumb', id: 'resolutions-crumbs', was: was['resolutions-crumbs'], props: { label: 'Your place', items: [{ label: 'Home', href: words('BACK.HOME.HREF') }, { label: 'Resolutions' }] } },
      /* The stat triplet (20 resolutions, 05 domains, 01 mesh) was a row of its own; it is the
         eyebrow's tail now (docs/ux-audit/pages-ux-b.md /resolutions P2), counted from the structure,
         never typed. */
      { block: 'hero', id: 'resolutions-hero', was: was['resolutions-hero'], props: { eyebrow: words('EYEBROW') + ' · ' + two(all.length) + ' resolutions · ' + two(groups.length) + ' domains · 01 mesh',
        title: 'copy:RESOLUTIONS.TITLE', density: 'compact' } },
      /* The deck is whole from 601px up; a phone keeps its first line in view and offers "More"
         (it used to end in "..." with no way to read the rest; tests/fold-no-hidden-content.cjs). */
      { block: 'disclosure', id: 'resolutions-deck', was: was['resolutions-deck'], props: { content: 'copy:RESOLUTIONS.DECK', foldBelow: 'phone', preview: 1, more: 'More', less: 'Less' } },
      /* The domains as tabs, named on every width (phones showed "01 02 03 04 05"). */
      { block: 'tabs', id: 'resolutions-domains', was: was['resolutions-domains'], props: { label: 'Resolution domains', items: groups.map(function (group) {
        return { value: group.key.toLowerCase(), label: group.title + ' · ' + group.items.length,
          content: groupIntroductions[group.key], blocks: [
          { block: 'card-grid', props: { label: group.title, columns: 3, items: group.items.map(function (item) {
            return { title: short(item), description: item.text, href: 'route:resolutions/' + item.slug, headingLevel: 2 };
          }) } }
        ] };
      }) } },
      /* The status note and the way to the status page: whole from 601px up; a phone keeps the
         note's first line in view and opens the rest with "More" (a one-line clamp used to cut it
         mid-sentence, with no way to read on). */
      { block: 'disclosure', id: 'resolutions-note-text', was: was['resolutions-note-text'], props: { content: 'copy:RESOLUTIONS.NOTE', foldBelow: 'phone', preview: 1, more: 'More', less: 'Less',
        blocks: [{ block: 'actions', props: { label: 'Status', items: [{ label: 'copy:RESOLUTIONS.NOTE.LINK', href: words('NOTE.LINK.HREF'), tone: 'ghost' }] } }] } },
      { insert: 'main', was: was.insert }
    ];
  }

  /* ---- one resolution -------------------------------------------------------------------- */
  function detailSpec(item) {
    var all = ArkResolutions.all();
    var position = all.findIndex(function (candidate) { return candidate.slug === item.slug; });
    var group = ArkResolutions.groupFor(item.group);
    var previous = all[(position - 1 + all.length) % all.length];
    var next = all[(position + 1) % all.length];
    var shelf = typeof ArkResolutionProducts !== 'undefined' ? ArkResolutionProducts.forResolution(item.key) : null;
    var id = 'resolution-' + item.slug;

    /* One main action; the deeper page beside it (`also`) is a related page in the pager, so the
       hero keeps one row of buttons on a phone. */
    var main = item.start && ArkUI.pageCatalog[item.start]
      ? { label: 'copy:RESOLUTIONS.START', href: 'route:' + item.start, tone: 'primary' }
      : { label: 'How resolvers work', href: words('START.FALLBACK.HREF'), tone: 'primary' };
    var related = [];
    if (item.also && ArkUI.pageCatalog[item.also]) related.push({ label: String(ArkUI.pageCatalog[item.also].title).split(' — ')[0], href: 'route:' + item.also });
    related.push({ label: 'All 20', href: words('INDEX.HREF') }, { label: 'copy:RESOLUTIONS.NOTE.LINK', href: words('NOTE.LINK.HREF') });
    var was = detailWas(item, shelf, related.length === 3, related.length);

    /* the shift, then its three movements */
    var how = { content: 'The shift: ' + lower(item.shift) + ' Instead of ' + lower(item.old),
      blocks: [{ block: 'steps', props: { label: 'How it resolves', items: item.steps.map(function (step, i) { return { title: STEP_NAMES[i], body: step }; }) } }] };

    var spec = [
      { block: 'breadcrumb', id: id + '-crumbs', was: was[id + '-crumbs'], props: { label: 'Your place', items: [{ label: 'All resolutions', href: words('INDEX.HREF') }, { label: short(item) }] } },
      { block: 'hero', id: id + '-hero', was: was[id + '-hero'], props: { eyebrow: 'Resolution ' + (position + 1) + ' of ' + all.length + ' · ' + group.title, title: 'copy:RESOLUTIONS.' + item.key + '.TITLE',
        lede: 'copy:RESOLUTIONS.' + item.key + '.TEXT', density: 'compact', actions: [main] } }
    ];
    if (shelf) {
      /* Who it is for and the problem: in sight from 601px up; on a phone one press away
         ("Who it is for"), never removed -- it used to be display:none there. */
      spec.push({ block: 'disclosure', id: id + '-brief', was: was[id + '-brief'], props: { foldBelow: 'phone', more: 'Who it is for, and the problem', less: 'Hide who it is for',
        blocks: [{ block: 'facts', props: { label: 'Who it is for', columns: 1, items: [{ term: 'For', value: shelf.audience }, { term: 'Problem', value: shelf.problem }] } }] } });
      spec.push({ block: 'tabs', id: id + '-shelf', was: was[id + '-shelf'], props: { label: 'Products, ideas and how it works', items: [
        /* each product opens in place (its line, and its page when it has one): a row per
           product keeps five products inside a phone's fold, where cards took two screens */
        { value: 'ready', label: 'Ready now · ' + shelf.ready.length, content: 'Ready: usable today. Building: in source, not released.', blocks: [
          { block: 'accordion', props: { label: short(item) + ' products', multiple: true, headingLevel: 3, items: shelf.ready.map(function (product) {
            var target = product.page && ArkUI.pageCatalog[product.page] ? product.page : null;
            var row = { value: product.key, title: product.name + ' · ' + (STATUS[product.status] || STATUS.building).label, content: product.line };
            if (target) row.blocks = [{ block: 'actions', props: { items: [{ label: 'Open ' + product.name, href: 'route:' + target, tone: 'ghost' }] } }];
            return row;
          }) } }
        ] },
        { value: 'ideas', label: 'Product ideas · ' + shelf.ideas.length, content: 'Ideas: proposed, not built.', blocks: [
          { block: 'accordion', props: { label: 'Product ideas', headingLevel: 3, items: shelf.ideas.map(function (idea, i) {
            return { value: 'idea-' + (i + 1), title: idea.name, content: 'Idea ' + two(i + 1) + ' · not built yet. For ' + lower(idea.audience),
              blocks: [{ block: 'facts', props: { label: idea.name, columns: 1, items: [
                { term: 'Problem', value: idea.problem }, { term: 'Product', value: idea.product },
                { term: 'Builds on', value: idea.builds.map(function (p) { return p.name + (p.status === 'ready' ? '' : ' (building)'); }).join(' · ') }] } }] };
          }) } }
        ] },
        { value: 'how', label: 'How it resolves', content: how.content, blocks: how.blocks }
      ] } });
    } else {
      spec.push({ block: 'section-header', id: id + '-how', props: { title: 'How it resolves', lede: how.content } }, how.blocks[0]);
    }
    spec.push({ insert: 'main', was: was.insert });
    spec.push({ block: 'pager', id: id + '-pager', was: was[id + '-pager'], props: { label: 'More resolutions',
      prev: { label: short(previous), href: 'route:resolutions/' + previous.slug },
      next: { label: short(next), href: 'route:resolutions/' + next.slug },
      related: related } });
    return spec;
  }

  ArkUI.pageModules.resolutions = {
    indexSpec: indexSpec,
    detailSpec: detailSpec,
    mount: function (host, pageKey) {
      var slug = String(pageKey || '').indexOf('resolutions/') === 0 ? String(pageKey).slice('resolutions/'.length) : '';
      var item = slug ? ArkResolutions.find(slug) : null;
      var page = item
        ? ArkUI.page(detailSpec(item), host, { page: pageKey, tag: 'article', titleId: 'resolution-title-' + item.slug, terms: 'first-use' })
        : ArkUI.page(indexSpec(), host, { page: 'resolutions', titleId: 'resolutions-title', terms: 'first-use' });
      if (item) page.dataset.resolutionGroup = item.group.toLowerCase();
      return page;
    }
  };
})();
