/* The selected panel is the dashboard host. Content lifetime is separate from
   geometry lifetime: no cloned box and no opacity animation on the host. */
(function () {
  'use strict';
  ArkUI.createPanelContinuity = function (scene) {
    var host = null, animation = null, revision = 0, sourceKey = null, sourcePage = null, sourceQuery = null, sourceClass = null, destination = null;
    function family(page) { return ['reference', 'resolver', 'references', 'deployment'].indexOf(page) >= 0 || page === 'lifecycle' || String(page).indexOf('lifecycle/') === 0 || String(page).indexOf('concept/') === 0 || page === 'dao' || page === 'about' || ['download','deploy','explorer','account','treasury','deposits','proximity','lab'].indexOf(page)>=0 || String(page).indexOf('article/')===0; }
    function group(page) { return page === 'reference' ? 'reference' : ['resolver', 'references', 'deployment'].indexOf(page) >= 0 ? 'guide' : String(page).indexOf('concept/') === 0 || page === 'dao' || page === 'about' ? 'mechanism' : ['download','deploy','explorer','account','treasury','deposits','proximity','lab'].indexOf(page)>=0 || String(page).indexOf('article/')===0 ? 'task' : 'lifecycle'; }
    function bounds(el) {
      var box = el.getBoundingClientRect(), base = scene.getBoundingClientRect();
      return { left: box.left - base.left, top: box.top - base.top, width: box.width, height: box.height };
    }
    function styles(box) {
      return { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' };
    }
    function place(box) { Object.assign(host.style, styles(box)); }
    function stop() {
      if (!host || !animation) return;
      var current = bounds(host);
      animation.cancel(); animation = null;
      place(current);
    }
    function target() {
      var box = scene.getBoundingClientRect();
      var gutter = box.width <= 620 ? 16 : Math.max(24, Math.min(48, box.width * .03));
      var width = Math.min(1080, box.width - gutter * 2);
      return { left: (box.width - width) / 2, top: 84, width: width, height: Math.max(180, box.height - 148) };
    }
    function animateTo(box, immediate) {
      stop(); destination = box;
      var current=bounds(host),from = styles(current), to = styles(box);
      var unchanged=['left','top','width','height'].every(function(k){return Math.abs(current[k]-box[k])<.5;});
      place(box);
      if (immediate || unchanged || !host.animate) return Promise.resolve();
      var run = host.animate([from, to], { duration: 540, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'both' });
      animation = run;
      return run.finished.catch(function () {}).then(function () {
        if (animation === run) { animation = null; run.cancel(); }
      });
    }
    function holdContents(box, padding, reveal, immediate) {
      var inner=document.createElement('div');inner.className='continuity-origin';
      inner.style.width=Math.max(0,box.width-2)+'px';inner.style.boxSizing='border-box';inner.style.padding=padding||'0px';
      while(host.firstChild)inner.appendChild(host.firstChild);
      host.appendChild(inner);
      if(!immediate&&inner.animate){
        var motion=inner.animate(reveal?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],{duration:reveal?190:180,delay:reveal?200:0,easing:'cubic-bezier(.2,.65,.2,1)',fill:'both'});
        motion.finished.catch(function(){});
      }
      return inner;
    }
    function activate(kind) {
      host.classList.add('continuity-host');
      host.dataset.panelHost = kind || 'lifecycle';
      host.setAttribute('aria-label', 'Agreement lifecycle dashboard');
      host.inert = true;
      scene.appendChild(host);
    }
    function fresh(kind) {
      host = document.createElement('div');
      activate(kind); place(target());
    }
    function settleGeometry() {
      if (host && destination) { stop(); place(destination); }
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', function () {
        if (host && host.dataset.panelMode === 'dashboard') {
          destination = target(); settleGeometry();
        }
      });
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduced.addEventListener) reduced.addEventListener('change', function () { if (reduced.matches) settleGeometry(); });
    }
    if (ArkUI.sceneState && ArkUI.sceneState.subscribe) ArkUI.sceneState.subscribe(function (state) { if (state.paused) settleGeometry(); });
    return {
      begin: function (outgoing, incoming, pages, source, immediate) {
        if (!family(incoming) && !host) return null;
        stop();
        var ticket = ++revision, returning = !!host && (incoming === sourcePage || incoming === 'zero' && host.dataset.panelHost === 'lifecycle');
        var origin = source && source.closest ? source.closest('[data-continuity-card]') : null;
        if (!origin && group(incoming) === 'lifecycle' && pages[outgoing]) origin = pages[outgoing].querySelector('.home-lifecycle');
        var expanding = family(incoming) && !host && origin;
        if (expanding) {
          var initial = bounds(origin),originPadding=typeof getComputedStyle==='function'?getComputedStyle(origin).padding:'18px';
          sourceKey = source && source.dataset.sceneLink || incoming;
          sourcePage = outgoing; sourceQuery = typeof location !== 'undefined' ? ArkUI.route.search() : ''; sourceClass = origin.className;
          host = origin;
          var placeholder = document.createElement('div');
          placeholder.className = origin.className + ' continuity-placeholder';
          placeholder.style.height = initial.height + 'px';
          origin.parentNode.replaceChild(placeholder, origin);
          holdContents(initial,originPadding,false,immediate!==false);
          activate(group(incoming)); place(initial);
        } else if (family(incoming) && !host) fresh(group(incoming));
        if (host) host.inert = true;
        // Start the chosen object's expansion while the old page content leaves.
        // Inner replacement then uses the remaining geometry time, never a restart.
        var opening=expanding && immediate===false ? animateTo(target(),false) : null;
        return {
          commit: function (el, immediate) {
            if (ticket !== revision) return Promise.resolve();
            if (returning) {
              // The router has committed Home's styles. Measure its real compact
              // destination without painting a duplicate border or controls.
              var compact = sourcePage && sourcePage !== 'zero' ? el.querySelector('[data-continuity-card="' + sourceKey + '"]') : el.querySelector('.home-lifecycle');
              if (!compact) return Promise.resolve();
              el.hidden = false; el.inert = true;
              compact.style.visibility = 'hidden';
              var destination = bounds(compact),compactPadding=typeof getComputedStyle==='function'?getComputedStyle(compact).padding:'18px';
              host.replaceChildren();
              while (compact.firstChild) host.appendChild(compact.firstChild);
              host.className = sourceClass || 'home-lifecycle'; host.classList.add('continuity-host');
              if (compact.dataset.continuityCard) host.dataset.continuityCard = compact.dataset.continuityCard;
              host.dataset.panelMode = 'compact';
              var compactContents=holdContents(destination,compactPadding,true,immediate);
              var run = animateTo(destination, immediate);
              return run.then(function () {
                if (ticket !== revision) return;
                while(compactContents.firstChild)host.insertBefore(compactContents.firstChild,compactContents);
                compactContents.remove();
                compact.parentNode.replaceChild(host, compact);
                host.classList.remove('continuity-host');
                delete host.dataset.panelHost; delete host.dataset.panelMode;
                host.removeAttribute('style'); host.inert = false;
                if (sourcePage && sourcePage !== 'zero') host.removeAttribute('aria-label'); else host.setAttribute('aria-label', 'The agreement lifecycle');
                var focus = sourceKey && host.querySelector('[data-scene-link="' + sourceKey + '"]') || host.querySelector('.home-lifecycle-all');
                if (focus) focus.focus({ preventScroll: true });
                host = null; sourceKey = null; sourcePage = null; sourceClass = null;
              });
            }
            if (!family(incoming)) {
              if (host) { host.remove(); host = null; sourceKey = null; sourcePage = null; sourceClass = null; }
              return Promise.resolve();
            }
            host.replaceChildren(el);
            host.setAttribute('aria-label', incoming === 'reference' ? 'Canonical reference dashboard' : group(incoming) === 'guide' ? 'DEFXN explanation dashboard' : group(incoming) === 'mechanism' ? 'Mechanism dashboard' : group(incoming) === 'task' ? 'Task dashboard' : 'Agreement lifecycle dashboard');
            host.dataset.panelMode = 'dashboard';
            host.inert = false;
            if(opening && !immediate){
              // Incoming text lays out at its destination size while the boundary
              // catches up, so words and diagram rows do not jump mid-flight.
              var finalBox=target();el.style.width=(finalBox.width-2)+'px';el.style.height=(finalBox.height-2)+'px';
              return opening.then(function(){if(ticket===revision){el.style.width='';el.style.height='';}});
            }
            return animateTo(target(), immediate || !expanding && !outgoing);
          }
        };
      },
      returnQuery: function(page) { return sourcePage === page ? sourceQuery : undefined; },
      get host() { return host; }
    };
  };
})();
