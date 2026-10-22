const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('scripts/settings-entry.js','utf8');
const motion=source.slice(source.indexOf('function stopPattern()'),source.indexOf('function persistPattern()'));
let timer=null,scans=0,settled=0,paused=false,page='zero';
const context={meshPattern:{refresh(){settled++;},animate(){scans++;}},values:{animated:false,delay:1.2},motif:'blocks',disposed:false,loopTimer:0,document:{hidden:false},reduced:{matches:false},ArkUI:{sceneState:{get:()=>({paused,page})}},clearTimeout:()=>{timer=null;},setTimeout:(fn,ms)=>{timer={fn,ms};return 1;}};
vm.createContext(context);vm.runInContext(motion,context);
context.schedulePattern();assert.equal(timer,null,'explicit static preference stays static');
context.values.animated=true;context.schedulePattern();assert.equal(timer.ms,1200);
// One wave per real change, never a loop (memory defxn_animation_must_settle): until 2026-10-19
// the wave re-armed itself 3200 ms after each scan, so a settled page requested ~20 frames/s
// forever (tests/browser/idle-frames.mjs). The fabric's scan paints its own settled frame and
// stops; nothing may be scheduled after it until schedulePattern() is called by a real change.
{const fire=timer.fn;timer=null;fire();}assert.equal(scans,1);assert.equal(timer,null,'after the wave nothing is scheduled: the wave does not loop');
assert.equal(context.loopTimer,0,'no timer handle survives the wave');
context.schedulePattern();assert.equal(timer.ms,1200,'the next real change re-arms exactly one wave');
context.values.delay=8;context.schedulePattern();assert.equal(timer.ms,8000);
context.document.hidden=true;context.schedulePattern();assert.equal(timer,null);
context.document.hidden=false;context.reduced.matches=true;context.schedulePattern();assert.equal(timer,null);
context.reduced.matches=false;paused=true;context.schedulePattern();assert.equal(timer,null);
// The scan plays on the home only (the owner's call 2026-10-22): another route keeps the pattern at rest, and the home
// plays it again.
paused=false;page='about';context.schedulePattern();assert.equal(timer,null,'no scan off the home');
page='zero';context.schedulePattern();assert.equal(timer.ms,8000,'the home scans again');
assert(/if\(state\.page!==scenePage\)\{scenePage=state\.page;schedulePattern\(\);\}/.test(source),'a route change re-decides the scan (stops it when leaving the home)');
paused=false;context.schedulePattern();assert.ok(timer);
context.values.animated=false;context.schedulePattern();assert.equal(timer,null);assert(settled>0);
context.values.animated=true;context.motif='none';context.schedulePattern();assert.equal(timer,null);
context.motif='nodes';context.schedulePattern();assert.ok(timer);context.disposed=true;context.schedulePattern();assert.equal(timer,null);
const config=source.slice(source.indexOf('function patternValues('),source.indexOf('values=patternValues('));
const storage={saved:{blocks:{scale:130,density:90,softness:20,delay:4,animated:true},wave:{scale:70},nodes:{animated:false}},controls:{scale:{min:60,max:180,value:100},density:{min:20,max:100,value:60},softness:{min:0,max:100,value:0},delay:{min:.3,max:10,value:1.2}},SITE_DEFAULTS:{}};
vm.createContext(storage);vm.runInContext(config,storage);
assert.equal(storage.patternValues('blocks').scale,140);assert.equal(storage.patternValues('wave').scale,80);
assert.equal(storage.patternValues('traces').animated,true,'new patterns move by default');
assert.equal(storage.patternValues('nodes').animated,false,'saved opt-out is not overwritten');
storage.saved.layers={scale:999,delay:NaN};assert.equal(storage.patternValues('layers').scale,140);assert.equal(storage.patternValues('layers').delay,1.2);
console.log('PASS: independent saved settings, new motion defaults, finite waves, one wave per change (no loop), hidden/reduced/global pause, disable and disposal.');

/* ArkSiteDefaults (js/content/settings-defaults.js) fallback: patternValues()'s per-control
   fallback must check SITE_DEFAULTS.patternConfig[name][key] before falling back to the
   hardcoded controls[key].value -- and a real visitor's own saved choice (storage.saved)
   must still win over the site default, exactly the same precedence read(key,fallback)
   already gives a real visitor's own localStorage over the plain hardcoded literal. */
const withDefaults={saved:{nodes:{density:90}},controls:storage.controls,SITE_DEFAULTS:{patternConfig:{traces:{density:35,softness:40,animated:false},nodes:{density:20,softness:60}}}};
vm.createContext(withDefaults);vm.runInContext(config,withDefaults);
// A motif with no saved override at all takes every numeric field from the site default,
// snapped to the nearest preset the same as any other source, and its animated default too.
assert.equal(withDefaults.patternValues('traces').density,35,'a motif with no stored override takes its numeric default from the site default');
assert.equal(withDefaults.patternValues('traces').softness,40,'the site default covers softness too, not just the snapped fields');
assert.equal(withDefaults.patternValues('traces').animated,false,'the site default can turn animation off by default');
// A motif the site default does not mention at all still falls back to the hardcoded literal.
assert.equal(withDefaults.patternValues('blocks').density,60,'a motif absent from SITE_DEFAULTS.patternConfig falls back to the hardcoded literal');
assert.equal(withDefaults.patternValues('blocks').animated,true,'an absent site default still defaults animated true');
// Precedence proof: a real visitor's own stored value wins over the site default, even
// though the site default also covers that exact control for that exact motif.
assert.equal(withDefaults.patternValues('nodes').density,90,'a real visitor\'s own stored choice wins over the site default, never overridden by it');
console.log('PASS: SITE_DEFAULTS covers an uncovered motif/control, and a real visitor\'s own stored choice still wins over it.');

/* The initial theme/motif reads (let theme=read('flux-chain-theme', SITE_DEFAULTS.theme||
   'ghost')  and  let motif=read('defxn-motif-v1', SITE_DEFAULTS.motif||'blocks')) get the
   same ArkSiteDefaults fallback, sliced verbatim from the real source the same way the
   motion/patternValues blocks above are. */
const themeEnd="let theme=ownTheme||publishedAny(SITE_DEFAULTS.theme)||'ember',renderer,frame=0;";
const themeSlice=source.slice(source.indexOf('const read='),source.indexOf(themeEnd)+themeEnd.length);
const motifSlice=source.slice(source.indexOf('const motifs='),source.indexOf("if(!motifs.includes(motif))motif='blocks';")+"if(!motifs.includes(motif))motif='blocks';".length);
const generatedThemes=fs.readFileSync('scripts/theme-options.js','utf8');
const realThemes=JSON.parse(generatedThemes.match(/export default (\[[^\]]+\]);/)[1]);
const realLegacy=JSON.parse(generatedThemes.match(/legacyThemeIds = (\{.*\});/)[1]);
function freshReadContext(storeSeed,siteDefaults){
  const store=Object.assign({},storeSeed);
  return {themes:realThemes,legacyThemeIds:realLegacy,previewOnly:false,SITE_DEFAULTS:siteDefaults,store,localStorage:{getItem:(k)=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=v;}}};
}
// (the slices declare `let theme`/`let motif`, which -- correctly, per spec -- never attach
// to the vm context object; this one extra line is test glue, not source, exposing them so
// the assertions below can read what the real statements actually computed)
const exposeThemeMotif='\nthis.theme=theme;this.motif=motif;';
// Fresh visitor, no site defaults at all: today's plain hardcoded literals, unchanged.
let readContext=freshReadContext({},{});
vm.createContext(readContext);vm.runInContext(themeSlice+'\n'+motifSlice+exposeThemeMotif,readContext);
assert.equal(readContext.theme,'ember','with no SITE_DEFAULTS and nothing stored, theme stays the hardcoded default (ember, the SDK id of the old ghost)');
assert.deepEqual(readContext.store,{},'a fresh visitor with no choice writes nothing: a default is never saved as their choice');
assert.equal(readContext.motif,'blocks','with no SITE_DEFAULTS and nothing stored, motif stays the hardcoded blocks default');
// Fresh visitor, a site default set: the site default actually changes what a fresh run produces.
readContext=freshReadContext({},{theme:'marine',motif:'traces'});
vm.createContext(readContext);vm.runInContext(themeSlice+'\n'+motifSlice+exposeThemeMotif,readContext);
assert.equal(readContext.theme,'defxn-dune','a fresh visitor with no stored choice gets the site default theme (an OLD-key default reads as its published id)');
assert.deepEqual(readContext.store,{},'reading a site default writes nothing');
assert.equal(readContext.motif,'traces','a fresh visitor with no stored choice gets the site default motif');
// Precedence proof: a real visitor's own already-stored choice still wins over the very same
// site default that just took effect for a fresh visitor above.
readContext=freshReadContext({'flux-chain-theme':'clay','defxn-motif-v1':'nodes'},{theme:'marine',motif:'traces'});
vm.createContext(readContext);vm.runInContext(themeSlice+'\n'+motifSlice+exposeThemeMotif,readContext);
assert.equal(readContext.theme,'defxn-tide','a visitor\'s own stored theme choice (an OLD key) wins over the site default, never overridden by it');
assert.equal(readContext.store['defxn-theme-v1'],'defxn-tide','the old choice is written forward ONCE under the published key');
assert.equal(readContext.store['flux-chain-theme'],'clay','the old record is never rewritten or removed (future law)');
let rc2=freshReadContext({'flux-chain-theme':'moss'},{});
vm.createContext(rc2);vm.runInContext(themeSlice+'\nthis.theme=theme;',rc2);
assert.equal(rc2.theme,'defxn-moss-light','an old moss choice is Moss LIGHT');
rc2=freshReadContext({'flux-chain-theme':'clay','defxn-theme-v1':'defxn-moss'},{theme:'ghost'});
vm.createContext(rc2);vm.runInContext(themeSlice+'\nthis.theme=theme;',rc2);
assert.equal(rc2.theme,'defxn-moss','the published key beats a stale old key, and a published moss is Moss DARK');
assert.equal(rc2.store['defxn-theme-v1'],'defxn-moss','a published choice is not overwritten by migration');
assert.equal(readContext.motif,'nodes','a visitor\'s own stored motif choice wins over the site default, never overridden by it');
console.log('PASS: the initial theme/motif reads take the site default only for a fresh visitor, and a real visitor\'s own stored choice always wins over it.');
