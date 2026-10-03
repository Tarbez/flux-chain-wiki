/* Content and screen-reader equivalent for the interactive lattice view. */
(function () {
  'use strict';

  ArkUI.lifecycleContent = {
    intent: {
      lead: 'Example: you ask someone to copy one named snapshot of a dataset.',
      heading: 'Say what you need.',
      body: 'The client signs an intent that identifies the snapshot, desired outcome, and applicable constraints. Later records can now refer to this request by CID instead of relying on a conversation or global queue position.',
      note: 'What is still not true: no provider has committed, no work has occurred, and no result has been checked.',
      facts: [
        ['Who writes it', 'The client requesting replication.'],
        ['References', 'The dataset snapshot and applicable request policy.'],
        ['Becomes true', 'One signed, addressable request exists.'],
        ['Next', 'A provider offer references this intent CID.']
      ]
    },
    offer: {
      lead: 'A provider offers to copy the snapshot and explains the proposed terms.',
      heading: 'Consider their proposal.',
      body: 'The provider signs an offer that references the intent CID. The terms stay attached to the request they answer, so the client can inspect capability, constraints, and proposed evidence before accepting anything.',
      note: 'What is still not true: a signed offer is a proposal, not a shared agreement or proof of capacity.',
      facts: [
        ['Who writes it', 'The provider proposing the work.'],
        ['References', 'The client intent CID.'],
        ['Becomes true', 'One attributable proposal exists for that request.'],
        ['Next', 'The participants accept matching terms.']
      ]
    },
    agreement: {
      lead: 'You and the provider record the same accepted terms for the job.',
      heading: 'Agree on what comes next.',
      body: 'The signed agreement links the accepted intent and offer. It defines what fulfillment will be checked against while unrelated agreements continue independently.',
      note: 'What is still not true: accepted terms do not prove the replication happened or that downstream settlement occurred.',
      facts: [
        ['Who writes it', 'The participating client and provider.'],
        ['References', 'The accepted intent and offer CIDs.'],
        ['Becomes true', 'The participants have one inspectable set of terms.'],
        ['Next', 'The provider performs and documents the work.']
      ]
    },
    fulfillment: {
      lead: 'The provider shares the result and the evidence required by the agreed terms.',
      heading: 'Open the result package.',
      body: 'The fulfillment record references the agreement and carries the result evidence defined by its terms. The work remains attached to the request, provider, and policy that gave it meaning.',
      note: 'What is still not true: submission is not acceptance, semantic truth, or proof of every downstream effect.',
      facts: [
        ['Who writes it', 'The provider that performed the work.'],
        ['References', 'The agreement CID and result artifacts.'],
        ['Becomes true', 'A signed result is available for checking.'],
        ['Next', 'The applicable checker and authority evaluate it.']
      ]
    },
    receipt: {
      lead: 'The checking participant records the outcome under the identified rules and authority.',
      heading: 'Read the checking decision.',
      body: 'The receipt links the fulfillment to the agreement, offer, and intent. An auditor can follow one continuous path from request to verification without reconstructing a global block order.',
      note: 'What is still not true: a receipt is not universal truth, legal finality, treasury settlement, or production-readiness evidence.',
      facts: [
        ['Who writes it', 'The participant responsible for the verification outcome.'],
        ['References', 'The fulfillment and its linked agreement history.'],
        ['Becomes true', 'One policy-bound verification outcome is recorded.'],
        ['Result', 'An inspectable intent-to-receipt evidence trail.']
      ]
    }
  };

  ArkUI.pageModules.lifecycle = {
    mount: function (host, page) {
      var id = page.split('/')[1], index = Math.max(0, ArkUI.lifecycleStages.findIndex(function (stage) { return stage.id === id; }));
      var stage = ArkUI.lifecycleStages[index], copy = ArkUI.lifecycleContent[stage.id];
      if (id && !ArkUI.lifecycleContent[id]) throw new Error('Unknown lifecycle stage: ' + id);
      var el = ArkUI.el('section', 'ark-page lifecycle-page');
      el.dataset.arkPage = page;
      function link(label, key, cls) {
        var a = ArkUI.el('a', cls || '', label); a.href = ArkUI.route.href(ArkUI.pageCatalog[key].path); a.dataset.sceneLink = key; return a;
      }
      var path = ArkUI.el('nav', 'content-layer-path'); path.setAttribute('aria-label', 'Your place');
      path.appendChild(link('← Home', 'zero'));
      if (id) path.appendChild(link('02 / Agreement lifecycle', 'lifecycle'));
      var current = ArkUI.el('span', '', id ? '03 / ' + id.charAt(0).toUpperCase() + id.slice(1) : '02 / Agreement lifecycle');
      current.setAttribute('aria-current', 'page'); path.appendChild(current); el.appendChild(path);
      el.dataset.stage=id||'overview';
      var heading=ArkUI.el('h1','',id?copy.heading:'From request to receipt.');
      var trail = ArkUI.el('nav', 'lifecycle-trail'); trail.setAttribute('aria-label', 'Agreement stages');
      ArkUI.lifecycleStages.forEach(function (item, i) {
        var a = link(item.title, 'lifecycle/' + item.id, 'lifecycle-trail-item');
        a.dataset.stage = item.id;
        var number = ArkUI.el('span', 'story-index', String(i + 1).padStart(2, '0')); a.insertBefore(number, a.firstChild);
        a.dataset.position=i<index&&id?'earlier':id===item.id?'current':'next';
        if (id === item.id) a.setAttribute('aria-current', 'step');
        trail.appendChild(a);
      });
      var body = ArkUI.el('div', 'lifecycle-dashboard-body');
      var answer = ArkUI.el('div', 'lifecycle-answer');
      answer.appendChild(ArkUI.el('p','story-kicker',id?String(index+1).padStart(2,'0')+' / '+stage.title.toUpperCase():'ONE SNAPSHOT / FIVE SIGNED RECORDS'));
      answer.appendChild(heading);
      var view = ArkUI.el('div', 'lifecycle-view'); view.setAttribute('aria-live', 'polite');
      var modes = ArkUI.el('nav', 'story-depth'); modes.setAttribute('aria-label', 'Explanation depth');
      var controls = [];
      ['Answer', 'Understand why', 'Evidence'].forEach(function (label, i) {
        var button = ArkUI.el('button', '', label); button.type = 'button';button.dataset.icon=['overview','layers','evidence'][i];
        button.addEventListener('click', function () { select(i, true); });
        controls.push(button); modes.appendChild(button);
      }); answer.appendChild(view);answer.appendChild(modes);
      var boundary = ArkUI.el('aside', 'lifecycle-boundary');
      boundary.appendChild(ArkUI.el('strong', '', id ? 'Not yet established' : 'Status / Partial'));
      boundary.appendChild(ArkUI.el('p', '', id ? copy.note.replace('What is still not true: ', '') : 'Implemented in source. Full public production automation and economic settlement remain unverified.'));
      answer.appendChild(boundary); body.appendChild(answer);
      var unique=id&&ArkUI.createStageScene?ArkUI.createStageScene(id,copy):null;
      var previewStage=id||'receipt';
      if(unique){
        el.classList.add('lifecycle-unique');body.appendChild(unique.element);el.appendChild(body);el.appendChild(trail);
        ArkUI.lifecycleStages.forEach(function(item,i){var a=trail.children[i];a.addEventListener('pointerenter',function(){unique.preview(item.id);});a.addEventListener('focus',function(){unique.preview(item.id);});});
        trail.addEventListener('pointerleave',function(){unique.preview(id);});
        trail.addEventListener('focusout',function(event){if(!trail.contains||!trail.contains(event.relatedTarget))unique.preview(id);});
      }else{
      var illustration = ArkUI.el('figure', 'lifecycle-object');
      illustration.setAttribute('aria-label', 'Illustrative reference fabric, not a live agreement');
      var figureTop=ArkUI.el('div','lifecycle-fabric-top');
      figureTop.appendChild(ArkUI.el('span','', 'AGREEMENT FABRIC'));
      figureTop.appendChild(ArkUI.el('span','', 'ILLUSTRATION'));
      illustration.appendChild(figureTop);
      var count=ArkUI.el('strong','lifecycle-fabric-count',id?String(index+1).padStart(2,'0'):'05');illustration.appendChild(count);
      var figureTitle=ArkUI.el('figcaption','',id?stage.title+' / linked to the same snapshot':'Five records. One reference trail.');illustration.appendChild(figureTitle);
      var mesh=ArkUI.el('canvas','lifecycle-fabric-mesh');mesh.setAttribute('aria-hidden','true');illustration.appendChild(mesh);
      var preview=ArkUI.el('p','lifecycle-fabric-preview',id?copy.facts[2][1]:'Each signed record adds a reference to the same agreement.');illustration.appendChild(preview);
      var foot=ArkUI.el('div','lifecycle-fabric-foot');foot.appendChild(ArkUI.el('span','','Dataset snapshot'));foot.appendChild(ArkUI.el('span','','References persist'));illustration.appendChild(foot);
      body.appendChild(illustration);el.appendChild(body);el.appendChild(trail);
      var fabric=ArkUI.createMeshFabric(mesh),previewStage=id||'receipt';
      function paintFabric(selected,animate){fabric.select(selected,!!animate);}
      function previewRecord(selected){
        if(previewStage===selected)return;previewStage=selected;paintFabric(selected,true);
        var item=ArkUI.lifecycleContent[selected],selectedIndex=ArkUI.lifecycleStages.findIndex(function(s){return s.id===selected;});
        count.textContent=String(selectedIndex+1).padStart(2,'0');
        figureTitle.textContent=ArkUI.lifecycleStages[selectedIndex].title+' / same snapshot';
        preview.textContent=item.facts[2][1];
      }
      ArkUI.lifecycleStages.forEach(function(item,i){
        var a=trail.children[i];
        a.addEventListener('pointerenter',function(){previewRecord(item.id);});
        a.addEventListener('focus',function(){previewRecord(item.id);});
      });
      function resetPreview(){previewRecord(id||'receipt');if(!id){count.textContent='05';figureTitle.textContent='Five records. One reference trail.';preview.textContent='Each signed record adds a reference to the same agreement.';}}
      trail.addEventListener('pointerleave',resetPreview);
      trail.addEventListener('focusout',function(event){if(!trail.contains||!trail.contains(event.relatedTarget))resetPreview();});

      }
      var next = ArkUI.el('nav', 'lifecycle-next'); next.setAttribute('aria-label', 'Continue the story');
      if (id && index > 0) next.appendChild(link('← ' + ArkUI.lifecycleStages[index - 1].title, 'lifecycle/' + ArkUI.lifecycleStages[index - 1].id));
      var nextStage = id ? ArkUI.lifecycleStages[index + 1] : stage;
      next.appendChild(link(nextStage ? (id ? 'Continue to ' : 'Follow ') + nextStage.title + ' →' : 'Return to the full trail →', nextStage ? 'lifecycle/' + nextStage.id : 'lifecycle', 'story-primary'));
      el.appendChild(next);
      function select(depth, write) {
        controls.forEach(function (control, i) { control.setAttribute('aria-pressed', String(i === depth)); });
        el.dataset.depth = ['focus', 'context', 'reference'][depth];
        view.replaceChildren();
        if (depth === 0) {
          view.appendChild(ArkUI.el('p', 'lifecycle-scenario', id ? copy.lead : 'A client asks a provider to replicate one named dataset snapshot. Signed records connect the request, terms, work, and policy-bound verification. Each stage answers a different question.'));
          if (id) view.appendChild(ArkUI.el('p', 'story-result', copy.facts[2][1]));
        } else if (depth === 1) {
          if(!id)view.appendChild(ArkUI.el('p', '', 'Each record refers to the preceding request or result by CID. You can follow this one agreement without reconstructing a global block order. Choose a stage to inspect what becomes true and what remains unproven.'));
          if (id) {
            var facts = ArkUI.el('div', 'lifecycle-facts'), choices = ArkUI.el('nav', ''); choices.setAttribute('aria-label', 'Inspect ' + stage.title);
            var factAnswer = ArkUI.el('p', '', copy.body); factAnswer.setAttribute('aria-live', 'polite');
            var buttons = [];
            [['Why it matters',copy.body]].concat(copy.facts).forEach(function (fact, i) {
              var button = ArkUI.el('button', 'mechanism-step', fact[0] === 'Next' ? 'What follows' : fact[0]); button.type = 'button'; button.setAttribute('aria-pressed', String(i === 0));
              button.addEventListener('click', function () { factAnswer.textContent = fact[1]; buttons.forEach(function (b, j) { b.setAttribute('aria-pressed', String(i === j)); }); });
              buttons.push(button); choices.appendChild(button);
            }); facts.appendChild(choices); facts.appendChild(factAnswer); view.appendChild(facts);
          }
        } else {
          view.appendChild(ArkUI.el('p', '', id ? copy.facts[1][1] : 'The canonical agreement guide describes the record types and their reference chain. This is an illustrative walkthrough, not a live agreement or a verified production run.'));
          var guide = ArkUI.el('a', 'story-reference', 'Read the agreement guide ↗'); guide.href = ArkUI.route.href('/reference?' + new URLSearchParams({doc:'docs/protocol/agreements.md',from:ArkUI.pageCatalog[page].path}).toString()); view.appendChild(guide);
          if (id) view.appendChild(ArkUI.el('p', '', 'The diagram does not supply real CIDs or result artifacts. Inspect actual signed records before drawing a verification conclusion.'));
        }
        if(ArkUI.decorateActionIcons)ArkUI.decorateActionIcons(view);
        if (write) {
          var query = depth ? 'view=' + ['focus', 'context', 'reference'][depth] : '';
          ArkUI.route.write(ArkUI.pageCatalog[page].path, query, 'push');
        }
      }
      function restore() {
        var route = ArkUI.route.path();
        if (route !== ArkUI.pageCatalog[page].path) return;
        var selected = new URLSearchParams(ArkUI.route.search()).get('view');
        select(selected === 'context' ? 1 : selected === 'reference' ? 2 : 0, false);
      }
      select(0, false); restore();
      window.addEventListener('popstate', restore); window.addEventListener('hashchange', restore);
      el.arkDispose = function () { if(unique)unique.dispose();else fabric.dispose();window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); };
      host.appendChild(el);if(unique)unique.start();else fabric.select(previewStage,false);return el;
    }
  };
})();
