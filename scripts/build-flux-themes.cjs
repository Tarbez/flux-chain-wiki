#!/usr/bin/env node
/* Generates css/flux-themes.css, the single source of DEFXN color.

     node scripts/build-flux-themes.cjs

   Built in OKLCH (perceptual lightness/chroma/hue), written out as HSL
   triplets so the site's `hsl(var(--x))` convention keeps working.

   Harmony comes from three rules, not from picking pretty colors one by one:
   1. Each family states a hue relationship (analogous, split-complementary,
      complementary) between primary, secondary and reference.
   2. The three roles share one lightness and one chroma per appearance, so
      no role shouts over another; only hue tells them apart.
   3. Neutrals (canvas, surfaces, text, borders) carry a trace of the primary
      hue, so the whole page sits in the same light.

   Roles and where they may appear (see docs/brand/DEFXN.md):
     primary    identity: the hero accent and a few small marks. Never a button.
     secondary  the main call to action.
     reference  secondary actions, links, selection.
     success / warning / danger  state only.

   Every role has semantic shades, used by css/components.css:
     -100 subtle fill   -200 hover fill    -300 border    -400 strong border / mark
     -500 base (= bare token)   -600 hover on a fill   -700 text on a subtle fill
     -ink text on a -500 fill
   and a full tonal scale --{role}-tone-50 ... -950 for illustration and the
   /palette page. */
const fs = require('node:fs');
const path = require('node:path');

const families = [
  // Hues are OKLCH degrees. Key pairs keep earlier stored preferences valid.
  { name:'Ember', dark:'ghost',  light:'glacier', rule:'split-complementary', primary:45,  secondary:192, reference:250 },
  { name:'Tide',  dark:'clay',   light:'grove',   rule:'analogous',           primary:232, secondary:282, reference:190 },
  { name:'Moss',  dark:'ochre',  light:'moss',    rule:'earth analogous',     primary:132, secondary:46,  reference:236 },
  { name:'Dune',  dark:'marine', light:'bone',    rule:'complementary',       primary:66,  secondary:248, reference:318 },
  { name:'Dusk',  dark:'dusk',   light:'dawn',    rule:'analogous',           primary:300, secondary:350, reference:228 },
];
// State hues are searched within these ranges for the most separation from a family's roles.
const STATE_RANGES = { danger:[10,30], warning:[74,100], success:[132,168] };

/* ---- OKLCH -> sRGB ------------------------------------------------------- */
function oklchToLinear(L,C,h) {
  const a=C*Math.cos(h*Math.PI/180), b=C*Math.sin(h*Math.PI/180);
  const l_=L+.3963377774*a+.2158037573*b, m_=L-.1055613458*a-.0638541728*b, s_=L-.0894841775*a-1.2914855480*b;
  const l=l_**3, m=m_**3, s=s_**3;
  return [4.0767416621*l-3.3077115913*m+.2309699292*s, -1.2684380046*l+2.6097574011*m-.3413193965*s, -.0041960863*l-.7034186147*m+1.7076147010*s];
}
const gamma=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
const inGamut=lin=>lin.every(v=>v>=-1e-4&&v<=1+1e-4);
// Map into sRGB by reducing chroma at fixed lightness and hue.
function oklch(L,C,h) {
  let c=C, lin=oklchToLinear(L,c,h);
  while(!inGamut(lin)&&c>0){c-=.002;lin=oklchToLinear(L,c,h);}
  return lin.map(v=>Math.min(1,Math.max(0,gamma(v))));
}
function rgbToHsl([r,g,b]) {
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min; let h=0,s=0;
  if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;}
  return [h,s*100,l*100];
}
const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const fmt=rgb=>{const [h,s,l]=rgbToHsl(rgb);return `${Math.round(h)} ${+s.toFixed(1)}% ${+l.toFixed(1)}%`;};
const okDist=(a,b)=>{ // perceptual distance between two OKLCH specs
  const ab=([L,C,h])=>[L,C*Math.cos(h*Math.PI/180),C*Math.sin(h*Math.PI/180)];
  const x=ab(a),y=ab(b); return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);
};

/* ---- per-appearance targets ---------------------------------------------- */
const MODE = {
  dark: {
    neutral: { canvas:.16, depth:.19, surface:.228, raised:.28, nested:.335, overlay:.2, strong:.94, text:.85, muted:.73, faint:.645, tint:.012 },
    role: { L:.74, C:.085, secondaryC:.1 },
    shade: { 100:[.24,.04], 200:[.285,.05], 300:[.39,.065], 400:[.53,.08], 700:[.87,.055] },
    hoverDL: +.055, solveDir: +1,
  },
  light: {
    neutral: { canvas:.943, depth:.905, surface:.985, raised:1, nested:.89, overlay:.975, strong:.24, text:.365, muted:.465, faint:.515, tint:.01 },
    role: { L:.53, C:.1, secondaryC:.11 },
    shade: { 100:[.935,.025], 200:[.9,.04], 300:[.82,.065], 400:[.7,.085], 700:[.38,.085] },
    hoverDL: -.055, solveDir: -1,
  },
};
const TONES = [[50,.975,.25],[100,.94,.4],[200,.88,.6],[300,.8,.8],[400,.72,.95],[500,.64,1],[600,.56,.95],[700,.47,.85],[800,.39,.7],[900,.3,.55],[950,.23,.4]];

function palette(f, mode) {
  const M=MODE[mode], n=M.neutral, hue=f.primary, dark=mode==='dark';
  const neutral=(L,c=n.tint)=>oklch(L,L>=.999?0:c,hue);
  const out={
    canvas:neutral(n.canvas), depth:neutral(n.depth), surface:neutral(n.surface), raised:neutral(n.raised), nested:neutral(n.nested), overlay:neutral(n.overlay),
    'text-strong':neutral(n.strong,.01), text:neutral(n.text,.012), 'text-muted':neutral(n.muted,.014), 'text-faint':neutral(n.faint,.014),
  };
  out['text-inverse']=dark?out.canvas:oklch(1,0,0);
  const bgs=[out.canvas,out.surface,out.raised];

  // States sit at the role lightness with a little more chroma, at the hue
  // in their range farthest (perceptually) from this family's three roles.
  const roleSpecs=['primary','secondary','reference'].map(r=>[M.role.L,r==='secondary'?M.role.secondaryC:M.role.C,f[r]]);
  const hues={primary:f.primary,secondary:f.secondary,reference:f.reference};
  const chroma={primary:M.role.C,secondary:M.role.secondaryC,reference:M.role.C,success:M.role.C+.02,warning:M.role.C+.03,danger:M.role.C+.03};
  for (const [state,[lo,hi]] of Object.entries(STATE_RANGES)) {
    let best=lo,score=-1;
    for (let h=lo;h<=hi;h++){const s=Math.min(...roleSpecs.map(r=>okDist([M.role.L,chroma[state],h],r)));if(s>score){score=s;best=h;}}
    hues[state]=best;
    roleSpecs.push([M.role.L,chroma[state],best]); // later states also keep away from this one
  }

  for (const role of Object.keys(hues)) {
    const h=hues[role], C=chroma[role];
    // Base: the role lightness, nudged only as far as contrast requires.
    let L=M.role.L;
    const target=role==='secondary'?5:4.6;
    while(!bgs.every(bg=>contrast(oklch(L,C,h),bg)>=target)) L+=M.solveDir*.005;
    const base=oklch(L,C,h);
    out[role]=base; out[role+'-500']=base;
    for (const [step,[sL,sC]] of Object.entries(M.shade)) out[`${role}-${step}`]=oklch(sL,sC*(C/M.role.C),h);
    out[role+'-600']=oklch(L+M.hoverDL,C,h);
    out[role+'-ink']=[out.canvas,oklch(1,0,0),out['text-strong']].sort((a,b)=>contrast(b,base)-contrast(a,base))[0];
    for (const [t,tL,tC] of TONES) out[`${role}-tone-${t}`]=oklch(tL,C*1.25*tC,h);
  }
  out._hues=hues;
  return out;
}

const roles=['primary','secondary','reference','success','warning','danger'];
const coreOrder=['canvas','depth','surface','raised','nested','overlay','text-strong','text','text-muted','text-faint','text-inverse'];
function block(selectors,f,mode){
  const p=palette(f,mode), dark=mode==='dark', hue=f.primary;
  const borderInk=fmt(dark?oklch(.9,.02,hue):oklch(.25,.03,hue));
  const lines=[' '+coreOrder.map(k=>`--${k}:${fmt(p[k])};`).join(' ')];
  lines.push(dark
    ? ` --border-subtle:${borderInk} / .1; --border-default:${borderInk} / .22; --border-strong:${borderInk} / .36;`
    : ` --border-subtle:${borderInk} / .12; --border-default:${borderInk} / .26; --border-strong:${borderInk} / .4;`);
  for (const r of roles) {
    lines.push(' '+[r,'100','200','300','400','500','600','700','ink'].map(s=>s===r?`--${r}:${fmt(p[r])};`:`--${r}-${s}:${fmt(p[`${r}-${s}`])};`).join(' '));
    lines.push(' '+TONES.map(([t])=>`--${r}-tone-${t}:${fmt(p[`${r}-tone-${t}`])};`).join(' '));
  }
  const sh=fmt(oklch(dark?.1:.3,.02,hue));
  lines.push(dark
    ? ` --theme-shadow:${sh} / .6; --theme-shadow-color:${sh}; --theme-shadow-alpha:.6; color-scheme:dark;`
    : ` --theme-shadow:${sh} / .14; --theme-shadow-color:${sh}; --theme-shadow-alpha:.14; color-scheme:light;`);
  return `/* ${f.name} ${mode} · ${f.rule} · hues ${f.primary}/${f.secondary}/${f.reference} */\n${selectors.join(',')} {\n${lines.join('\n')}\n}\n`;
}

const alias = `
 --action:var(--secondary); --action-ink:var(--secondary-ink); --action-hover:var(--secondary-600);
 --complement:var(--secondary); --signal:var(--primary);
 --accent:var(--primary); --accent-strong:var(--primary-600); --accent-subtle:var(--primary-100);
 --trust:var(--success); --live:var(--success); --role:var(--reference); --badge:var(--primary);
 --drift:var(--warning); --hidden:var(--text-faint); --info:var(--reference);
 --border:var(--border-default); --border-soft:var(--border-subtle);
 --canvas-glow-primary:var(--primary) / .03; --canvas-glow-secondary:var(--secondary) / .02; --canvas-glow-edge:var(--reference) / .015;
 --dak-canvas:var(--canvas); --dak-surface-1:var(--surface); --dak-surface-2:var(--raised); --dak-surface-3:var(--nested);
 --dak-text-strong:var(--text-strong); --dak-text:var(--text); --dak-text-muted:var(--text-muted); --dak-text-faint:var(--text-faint); --dak-text-inverse:var(--text-inverse);
 --dak-accent:var(--primary); --dak-accent-subtle:var(--primary-100); --dak-accent-strong:var(--primary-600);
 --dak-border-subtle:var(--border-subtle); --dak-border-default:var(--border-default); --dak-border-strong:var(--border-strong);
 --surface-canvas:var(--canvas); --surface-1:var(--surface); --surface-2:var(--raised); --surface-3:var(--nested); --surface-overlay:var(--overlay);
 --surface-01:var(--surface); --surface-02:var(--raised); --surface-03:var(--nested);
 --foreground-strong:var(--text-strong); --foreground-default:var(--text); --foreground-muted:var(--text-muted); --foreground-faint:var(--text-faint); --foreground-inverse:var(--text-inverse);
 --action-bg:var(--secondary); --action-fg:var(--secondary-ink); --action-border:var(--secondary); --action-hover-bg:var(--secondary-600);
 --action-muted-bg:var(--secondary-100); --action-muted-fg:var(--secondary-700);
 --page-background:var(--canvas); --background-depth:var(--depth); --surface-base:var(--surface); --surface-raised:var(--raised);
 --overlay-soft:var(--nested); --overlay-strong:var(--overlay); --divider-soft:var(--border-subtle); --divider-strong:var(--border-strong);
 --theme-glow:var(--primary); --primary-light:var(--primary-700); --primary-standard:var(--primary); --primary-bold:var(--primary-600); --accent-medium:var(--primary-400);
 --success-standard:var(--success); --warning-standard:var(--warning); --error-standard:var(--danger); --danger-bold:var(--danger); --info-standard:var(--reference);`;

const allKeys=families.flatMap(f=>[f.dark,f.light]);
let css=`/* GENERATED by scripts/build-flux-themes.cjs — edit the families there, then rerun.
   The single source of DEFXN color. css/themes.css (SDK-generated) still loads
   first for fonts and sizes; every color token it declares is redeclared here,
   which tests/theme-color-contrast.cjs enforces. Components that use these
   tokens live in css/components.css; the /palette page shows every scale. */\n\n`;
families.forEach((f,i)=>{
  css+=block((i===0?[':root']:[]).concat(`:root[data-theme="${f.dark}"]`),f,'dark');
  css+=block([`:root[data-theme="${f.light}"]`],f,'light');
});
css+=`\n/* Theme picker swatches: each palette's own primary and secondary. */\n`;
families.forEach(f=>[[f.dark,'dark'],[f.light,'light']].forEach(([key,mode])=>{
  const p=palette(f,mode);
  css+=`.settings-choice[data-theme-choice="${key}"]{--choice-ink:${fmt(p.primary)};--choice-ink-2:${fmt(p.secondary)};}\n`;
}));
css+=`\n/* Role aliases and legacy SDK names, shared by every palette. */\n${[':root',...allKeys.map(k=>`:root[data-theme="${k}"]`)].join(',')} {${alias}\n}\n`;

fs.writeFileSync(path.join(__dirname,'..','css','flux-themes.css'),css);
fs.writeFileSync(path.join(__dirname,'theme-families.json'),JSON.stringify(families.map(f=>({...f,states:{dark:palette(f,'dark')._hues,light:palette(f,'light')._hues}})),null,1)+'\n');
console.log(`wrote css/flux-themes.css (${families.length*2} palettes)`);
