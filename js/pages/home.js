/* A shared story first; audience-specific routes are disclosed on demand.
   Existing fabric, theme roles and scene lifecycle own the brand and motion. */
ArkUI.pageModules.zero = {
  mount: function (host) {
    var homeCopy = ArkManifest.get('home').fields;
    function node(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function link(label, route, cls) {
      var e = node('a', cls || 'hl-link', label);
      e.href = '#' + ArkUI.pageCatalog[route].path;
      e.dataset.sceneLink = route;
      return e;
    }
    // Icons come from the shared set (js/ark/icons.js); the label always carries the meaning.
    function iconize(e, name, after) {
      var svg = ArkUI.icon && ArkUI.icon(name);
      if (!svg) return e;
      e.classList.add('has-native-icon');
      if (after) e.appendChild(svg); else e.insertBefore(svg, e.firstChild);
      return e;
    }
    function label(text, iconName) { var e = node('p', 'hl-label', text); return iconName ? iconize(e, iconName) : e; }
    function section(index, title, intro, iconName) {
      var e = node('section', 'hl-section');
      var head = node('div', 'hl-section-head');
      head.appendChild(label(index, iconName));
      var copy = node('div');
      copy.appendChild(node('h2', '', title));
      if (intro) copy.appendChild(node('p', 'hl-deck', intro));
      head.appendChild(copy); e.appendChild(head);
      return e;
    }
    var el = node('section', 'ark-page home-launch');
    el.dataset.arkPage = 'zero';
    el.setAttribute('aria-labelledby', 'hl-title');
    host.appendChild(el);

    // Law 18 ("one scroll, then it ends") + law 8 ("calm is functional"):
    // the hero is the only thing that gets full, always-visible weight.
    // Everything that used to be its own full section (audience picker,
    // architecture, evidence, FAQ) now lives inside one closed-by-default
    // disclosure below -- collapsed, it costs a few px, not 3x the
    // viewport. The two animations stay exactly as they were; what's cut
    // is the chrome AROUND them (the "01 / Inside the mesh" label, the
    // separate illustration caption, the decorative action-note line next
    // to the CTA) -- noise, not content.
    var hero = node('section', 'hl-hero');
    var copy = node('div', 'hl-hero-copy');
    var world = ArkUI.buildChainWorld ? ArkUI.buildChainWorld({ caseId: 'transfers' }) : null;
    if (world) copy.appendChild(world.element);
    copy.appendChild(label(homeCopy.EYEBROW.value, 'world'));
    var heading = node('h1', 'hl-title'); heading.id = 'hl-title';
    homeCopy.TITLE.value.split('\n').forEach(function (text, i) { heading.appendChild(node('span', i === 0 ? 'hl-title-negation' : '', text)); });
    copy.appendChild(heading);
    copy.appendChild(node('p', 'hl-intro', homeCopy.INTRO.value));
    var heroActions = node('div', 'hl-actions');
    var learn = link(homeCopy.CTA.value, 'deployment', 'hl-button palette-solid');
    learn.dataset.sceneLink = 'deployment';
    iconize(learn, 'arrow-right', true); heroActions.appendChild(learn);
    copy.appendChild(heroActions); hero.appendChild(copy);

    var instrument = node('section', 'hl-instrument hl-chain-hero hl-instrument-quiet');
    instrument.setAttribute('aria-label', 'Illustrated chain walkthrough');
    // One button per example, each with its own icon: the examples differ, so the choice should look it.
    var caseIcons = { swaps: 'swap', transfers: 'transfer', staking: 'stake', governance: 'vote' };
    var casePicker = node('div', 'hl-case-picker'); casePicker.setAttribute('role', 'group'); casePicker.setAttribute('aria-label', 'Choose an illustrated example');
    var caseButtons = [], currentCase = 'transfers';
    ArkUI.chainCases.forEach(function (item) {
      var button = iconize(node('button', 'hl-case', item.label), caseIcons[item.id]);
      button.type = 'button'; button.dataset.case = item.id;
      button.addEventListener('click', function () { if (currentCase !== item.id) { currentCase = item.id; mountHeroFlow(); } });
      caseButtons.push(button); casePicker.appendChild(button);
    });
    instrument.appendChild(casePicker);
    var flowHost = node('div', 'hl-flow-host'), heroFlow;
    instrument.appendChild(flowHost);
    function mountHeroFlow() {
      if(heroFlow)heroFlow.dispose();
      flowHost.replaceChildren();
      heroFlow=ArkUI.buildChainFlow({hrefFor:function(key){return '#'+ArkUI.pageCatalog[key].path;},caseId:currentCase,inline:true,rich:true});
      flowHost.appendChild(heroFlow.element);
      caseButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.case === currentCase)); });
      if (world) world.select(currentCase);
    }
    mountHeroFlow();
    hero.appendChild(instrument);el.appendChild(hero);

    // Everything past the hero, one disclosure: find-your-place, the
    // architecture, measured evidence, the fleet signal, and the FAQ.
    // Each keeps its own heading once opened; closed, this whole block is
    // one line.
    var moreSection = node('section', 'hl-section hl-more');
    var moreWrap = node('div', 'hl-faq hl-page-more');
    var pageMore = node('details');
    pageMore.appendChild(node('summary', '', 'More: find your place, the architecture, measured evidence and open questions'));
    var pageMoreBody = node('div');
    pageMore.appendChild(pageMoreBody);
    moreWrap.appendChild(pageMore);
    moreSection.appendChild(moreWrap);

    // Only the selected audience's routes ask for attention.
    var start = node('section', 'about-more-part');
    start.appendChild(node('h3', '', 'Different ambitions. Common ground.'));
    start.appendChild(node('p', 'hl-deck', 'Explore the idea, build with it, or help run it. Choose your way into DEFXN.'));
    start.id = 'hl-start';
    var audience = node('div', 'hl-audience');
    var picker = node('div', 'hl-audience-tabs'); picker.setAttribute('role', 'tablist'); picker.setAttribute('aria-label', 'Choose your path');
    var audiences = [
      { name:'Explore', icon:'world', forWho:'For the curious', title:'See what makes DEFXN different.', text:'Start with the idea. Follow a record, see what a resolver does, and explore the network at your own pace.', action:'Explore the protocol', route:'about', refs:[['Walk the chain','chain'],['Inspect the evidence','stats']] },
      { name:'Build', icon:'layers', forWho:'For developers & founders', title:'Give your application a signed foundation.', text:'Explore the resolver model, inspect the available definitions, and see what it takes to run from source.', action:'Understand resolvers', route:'resolver', refs:[['Browse resolvers','resolvers'],['Run from source','download']] },
      { name:'Operate', icon:'network', forWho:'For operators & partners', title:'Put your infrastructure to work.', text:'Inspect fleet measurements, review the source prerequisites, and understand the steps to create or join a network.', action:'Read the operator path', route:'download', refs:[['Create or join a network','deploy'],['Review fleet measurements','stats']] }
    ];
    var audiencePanel = node('div', 'hl-audience-panel'); audiencePanel.id = 'hl-audience-panel'; audiencePanel.setAttribute('role', 'tabpanel'); audiencePanel.tabIndex = 0;
    var audienceButtons = [];
    function selectAudience(i, focus) {
      ArkUI.pageModules.zero.selectedAudience = i;
      audienceButtons.forEach(function (button, index) { button.setAttribute('aria-selected', String(index === i)); button.tabIndex = index === i ? 0 : -1; });
      var item = audiences[i]; audiencePanel.replaceChildren(); audiencePanel.setAttribute('aria-labelledby', 'hl-audience-' + i);
      var content = node('div'); content.appendChild(label(item.forWho)); content.appendChild(node('h3', '', item.title)); content.appendChild(node('p', '', item.text));
      var routes = node('div', 'hl-audience-routes'); routes.appendChild(iconize(link(item.action, item.route, 'hl-button hl-neutral-button'), 'arrow-right', true));
      var refs = node('nav', 'hl-ref-links'); refs.setAttribute('aria-label', item.name + ' resources');
      item.refs.forEach(function (ref) { refs.appendChild(iconize(link(ref[0], ref[1]), 'open', true)); });
      routes.appendChild(refs); audiencePanel.appendChild(content); audiencePanel.appendChild(routes);
      if (focus) audienceButtons[i].focus();
    }
    audiences.forEach(function (item, i) {
      var button = node('button', 'hl-audience-tab'); button.type = 'button'; button.id = 'hl-audience-' + i;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', audiencePanel.id);
      button.appendChild(node('span', 'hl-label', '0' + (i + 1))); iconize(button, item.icon); button.appendChild(node('span', '', item.name));
      button.addEventListener('click', function () { selectAudience(i, false); });
      button.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = (i + 1) % audiences.length;
        else if (event.key === 'ArrowLeft') next = (i + audiences.length - 1) % audiences.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = audiences.length - 1;
        else return;
        event.preventDefault(); selectAudience(next, true);
      });
      audienceButtons.push(button); picker.appendChild(button);
    });
    audience.appendChild(picker); audience.appendChild(audiencePanel); start.appendChild(audience); pageMoreBody.appendChild(start); selectAudience(ArkUI.pageModules.zero.selectedAudience || 0, false);

    var principles = node('section', 'about-more-part');
    principles.appendChild(node('h3', '', 'Independent histories. Shared possibilities.'));
    principles.appendChild(node('p', 'hl-deck', 'Identity, execution and evidence are distinct parts of the same story.'));
    var principleGrid = node('div', 'hl-principles');
    [
      ['01 / Identity', 'A history with an author.', 'Each identity has its own signed records. Authorship can be checked without treating every record as the same kind of work.'],
      ['02 / Resolution', 'Rules that do useful work.', 'Transfers, swaps and governance have different rules. Resolvers make those rules explicit and attach a signature to the result.'],
      ['03 / Evidence', 'A claim you can inspect.', 'The signed result links back to its inputs. Auditing makes the resolver’s decisions inspectable; it does not remove the need to trust its authority.']
    ].forEach(function (item,i) {
      var card = node('article');card.appendChild(label(item[0], ['account','resolver','evidence'][i]));
      var visual=node('div','hl-record-study');visual.setAttribute('aria-hidden','true');visual.dataset.study=String(i);
      for(var n=0;n<5;n++){var record=node('span','','0'+(n+1));visual.appendChild(record);}card.appendChild(visual);
      card.appendChild(node('h3', '', item[1])); card.appendChild(node('p', '', item[2])); principleGrid.appendChild(card);
    });
    principles.appendChild(principleGrid);
    var pressureTest = iconize(link('Go deeper into the resolver model', 'resolver'), 'open', true); pressureTest.dataset.sceneLink = 'resolver'; principles.appendChild(pressureTest); pageMoreBody.appendChild(principles);

    // RekIt law 16 ("no dashboard thinking") + law 14 ("silence is
    // functional"): a 3-up stat wall reads as a dashboard. One lead metric
    // stays visible once this part is open; the rest moves behind its own
    // nested <details>.
    var stats = window.ArkStatsHighlights;
    var evidence = node('section', 'about-more-part');
    evidence.appendChild(node('h3', '', 'Put the claims under a microscope.'));
    evidence.appendChild(node('p', 'hl-deck', 'Published results from the DEFXN benchmark fleet. The conditions matter as much as the numbers.'));
    var statItems = stats ? stats.items.slice(0, 3) : [];
    var statNames = ['Swap resolution', 'Transfer resolution', 'Signed-result storage'];
    var statIcons = ['swap', 'transfer', 'layers'];
    function statText(i) { return i === 2 ? 'Fleet-wide storage. Replicas store the signed result without repeating the resolution.' : 'Concurrent resolver capacity across 10 nodes. Network transport excluded.'; }
    function statCard(i) {
      var stat = statItems[i];
      var card = node('article'); card.appendChild(label(statNames[i], statIcons[i]));
      card.appendChild(node('strong', 'hl-metric', stat.value)); card.appendChild(node('span', 'hl-unit', i === 2 ? 'signed results / second' : stat.unit));
      card.appendChild(node('p', '', statText(i))); return card;
    }
    if (statItems.length) {
      var evidenceLead = node('div', 'hl-evidence-grid hl-evidence-grid-lead');
      evidenceLead.appendChild(statCard(0));
      evidence.appendChild(evidenceLead);
    }
    if (statItems.length > 1) {
      // `.hl-faq` is a wrapper div around one or more <details> (matching
      // the real FAQ pattern below, not a new one).
      var statsMoreWrap = node('div', 'hl-faq hl-evidence-more');
      var statsMoreDetails = node('details');
      statsMoreDetails.appendChild(node('summary', '', 'See the other benchmarks & methodology'));
      var statsMoreBody = node('div');
      var statsMoreGrid = node('div', 'hl-evidence-grid');
      statItems.slice(1).forEach(function (stat, i) { statsMoreGrid.appendChild(statCard(i + 1)); });
      statsMoreBody.appendChild(statsMoreGrid);
      var evidenceFoot = node('div', 'hl-evidence-foot');
      var operations = stats && stats.operations;
      var scope = operations ? operations.record + ' · ' + operations.fleet.nodes + ' nodes · ' + operations.fleet.cores + ' cores · ' + operations.date + '. ' : '';
      evidenceFoot.appendChild(node('p', '', scope + 'These are resolution and storage benchmarks, not end-to-end transaction rates.'));
      evidenceFoot.appendChild(iconize(link('Read methodology & limits', 'stats'), 'open', true));
      statsMoreBody.appendChild(evidenceFoot);
      statsMoreDetails.appendChild(statsMoreBody);
      statsMoreWrap.appendChild(statsMoreDetails);
      evidence.appendChild(statsMoreWrap);
    }
    pageMoreBody.appendChild(evidence);

    // The fleet signal: real, live, but a fact to check, not a banner to
    // lead with -- one quiet line inside the same disclosure.
    var signal = node('div', 'hl-signal hl-signal-quiet');
    var pulse = node('span', 'hl-pulse', 'Fleet measurement loading');
    var pulseTime = node('span', 'hl-pulse-time', 'Hourly synthetic capacity test');
    signal.appendChild(label('A network you can inspect', 'network')); signal.appendChild(pulse); signal.appendChild(pulseTime);
    signal.appendChild(iconize(link('Open the explorer', 'explorer'), 'open', true));
    pageMoreBody.appendChild(signal);

    var faq = node('section', 'about-more-part');
    faq.appendChild(node('h3', '', 'Clarity comes first.'));
    var questions = node('div', 'hl-faq');
    [
      ['What is a “chain of chains”?', 'It is the identity model: each identity has its own signed history. Applications connect those histories through records and references. The current execution model is signed resolution: a resolver processes signed inputs and signs its result.'],
      ['What can I do today?', 'Explore the protocol, inspect published measurements and resolver definitions, and follow the instructions to run from source. Availability and deployment requirements differ by capability; the operator and resolver pages describe those boundaries.'],
      ['Does a signature guarantee a correct result?', 'A signature proves who signed a result. Correctness depends on the resolver’s rules and checks. Audits can expose a wrong resolution; they do not prevent every bad decision in advance.']
    ].forEach(function (item) { var detail = node('details'); detail.appendChild(node('summary', '', item[0])); detail.appendChild(node('p', '', item[1])); questions.appendChild(detail); });
    faq.appendChild(questions); pageMoreBody.appendChild(faq);

    el.appendChild(moreSection);

    var closing = node('footer', 'hl-closing');
    closing.appendChild(label('DEFXN / Independent histories. Connected possibilities.', 'world'));
    closing.appendChild(node('h2', '', 'Start with the idea.\nFollow the evidence.'));
    closing.appendChild(iconize(link('Explore DEFXN', 'about', 'hl-button palette-solid'), 'arrow-right', true));
    var footerLinks = node('nav', 'hl-footer-links'); footerLinks.setAttribute('aria-label', 'More about DEFXN');
    [['Protocol','about','overview'],['Resolvers','resolvers','resolver'],['Explorer','explorer','network'],['Run from source','download','terminal'],['Governance','dao','vote']].forEach(function (item) { footerLinks.appendChild(iconize(link(item[0], item[1]), item[2])); });
    closing.appendChild(footerLinks); el.appendChild(closing);

    var disposed = false;
    el.arkRestore = function () { heroFlow.restore(); };
    el.arkDispose = function () { disposed = true; heroFlow.dispose(); };
    if (window.ArkPulse) ArkPulse.get().then(function (result) {
      if (disposed) return;
      var data = result.data;
      var alive = data.nodes.filter(function (n) { return !n.error && n.qps > 0; }).length;
      pulse.textContent = alive + '/' + data.nodes.length + ' nodes reporting · ' + Math.round(data.aggregate_qps).toLocaleString('en-US') + ' ops/s';
      pulseTime.textContent = 'Synthetic capacity · ' + new Date(data.measured_at_ms).toLocaleString(undefined, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      pulse.title = 'Hourly synthetic capacity, not cumulative ledger growth or live user traffic.';
      signal.dataset.state = data.errors ? 'warn' : 'ok';
    }).catch(function () {
      if (disposed) return;
      pulse.textContent = 'Live fleet measurement unavailable'; pulseTime.textContent = 'Dated benchmark evidence below remains available.'; signal.dataset.state = 'unavailable';
    });
    return el;
  }
};
