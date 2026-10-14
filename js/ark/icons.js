/* Native SVG, one 24px grid and one stroke language. Labels carry meaning;
   decorative icons never announce an extra label or imply verification. */
(function(){
 'use strict';
 var paths={
  'arrow-left':['M19 12H5','m11 6-6 6 6 6'],
  'arrow-right':['M5 12h14','m13 6 6 6-6 6'],
  'open':['M14 5h5v5','M19 5 10 14','M19 14v5H5V5h5'],
  'overview':['M5 5h6v6H5z','M14 5h5v6h-5z','M5 14h6v5H5z','M14 14h5v5h-5z'],
  'network':['M7 7h10v10H7z','M4 4h3v3H4z','M17 4h3v3h-3z','M4 17h3v3H4z','M17 17h3v3h-3z'],
  'layers':['m12 3 9 5-9 5-9-5 9-5Z','m3 12 9 5 9-5','m3 16 9 5 9-5'],
  'document':['M7 3h7l4 4v14H7z','M14 3v5h4','M10 12h5','M10 16h5'],
  'evidence':['M6 3h8l4 4v5','M14 3v5h4','M6 3v18h5','M15 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z','m17 19 3 3'],
  'account':['M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','M4 21v-2a8 8 0 0 1 16 0v2'],
  'terminal':['M3 5h18v14H3z','m6 9 3 3-3 3','M12 15h5'],
  'cycle':['M19 8a8 8 0 0 0-13-2L3 9','M3 4v5h5','M5 16a8 8 0 0 0 13 2l3-3','M21 20v-5h-5'],
  'authority':['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z','M8 10h8','M8 14h5'],
  'model':['M4 17 8 7l4 10 4-10 4 10','M4 21h16'],
  'inspect':['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z','m15 15 6 6'],
  // Chain-of-chains vocabulary: what a record does, and what happens to it.
  'swap':['M4 8h14','m15 5 3 3-3 3','M20 16H6','m9 13-3 3 3 3'],
  'transfer':['M4 12h12','m12 8 4 4-4 4','M20 5v14'],
  'stake':['M6 11h12v9H6z','M9 11V8a3 3 0 0 1 6 0v3','M12 15v2'],
  'vote':['M5 11h14v9H5z','m9 6 2.5 2.5L16 4','M9 15h6'],
  'sign':['m5 19 1-4L16 5l3 3L9 18l-4 1Z','M14 7l3 3','M13 21h7'],
  'check':['m5 12 4 4 10-10'],
  'chain':['M4 9h5v6H4z','M15 9h5v6h-5z','M9 12h6'],
  'peers':['M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z','M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z','M19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z','m11 7-5 10','m13 7 5 10','M7 19h10'],
  'resolver':['m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z','M12 12v9','m12 12-8-4.5','m12 12 8-4.5'],
  'world':['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z','M3 12h18','M12 3c3 3 3 15 0 18','M12 3c-3 3-3 15 0 18'],
  'link':['M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1','M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  'head':['M12 3v10','M8 9l4 4 4-4','M5 17h14v4H5z']
 };
 // The raw strokes, for drawings that place an icon on their own plane (the
 // home landscape lays them flat on a record). Same paths, same 24px grid.
 ArkUI.iconPaths=paths;
 ArkUI.icon=function(name){
  if(!paths[name]||!document.createElementNS)return null;
  var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','18');svg.setAttribute('height','18');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('class','native-icon native-icon-'+name);
  paths[name].forEach(function(d){var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.appendChild(path);});return svg;
 };
 ArkUI.actionIcon=function(el,name){
  if(!el||el.dataset.iconMounted)return;var icon=ArkUI.icon(name);if(!icon)return;
  el.dataset.icon=name;el.dataset.iconMounted='true';el.classList.add('has-native-icon');
  Array.from(el.childNodes).forEach(function(node){if(node.nodeType===3)node.textContent=node.textContent.replace(/^[←↗]\s*|\s*[→↗]$/g,'');});
  var legacy=el.querySelector('.cta-arrow');if(legacy)legacy.remove();el.insertBefore(icon,el.firstChild);
 };
 ArkUI.decorateActionIcons=function(root){
  if(!root)return;
  root.querySelectorAll('[data-icon]').forEach(function(el){ArkUI.actionIcon(el,el.dataset.icon);});
  [['.content-layer-path a','arrow-left'],['.story-primary','arrow-right'],['.story-reference','evidence'],['.reference-orientation a:first-child','arrow-left'],['.mechanism-next','arrow-right'],['.article-core-return','arrow-left'],['.article-back','arrow-left'],['.article-evidence-link','evidence'],['[data-explorer-connect]','network'],['[data-explorer-refresh]','cycle'],['[data-explorer-disconnect]','arrow-left'],['.account-page button[data-kind="primary"]','account'],['.economy-primary','arrow-right'],['.home-lifecycle-all','cycle'],['.home-primary-cta','arrow-right'],['.home-ghost-cta','terminal']].forEach(function(rule){root.querySelectorAll(rule[0]).forEach(function(el){ArkUI.actionIcon(el,rule[1]);});});
 };
})();
