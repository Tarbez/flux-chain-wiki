/* Named regressions: faint Ghost overrides and light-theme accent labels made
   the full palette unusable for small text. Measure the resulting paint colors. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const names = ['clay','ochre','ghost','marine','grove','moss','glacier','bone'];
const base = fs.readFileSync('css/themes.css','utf8');
const curated = fs.readFileSync('css/flux-themes.css','utf8');
function declarations(block) { return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()])); }
const defaults = declarations(base.match(/:root\s*\{([^}]+)/)[1]);
function rgb(input) {
  const [h,s,l] = input.split(/[\s/%]+/).filter(Boolean).map(Number);
  const light=l/100,sat=s/100,chroma=(1-Math.abs(2*light-1))*sat;
  const x=chroma*(1-Math.abs((h/60)%2-1)),m=light-chroma/2;
  return (h<60?[chroma,x,0]:h<120?[x,chroma,0]:h<180?[0,chroma,x]:h<240?[0,x,chroma]:h<300?[x,0,chroma]:[chroma,0,x]).map(v=>v+m);
}
const mix=(a,b,weight)=>a.map((v,i)=>v*weight+b[i]*(1-weight));
function luminance(c) { return c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); }
function contrast(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
const ctx=vm.createContext({});for(const file of ['js/tokens.js','js/content/theme.js','js/content/theme-data.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.ArkTheme.get().themes)),{},'the shipped palette must not silently darken the SDK contrast colors');
for(const name of names) {
  const vars={...defaults};
  for(const css of [base,curated]) for(const match of css.matchAll(/:root\[data-theme="([^"]+)"\]\s*\{([^}]+)/g)) if(match[1]===name)Object.assign(vars,declarations(match[2]));
  const canvas=rgb(vars.canvas),ink=rgb(vars['text-strong']);
  const light=['bone','glacier','moss','grove'].includes(name);
  const roles=['primary','complement','reference'];
  for(const role of roles) {
    const color=rgb(vars[role]);
    const ratio=contrast(color,canvas);
    assert(ratio>=4.5,`${name} ${role}: ${ratio.toFixed(2)}:1 is below small-text contrast`);
    if(role==='complement')assert(contrast(color,mix(color,canvas,.15))>=4.5,`${name} run action must stay readable over its tint`);
  }
  assert(contrast(rgb(vars.complement),rgb(vars['text-inverse']))>=4.5,`${name} filled complementary action must have readable inverse text`);
  for (let i=0;i<roles.length;i++) for(let j=i+1;j<roles.length;j++) {
    const a=rgb(vars[roles[i]]),b=rgb(vars[roles[j]]);
    const distance=Math.sqrt(a.reduce((sum,v,k)=>sum+(v-b[k])**2,0));
    assert(distance>.18,`${name} ${roles[i]}/${roles[j]} must not collapse into the same grey tint`);
  }
}
console.log('PASS: eight theme palettes provide at least 4.5:1 contrast for all three distinct role inks and complementary action labels.');
