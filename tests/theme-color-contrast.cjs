/* The palette contract. Named regressions: two theme files both declaring all
   eight selectors (the cascade picked the palette), semantic tokens aliased to
   the brand color, muted and faint text sharing one value, neutral surfaces
   that measured 1.08:1 apart, role colors with no shades, and families that
   reused one another's colors. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const darkKeys = ['ghost','clay','ochre','marine','dusk'], lightKeys = ['glacier','grove','moss','bone','dawn'];
const names = [...darkKeys, ...lightKeys];
const generated = fs.readFileSync('css/themes.css','utf8');
const curated = fs.readFileSync('css/flux-themes.css','utf8');
function declarations(block) { return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()])); }

// css/flux-themes.css is the single authority: it redeclares every color token
// the generated file sets for each theme, so load order cannot decide colors.
const rules = [...curated.matchAll(/([^{}]+)\{([^}]+)\}/g)].map(m=>({selectors:m[1].replace(/\/\*[\s\S]*?\*\//g,'').split(',').map(s=>s.trim()),decls:declarations(m[2])}));
function curatedFor(name) {
  const vars = {};
  for (const rule of rules) if (rule.selectors.some(s=>s===':root'||s===`:root[data-theme="${name}"]`)) Object.assign(vars, rule.decls);
  return vars;
}
for (const match of generated.matchAll(/:root\[data-theme="([^"]+)"\]\s*\{([^}]+)/g)) {
  const own = curatedFor(match[1]);
  const missing = Object.keys(declarations(match[2])).filter(key=>!(key in own));
  assert.deepEqual(missing, [], `flux-themes.css must own every ${match[1]} color token`);
}

function resolve(vars, key, depth = 0) {
  assert(depth < 8, `--${key} has a var() cycle`);
  const value = vars[key]; assert(value !== undefined, `--${key} is undefined`);
  return value.replace(/var\(--([\w-]+)\)/g, (_, ref) => resolve(vars, ref, depth + 1));
}
function hsl(input) { const [h,s,l,a=1] = input.split(/[\s/%]+/).filter(Boolean).map(Number); return {h,s,l,a}; }
function rgb(input) {
  const {h,s,l} = hsl(input);
  const light=l/100,sat=s/100,chroma=(1-Math.abs(2*light-1))*sat;
  const x=chroma*(1-Math.abs((h/60)%2-1)),m=light-chroma/2;
  return (h<60?[chroma,x,0]:h<120?[x,chroma,0]:h<180?[0,chroma,x]:h<240?[0,x,chroma]:h<300?[x,0,chroma]:[chroma,0,x]).map(v=>v+m);
}
const over=(input,bg)=>{const {a}=hsl(input);return rgb(input).map((v,i)=>v*a+bg[i]*(1-a));};
function luminance(c) { return c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); }
function contrast(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
const hueGap=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d);};
// sRGB -> OKLab / OKLCH: perceptual lightness, chroma and hue.
function oklab(c) {
  const [r,g,b]=c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s];
}
const okDistance=(a,b)=>{const x=oklab(a),y=oklab(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);};
const okLCH=c=>{const [L,a,b]=oklab(c);return {L,C:Math.hypot(a,b),h:(Math.atan2(b,a)*180/Math.PI+360)%360};};

const ctx=vm.createContext({});for(const file of ['js/tokens.js','js/content/theme.js','js/content/theme-data.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.ArkTheme.get().themes)),{},'the shipped palette must not silently override the curated colors');

const families = {};
const requiredKeys = Object.keys(declarations(generated.match(/:root\[data-theme="ghost"\]\s*\{([^}]+)/)[1]));
for (const name of names) {
  const vars = curatedFor(name), get = key => resolve(vars, key);
  for (const key of requiredKeys) get(key);
  const canvas=rgb(get('canvas')), surface=rgb(get('surface')), raised=rgb(get('raised')), nested=rgb(get('nested'));

  // Roles: secondary is the main CTA; every action token resolves to it.
  for (const key of ['action','complement','action-bg']) assert.equal(get(key), get('secondary'), `${name} --${key} must be the secondary (main CTA) color`);
  for (const key of ['signal','accent']) assert.equal(get(key), get('primary'), `${name} --${key} is the primary identity color`);
  for (const [key, role] of [['trust','success'],['live','success'],['drift','warning'],['role','reference']]) assert.equal(get(key), get(role), `${name} --${key} maps to --${role}`);

  const roles = ['primary','secondary','reference','success','warning','danger'];
  for (let i=0;i<roles.length;i++) for (let j=i+1;j<roles.length;j++) {
    const distance=okDistance(rgb(get(roles[i])),rgb(get(roles[j])));
    assert(distance>=.06, `${name} ${roles[i]}/${roles[j]} are ${distance.toFixed(3)} apart (OKLab); they must read as different colors`);
  }

  // Harmony: the three roles share one lightness band and a relaxed chroma, and
  // the neutrals carry the primary hue.
  const lch=['primary','secondary','reference'].map(r=>okLCH(rgb(get(r))));
  const Ls=lch.map(x=>x.L);
  assert(Math.max(...Ls)-Math.min(...Ls)<=.08, `${name} role lightness must be balanced (spread ${(Math.max(...Ls)-Math.min(...Ls)).toFixed(3)})`);
  lch.forEach((x,i)=>assert(x.C<=.13, `${name} ${['primary','secondary','reference'][i]} chroma ${x.C.toFixed(3)} is not relaxed`));
  const canvasLCH=okLCH(canvas);
  assert(canvasLCH.C>.004 && hueGap(canvasLCH.h,lch[0].h)<=30, `${name} canvas must be tinted toward the primary hue`);

  // Shades: a full ladder per role, each step a real step, base = the bare token.
  for (const role of roles) {
    assert.equal(get(role+'-500'), get(role), `${name} ${role}-500 is the base`);
    const ladder=['100','200','300','400','500'].map(step=>contrast(rgb(get(`${role}-${step}`)),canvas));
    for (let i=1;i<ladder.length;i++) assert(ladder[i]>ladder[i-1]*1.04, `${name} ${role} shade ${i} must climb away from the canvas`);
    const towardText=[500,600,700].map(step=>contrast(rgb(get(`${role}-${step}`)),rgb(get('text-strong'))));
    assert(towardText[0]>towardText[1]&&towardText[1]>towardText[2], `${name} ${role}-600/-700 must move toward strong text`);
    assert(contrast(rgb(get(role)),rgb(get(role+'-ink')))>=4.5, `${name} text on filled ${role} must be readable`);
    for (const [where, bg] of [['canvas',canvas],['surface',surface],['raised',raised]]) {
      const ratio=contrast(rgb(get(role)),bg);
      assert(ratio>=4.5, `${name} ${role} on ${where}: ${ratio.toFixed(2)}:1 is below small-text contrast`);
    }
  }

  // Soft components put -700 text on a -100 fill; it must read.
  for (const role of roles) assert(contrast(rgb(get(role+'-700')),rgb(get(role+'-100')))>=4.5, `${name} ${role}-700 on ${role}-100 must be readable`);
  // The tonal scale runs light to dark in even perceptual steps.
  for (const role of ['primary','secondary','reference']) {
    const tones=[50,100,200,300,400,500,600,700,800,900,950].map(t=>okLCH(rgb(get(`${role}-tone-${t}`))).L);
    for (let i=1;i<tones.length;i++) assert(tones[i]<tones[i-1], `${name} ${role} tone scale must darken step by step`);
  }

  for (const key of ['text-strong','text','text-muted','text-faint']) for (const [where, bg] of [['canvas',canvas],['surface',surface]]) {
    const ratio=contrast(rgb(get(key)),bg);
    assert(ratio>=4.5, `${name} ${key} on ${where}: ${ratio.toFixed(2)}:1 is below small-text contrast`);
  }
  const ladder=['text-strong','text','text-muted','text-faint'].map(key=>contrast(rgb(get(key)),canvas));
  for (let i=1;i<ladder.length;i++) assert(ladder[i-1]/ladder[i]>=1.15, `${name} text ladder step ${i} is not distinct`);

  const dark=darkKeys.includes(name);
  const steps=dark?[[canvas,surface],[surface,raised],[raised,nested]]:[[nested,canvas],[canvas,surface]];
  steps.forEach(([a,b],i)=>assert(contrast(a,b)>=1.12, `${name} surface step ${i} measures ${contrast(a,b).toFixed(2)}:1`));
  assert(contrast(over(get('border-default'),canvas),canvas)>=1.6, `${name} default border must be visible on canvas`);
  assert(contrast(over(get('border-default'),surface),surface)>=1.6, `${name} default border must be visible on surfaces`);
  families[name]=['primary','secondary','reference'].map(role=>okLCH(rgb(get(role))).h);
}

// Five families per appearance, none repeating another's colors; each family
// keeps its hues across its dark and light palettes.
for (const keys of [darkKeys, lightKeys]) {
  for (let i=0;i<keys.length;i++) for (let j=i+1;j<keys.length;j++)
  { assert(hueGap(families[keys[i]][0],families[keys[j]][0])>=15, `${keys[i]}/${keys[j]} must not share a primary hue`);
    assert(hueGap(families[keys[i]][1],families[keys[j]][1])>=25, `${keys[i]}/${keys[j]} must not repeat the main-CTA hue`); }
}
darkKeys.forEach((key,i)=>families[key].forEach((h,r)=>assert(hueGap(h,families[lightKeys[i]][r])<=8, `${key}/${lightKeys[i]} are one family (role ${r} hue)`)));

// Component styles take color from tokens, not literals.
for (const file of ['css/hero-motion.css','css/fallback.css','css/studio.css','css/color-system.css','css/home-drafting.css','css/guided-page.css','css/explorer.css'])
  assert(!/#[0-9a-f]{3,8}\b(?![^(]*mask)|rgba?\(\s*\d/i.test(fs.readFileSync(file,'utf8').replace(/mask-image:[^;]+;/g,'')), `${file} must not hard-code colors`);

console.log('PASS: one authoritative source; five harmonious families (balanced lightness, relaxed chroma, tinted neutrals) in dark and light; secondary owns the main CTA; perceptually distinct roles with semantic shades and tonal scales; readable inks, soft-button text, a four-step text ladder and separated surfaces in all ten palettes.');
