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
    const a=get(roles[i]), b=get(roles[j]);
    assert(hueGap(hsl(a).h,hsl(b).h)>=20, `${name} ${roles[i]}/${roles[j]} hues must differ`);
    const distance=Math.sqrt(rgb(a).reduce((sum,v,k)=>sum+(v-rgb(b)[k])**2,0));
    assert(distance>.12, `${name} ${roles[i]}/${roles[j]} must not collapse into one color`);
  }

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

  // Relaxed: role inks stay dimmed, not neon.
  for (const role of ['primary','secondary','reference']) assert(hsl(get(role)).s<=50, `${name} ${role} must stay relaxed (saturation <= 50%)`);

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
  families[name]=['primary','secondary','reference'].map(role=>Math.round(hsl(get(role)).h));
}

// Five families per appearance, none repeating another's colors; each family
// keeps its hues across its dark and light palettes.
for (const keys of [darkKeys, lightKeys]) {
  assert.equal(new Set(keys.map(k=>families[k].join())).size, 5, 'five distinct families per appearance');
  assert.equal(new Set(keys.map(k=>families[k][0])).size, 5, 'no two families share a primary hue');
}
darkKeys.forEach((key,i)=>assert.deepEqual(families[key], families[lightKeys[i]], `${key}/${lightKeys[i]} are one family`));

// Component styles take color from tokens, not literals.
for (const file of ['css/hero-motion.css','css/fallback.css','css/studio.css','css/color-system.css','css/home-drafting.css','css/guided-page.css','css/explorer.css'])
  assert(!/#[0-9a-f]{3,8}\b(?![^(]*mask)|rgba?\(\s*\d/i.test(fs.readFileSync(file,'utf8').replace(/mask-image:[^;]+;/g,'')), `${file} must not hard-code colors`);

console.log('PASS: one authoritative source; five relaxed families in dark and light; secondary owns the main CTA; distinct roles with full shade ladders; readable inks, a four-step text ladder and separated surfaces in all ten palettes.');
