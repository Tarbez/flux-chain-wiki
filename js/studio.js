/* The module is lazy-loaded once; values persist when the page is remounted. */
ArkUI.studioValues = ArkUI.studioValues || { mode: 'spacing', spacing: 50, rhythm: 50, depth: 50 };
ArkUI.mountStudio = function (root) {
  'use strict';
  /* The model's address is its catalog entry's (js/pages/catalog.js): the canonical path it is written to, and the old ones
     (/experiments/lab, /work) it is still restored from. Before 2026-10-20 this file wrote and read only the merged-away alias, so on
     /experiments the first touched study rewrote the address to the alias and /experiments?model=..&value=.. restored nothing. */
  var home = (function () {
    var catalog = ArkUI.pageCatalog || {}, key = Object.keys(catalog).filter(function (k) { return catalog[k].module === 'lab'; })[0], entry = key && catalog[key];
    return entry ? { path: entry.path, paths: [entry.path].concat(entry.aliases || []) } : { path: '/experiments', paths: ['/experiments'] };
  })();
  function findById(id) { return root.querySelector('#' + id); }
  var studies = {
    spacing: { title: 'How can threshold agreement be pictured?', description: 'This model moves independent groups closer together as a visual analogy for threshold evidence. It does not calculate a real roster, vote, certificate, or transition.', label: 'Visual convergence', start: 'Apart', end: 'Together', note: 'A VISUAL ANALOGY FOR DERIVED, TEMPORARY AUTHORITY.', code: 'FX—001' },
    rhythm: { title: 'How can one agreement lifecycle be pictured?', description: 'This model moves through intent, offer, agreement, fulfillment, and receipt as an explanatory sequence. It does not load signed manifests, verify CID links, or observe a live agreement.', label: 'Position in the illustrated lifecycle', start: 'INTENT', end: 'RECEIPT', note: 'AN ILLUSTRATION OF FIVE LINKED STAGES, NOT A LIVE TRACE.', code: 'FX—002' },
    depth: { title: 'How can network boundaries be pictured?', description: 'This model separates four shapes to illustrate named-network scope on one substrate. Current isolation partitions miner presence; the control does not test or imply a security boundary.', label: 'Visual separation', start: 'Shared', end: 'Separated', note: 'PRESENCE SCOPE IS PARTIAL, NOT A SECURITY GUARANTEE.', code: 'FX—003' }
  };
  var mode = ArkUI.studioValues.mode; var values = ArkUI.studioValues;
  var specimen = root.querySelector('.specimen');
  var range = findById('variable');
  var stage = root.querySelector('.experiment-stage');
  function update(write) {
    var value = Number(range.value); values[mode] = value;
    var stageIndex=Math.min(4,Math.floor(value/20)),stageName=['Intent','Offer','Agreement','Fulfillment','Receipt'][stageIndex];
    findById('variable-value').textContent = mode==='rhythm'?stageName:value + '%';
    range.setAttribute('aria-valuetext', value + ' percent, ' + studies[mode].label.toLowerCase());
    specimen.style.setProperty('--distance', (4 + (100-value) * .7) + 'px');
    specimen.style.setProperty('--depth', value);
    if (mode === 'rhythm') Array.from(specimen.children).forEach(function (record,index){record.dataset.selected=String(index===stageIndex);record.dataset.reached=String(index<=stageIndex);});
    var descriptions = { spacing: 'Illustrative dots in three independent groups. Visual convergence: ', rhythm: 'Illustrative bars representing positions in a five-stage agreement lifecycle: ', depth: 'Illustrative square outlines representing named-network presence scope. Visual separation: ' };
    stage.setAttribute('aria-label', mode==='rhythm'?'Illustrated lifecycle position: '+stageName+'. No signed record is loaded.':descriptions[mode]+value+' percent.');
    var consequence=root.querySelector('.model-consequence');if(consequence)consequence.textContent=mode==='rhythm'?'Illustrated record: '+stageName+'. Earlier records remain in its reference trail; no real signature is verified.':mode==='spacing'?(value<50?'Independent groups remain apart.':'Independent groups draw together.')+' Visual spacing does not count approvals or prove a quorum.':(value<50?'Named presence groups share a close view.':'Named presence groups appear separately.')+' Shared accounts and authority remain outside this illustrated isolation.';
    var canonical=root.querySelector('.model-canonical');if(canonical){var target=mode==='rhythm'?'lifecycle':mode==='depth'?'concept/purpose':'concept/practice';canonical.dataset.sceneLink=target;canonical.href=ArkUI.route.href(ArkUI.pageCatalog[target].path);canonical.textContent='Read the '+(mode==='rhythm'?'agreement trail':mode==='depth'?'network boundary':'authority contract')+' →';}
    if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(root);
    if(write)writeState();
  }
  function selectStudy(next,write) {
    mode = next; values.mode = next; var study = studies[mode];
    root.querySelector('.lab').dataset.mode = mode;
    root.querySelectorAll('.study-tabs input[type="radio"]').forEach(function (radio) { radio.checked = radio.value === mode; });
    findById('study-title').textContent = study.title;findById('experiments-title').textContent=study.title;
    findById('study-description').textContent = study.description;
    root.querySelector('label[for="variable"]').textContent = study.label;
    /* The instruction is derived from the study's own end labels, so a new study carries one: "Drag the slider ... from apart to together." */
    findById('variable-hint').textContent = 'Drag the slider, or use the arrow keys, to move from ' + study.start.toLowerCase() + ' to ' + study.end.toLowerCase() + '.';
    findById('range-start').textContent = study.start;
    findById('range-end').textContent = study.end;
    root.querySelector('.stage-footnote').textContent = study.note;
    /* The specimen's own code ("FX—001") leads with what it is, derived from the study's place: "Figure 1 of 3 · FX—001". */
    var places = Object.keys(studies);
    root.querySelector('.stage-corner').textContent = 'Figure ' + (places.indexOf(mode) + 1) + ' of ' + places.length + ' · ' + study.code;
    specimen.replaceChildren(); range.value = values[mode];
    var count = mode === 'spacing' ? 3 : mode === 'rhythm' ? 5 : 4;
    for (var j = 0; j < count; j++) {
      var item = document.createElement('span');
      item.className = mode === 'spacing' ? 'dot-group' : mode === 'rhythm' ? 'rhythm-bar' : 'depth-plane';
      if(mode==='rhythm')item.textContent=['Intent','Offer','Agreement','Fulfillment','Receipt'][j];
      if (mode === 'spacing') for (var k = 0; k < 4; k++) item.appendChild(document.createElement('i'));
      if (mode === 'depth') item.style.setProperty('--layer', j - 1.5);
      specimen.appendChild(item);
    }
    update(false);if(write)writeState();
  }
  /* The study picker is Ark's `choice` (js/pages/lab.js): a change is an ark:action, heard here on the page. */
  function picked(event){var detail=event.detail||{};if(detail.action==='lab-study'&&studies[detail.value])selectStudy(detail.value,true);}
  root.addEventListener('ark:action',picked);
  range.addEventListener('input',function(){update(true);});
  function writeState(){ArkUI.route.write(home.path,'model='+mode+'&value='+Number(range.value),'replace');}
  function restore(){if(home.paths.indexOf(ArkUI.route.path())<0)return;var q=new URLSearchParams(ArkUI.route.search()),next=q.get('model');if(studies[next])mode=next;var value=q.get('value');if(value!==null&&Number.isFinite(Number(value)))values[mode]=Math.max(0,Math.min(100,Number(value)));selectStudy(mode,false);}
  selectStudy(mode,false);root.arkRestore=restore;restore();window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);root.arkDispose=function(){root.removeEventListener('ark:action',picked);window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};
  range.disabled = false;
  document.documentElement.classList.add('is-ready');
};
