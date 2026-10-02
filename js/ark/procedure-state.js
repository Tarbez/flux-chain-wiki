/* Address procedure navigation; selecting a step is never execution. */
ArkUI.attachProcedureState=function(el,page,count,select){
 var restoring=false;
 el.arkWriteState=function(state){if(restoring)return;var q=new URLSearchParams();q.set('step',state.step);if(state.review)q.set('view','review');ArkUI.route.write(ArkUI.pageCatalog[page].path,q.toString(),'push');};
 function restore(){if(ArkUI.route.path()!==ArkUI.pageCatalog[page].path)return;var q=new URLSearchParams(ArkUI.route.search());restoring=true;try{select(Math.max(0,Math.min(count-1,Number(q.get('step'))||0)),q.get('view')==='review');}finally{restoring=false;}}
 el.arkRestore=restore;restore();window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);var prior=el.arkDispose;el.arkDispose=function(){window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);if(prior)prior();};
};
