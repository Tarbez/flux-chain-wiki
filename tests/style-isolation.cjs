const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const rules=[];
const sheet={cssRules:rules,insertRule(selector,index){const values={};rules.splice(index,0,{selectorText:selector,style:{setProperty(k,v){values[k]=v;},removeProperty(k){delete values[k];},getPropertyValue(k){return values[k]||'';}}});}};
const style={sheet,isConnected:true,setAttribute(){}};
const context=vm.createContext({document:{querySelector:()=>null,createElement:()=>style,head:{appendChild(){}}},window:{matchMedia:()=>({matches:false})}});
vm.runInContext(fs.readFileSync('js/ark/vendor/engines.js','utf8'),context);
vm.runInContext(fs.readFileSync('scripts/ark-style-bridge.js','utf8').replace(/export const /g,'var '),context);
assert.equal(context.setArkElementStyle,context.ArkEngines.setArkElementStyle);
const el=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
const home=el(),popover=el();
context.ArkEngines.setArkElementStyle(home,'opacity','1');
context.setArkElementHidden(popover,true);
assert.notEqual(home.attrs['data-ark-dynamic-style'],popover.attrs['data-ark-dynamic-style']);
for(let i=0;i<10;i++){context.setArkElementHidden(popover,false);context.setArkElementHidden(popover,true);}
assert.equal(context.ArkEngines.getArkElementStyle(home,'opacity'),'1');
assert.equal(context.ArkEngines.getArkElementStyle(home,'display'),'');
assert(!('hidden' in home.attrs));
assert(!fs.readFileSync('js/settings/panel.js','utf8').includes('data-ark-dynamic-style'), 'settings must not bundle another style registry');
console.log('PASS: settings shares shell style functions; repeated popover dismissal cannot apply display:none to home content; no duplicate registry in generated bundle.');
