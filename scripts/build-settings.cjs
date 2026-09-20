// Consume canonical ARK primitives and generate SDK themes through its CLI.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const root=process.env.ARK_SHARED_ROOT || '/Volumes/PortableSSD/shared';
const cli=root+'/deadark-sdk/bin/deadark-theme.mjs';
fs.writeFileSync('css/themes.css',execFileSync(process.execPath,[cli,'css']));
const themes=JSON.parse(execFileSync(process.execPath,[cli,'themes'],{encoding:'utf8'}));
fs.writeFileSync('scripts/theme-options.js','// Generated from the SDK theme catalog.\nexport default '+JSON.stringify(themes.map(t=>t.name))+';\n');
execFileSync(root+'/deadark-sdk/node_modules/.bin/esbuild',['scripts/settings-entry.js','--bundle','--alias:@deadark/ark-a11y/element-style=./scripts/ark-style-bridge.js','--format=iife','--minify','--outfile=js/settings/panel.js'],{stdio:'inherit'});
