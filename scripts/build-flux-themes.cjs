#!/usr/bin/env node
/* Generates css/flux-themes.css, the single source of DEFXN color.

     node scripts/build-flux-themes.cjs

   Five relaxed families, each with a dark and a light palette. A family names
   three hues; lightness is solved here so every ink clears its contrast target,
   which keeps saturation low (dimmed, calm) without giving up legibility.

   Roles and where they may appear:
     primary    identity. A few brand moments per view (the hero accent, small
                marks). Never a button, never a heading color.
     secondary  the main call to action. The only filled-button color.
     reference  secondary actions and links. Only on things you can activate.
     success / warning / danger
                state only, never decoration.

   Each role gets a shade ladder, as HSL triplets so `hsl(var(--x) / a)` works:
     -100 subtle fill   -200 hover fill   -300 border   -400 muted mark
     -500 base (= the bare token)         -600 hover    -700 pressed/strong
     -ink  text on a -500 fill
   Shades are mixed against the palette's own canvas, so they read as the same
   hue at lower intensity rather than as translucent overlays. */
const fs = require('node:fs');
const path = require('node:path');

const families = [
  // key pairs keep earlier stored preferences valid.
  { name:'Ember', dark:'ghost',  light:'glacier', primary:[18,42],  secondary:[168,30], reference:[214,32], success:140, warning:46, danger:352 },
  { name:'Tide',  dark:'clay',   light:'grove',   primary:[200,36], secondary:[28,46],  reference:[236,28], success:150, warning:50, danger:354 },
  { name:'Moss',  dark:'ochre',  light:'moss',    primary:[95,24],  secondary:[22,42],  reference:[205,30], success:150, warning:50, danger:350 },
  { name:'Dune',  dark:'marine', light:'bone',    primary:[38,38],  secondary:[176,32], reference:[222,30], success:135, warning:60, danger:350 },
  { name:'Dusk',  dark:'dusk',   light:'dawn',    primary:[255,30], secondary:[32,44],  reference:[188,28], success:145, warning:56, danger:352 },
];

/* ---- color math (sRGB, WCAG luminance) -------------------------------- */
function hslToRgb([h,s,l]) {
  s/=100; l/=100; const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return [r+m,g+m,b+m];
}
function rgbToHsl([r,g,b]) {
  const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2, d=max-min;
  let h=0, s=0;
  if (d) {
    s=d/(1-Math.abs(2*l-1));
    h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0)h+=360;
  }
  return [h,s*100,l*100];
}
const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const mix=(a,b,t)=>a.map((v,i)=>v*t+b[i]*(1-t));
const fmt=([h,s,l])=>`${Math.round(h)} ${Math.round(s)}% ${+l.toFixed(1)}%`;

/* Lightest (dark mode) or darkest-needed (light mode) lightness clearing `target`. */
function solve([h,s], bgs, target, dark) {
  for (let i=0;i<=1000;i++) {
    const l = dark ? 40+i*0.05 : 70-i*0.05;
    const c=hslToRgb([h,s,l]);
    if (bgs.every(bg=>contrast(c,bg)>=target)) return [h,s,l];
  }
  throw new Error(`no lightness for hue ${h}`);
}

function palette(f, dark) {
  const hue=f.primary[0];
  const n = dark
    ? { canvas:[hue,10,4.5], depth:[hue,10,7.5], surface:[hue,9,10.5], raised:[hue,8,16.5], nested:[hue,7,23], overlay:[hue,9,9],
        strong:[hue,10,92], text:[hue,7,80], muted:[hue,5,66], faint:[hue,4,55] }
    : { canvas:[hue,12,92.5], depth:[hue,10,86.5], surface:[hue,16,98], raised:[hue,0,100], nested:[hue,10,86.5], overlay:[hue,16,97],
        strong:[hue,20,11], text:[hue,11,26], muted:[hue,7,35], faint:[hue,5,41] };
  const canvas=hslToRgb(n.canvas), surface=hslToRgb(n.surface), raised=hslToRgb(n.raised);
  const strong=hslToRgb(n.strong);
  const bgs=[canvas,surface,raised];
  const out = {
    canvas:n.canvas, depth:n.depth, surface:n.surface, raised:n.raised, nested:n.nested, overlay:n.overlay,
    'text-strong':n.strong, text:n.text, 'text-muted':n.muted, 'text-faint':n.faint,
    'text-inverse': dark ? n.canvas : [0,0,100],
  };
  const roles = {
    primary:f.primary, secondary:f.secondary, reference:f.reference,
    success:[f.success,dark?34:46], warning:[f.warning,dark?58:80], danger:[f.danger,dark?54:58],
  };
  for (const [role,hs] of Object.entries(roles)) {
    // Interactive and identity inks aim a touch higher than body-size minimum.
    const base=solve(hs, bgs, role==='secondary'?5.2:4.8, dark);
    const c=hslToRgb(base);
    const shade=(t,toward=canvas)=>rgbToHsl(mix(c,toward,t));
    out[role]=base;
    out[role+'-100']=shade(.08); out[role+'-200']=shade(.16); out[role+'-300']=shade(.34); out[role+'-400']=shade(.62);
    out[role+'-500']=base;
    out[role+'-600']=rgbToHsl(mix(strong,c,.18)); out[role+'-700']=rgbToHsl(mix(strong,c,.36));
    // Text on a filled -500: whichever of the canvas or white reads better.
    const ink=[dark?n.canvas:[0,0,100], dark?[0,0,100]:n.strong].sort((a,b)=>contrast(hslToRgb(b),c)-contrast(hslToRgb(a),c))[0];
    out[role+'-ink']=ink;
  }
  return out;
}

const alias = `
 --action:var(--secondary); --action-ink:var(--secondary-ink); --action-hover:var(--secondary-600);
 --complement:var(--secondary); --signal:var(--primary);
 --accent:var(--primary); --accent-strong:var(--primary-700); --accent-subtle:var(--primary-100);
 --trust:var(--success); --live:var(--success); --role:var(--reference); --badge:var(--primary);
 --drift:var(--warning); --hidden:var(--text-faint); --info:var(--reference);
 --border:var(--border-default); --border-soft:var(--border-subtle);
 --canvas-glow-primary:var(--primary) / .03; --canvas-glow-secondary:var(--secondary) / .02; --canvas-glow-edge:var(--reference) / .015;
 --dak-canvas:var(--canvas); --dak-surface-1:var(--surface); --dak-surface-2:var(--raised); --dak-surface-3:var(--nested);
 --dak-text-strong:var(--text-strong); --dak-text:var(--text); --dak-text-muted:var(--text-muted); --dak-text-faint:var(--text-faint); --dak-text-inverse:var(--text-inverse);
 --dak-accent:var(--primary); --dak-accent-subtle:var(--primary-100); --dak-accent-strong:var(--primary-700);
 --dak-border-subtle:var(--border-subtle); --dak-border-default:var(--border-default); --dak-border-strong:var(--border-strong);
 --surface-canvas:var(--canvas); --surface-1:var(--surface); --surface-2:var(--raised); --surface-3:var(--nested); --surface-overlay:var(--overlay);
 --surface-01:var(--surface); --surface-02:var(--raised); --surface-03:var(--nested);
 --foreground-strong:var(--text-strong); --foreground-default:var(--text); --foreground-muted:var(--text-muted); --foreground-faint:var(--text-faint); --foreground-inverse:var(--text-inverse);
 --action-bg:var(--secondary); --action-fg:var(--secondary-ink); --action-border:var(--secondary); --action-hover-bg:var(--secondary-600);
 --action-muted-bg:var(--secondary-100); --action-muted-fg:var(--secondary);
 --page-background:var(--canvas); --background-depth:var(--depth); --surface-base:var(--surface); --surface-raised:var(--raised);
 --overlay-soft:var(--nested); --overlay-strong:var(--overlay); --divider-soft:var(--border-subtle); --divider-strong:var(--border-strong);
 --theme-glow:var(--primary); --primary-light:var(--primary-700); --primary-standard:var(--primary); --primary-bold:var(--primary-600); --accent-medium:var(--primary-400);
 --success-standard:var(--success); --warning-standard:var(--warning); --error-standard:var(--danger); --danger-bold:var(--danger); --info-standard:var(--reference);`;

const order=['canvas','depth','surface','raised','nested','overlay','text-strong','text','text-muted','text-faint','text-inverse'];
const shadeKeys=r=>[r,`${r}-100`,`${r}-200`,`${r}-300`,`${r}-400`,`${r}-500`,`${r}-600`,`${r}-700`,`${r}-ink`];
function block(selectors, f, dark) {
  const p=palette(f,dark), hue=f.primary[0];
  const lines=[];
  lines.push(' '+order.map(k=>`--${k}:${fmt(p[k])};`).join(' '));
  lines.push(dark
    ? ` --border-subtle:${hue} 12% 85% / .1; --border-default:${hue} 12% 85% / .22; --border-strong:${hue} 12% 85% / .36;`
    : ` --border-subtle:${hue} 20% 11% / .1; --border-default:${hue} 20% 11% / .24; --border-strong:${hue} 20% 11% / .38;`);
  for (const r of ['primary','secondary','reference','success','warning','danger']) lines.push(' '+shadeKeys(r).map(k=>`--${k}:${fmt(p[k])};`).join(' '));
  lines.push(dark
    ? ` --theme-shadow:${hue} 40% 2% / .6; --theme-shadow-color:${hue} 40% 2%; --theme-shadow-alpha:.6; color-scheme:dark;`
    : ` --theme-shadow:${hue} 30% 20% / .14; --theme-shadow-color:${hue} 30% 20%; --theme-shadow-alpha:.14; color-scheme:light;`);
  return `/* ${f.name} ${dark?'dark':'light'} */\n${selectors.join(',')} {\n${lines.join('\n')}\n}\n`;
}

const allKeys=families.flatMap(f=>[f.dark,f.light]);
let css=`/* GENERATED by scripts/build-flux-themes.cjs — edit the families there, then rerun.
   The single source of DEFXN color. css/themes.css (SDK-generated) still loads
   first for fonts and sizes; every color token it declares is redeclared here,
   which tests/theme-color-contrast.cjs enforces. Roles and shade ladders are
   documented at the top of the generator and in docs/brand/DEFXN.md. */\n\n`;
families.forEach((f,i)=>{
  css+=block((i===0?[':root']:[]).concat(`:root[data-theme="${f.dark}"]`),f,true);
  css+=block([`:root[data-theme="${f.light}"]`],f,false);
});
// Picker swatches show each palette's own primary and secondary, whatever theme is active.
css+=`\n/* Theme picker swatches. */\n`;
families.forEach(f=>[[f.dark,true],[f.light,false]].forEach(([key,dark])=>{
  const p=palette(f,dark);
  css+=`.settings-choice[data-theme-choice="${key}"]{--choice-ink:${fmt(p.primary)};--choice-ink-2:${fmt(p.secondary)};}\n`;
}));
css+=`\n/* Role aliases and legacy SDK names, shared by every palette. */\n${[':root',...allKeys.map(k=>`:root[data-theme="${k}"]`)].join(',')} {${alias}\n}\n`;

fs.writeFileSync(path.join(__dirname,'..','css','flux-themes.css'),css);
fs.writeFileSync(path.join(__dirname,'theme-families.json'),JSON.stringify(families.map(({name,dark,light,primary,secondary,reference})=>({name,dark,light,primary:primary[0],secondary:secondary[0],reference:reference[0]})),null,1)+'\n');
console.log(`wrote css/flux-themes.css (${families.length*2} palettes)`);
