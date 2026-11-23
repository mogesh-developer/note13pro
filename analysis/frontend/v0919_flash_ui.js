/* Flashing process presentation only. Each manufacturer BAT run stays isolated
   by its existing job ID and its unmodified live command output. */
(()=>{'use strict';
const colors=['#58d1ff','#6be4ae','#bd9aff','#ffc66f','#ff91a5','#7edadd'];
let lastSignature='';
function base(p){return String(p||'').split(/[\\/]/).pop()}
function jobLabel(j){
 const script=(j.lines||[]).find(x=>x.startsWith('Original manufacturer BAT: '));
 const root=(j.lines||[]).find(x=>x.startsWith('Mode: '));
 const name=window.__v19JobSources?.[j.id];
 if(name?.rom)return base(name.rom)+' • '+(name.method||'')+' • '+(name.mode||'');
 return script?base(script.slice('Original manufacturer BAT: '.length))+' • '+(root||''):j.kind;
}
function freshSignature(jobs){return jobs.map(j=>(j.id||'')+'|'+(j.status||'')+'|'+(j.lines?.length||0)+'|'+(j.lines?.at(-1)||'')+'|'+(j.detail||'')).join('::')}
window.__v19RenderFlashSessions=(jobs,current)=>{
 const log=document.getElementById('v09FlashLog');if(!log)return;
 const relevant=jobs.filter(j=>/Official Xiaomi BAT Flash|Selected IMG Fastboot Flash|Verified selected IMG batch|Selected IMG.*Flash/.test(j.kind||''))
  .sort((a,b)=>String(a.started).localeCompare(String(b.started)));
 const header=document.getElementById('v19ActiveROM');
 const running=jobs.find(j=>j.status==='running'&&/Official Xiaomi BAT Flash|Selected IMG.*Flash|Verified selected IMG batch|Stage Fastboot ROM archive/.test(j.kind||''));
 if(header){
  const active=running||null;
  const name=active ? (/Stage Fastboot/.test(active.kind)?base(window.selectedFlashSources?.tgz||'TGZ extraction'):jobLabel(active)) : 'NO ACTIVE FLASH';
  header.textContent=active?'● '+name+' • '+((typeof device!=='undefined'&&device.model)||'USB Device'):'NO ACTIVE FLASH';
  header.title=header.textContent;
 }
 if(!relevant.length)return;
 const signature=freshSignature(relevant);if(signature===lastSignature)return;
 lastSignature=signature;
 const nearEnd=log.scrollHeight-log.scrollTop-log.clientHeight<100;
 const nodes=[];
 relevant.forEach((j,index)=>{
  const section=document.createElement('span');section.className='v19-session';section.style.setProperty('--session-color',colors[index%colors.length]);
  const heading=document.createElement('span');heading.className='v19-session-title';
  heading.textContent='━━━━━━━━━━ FLASH SESSION '+(index+1)+' ━━━━━━━━━━\n'+jobLabel(j)+'\nStarted: '+(j.started||'')+' • Status: '+String(j.status||'').toUpperCase();
  const body=document.createElement('span');body.className='v19-session-body';body.textContent=(j.lines||[]).slice(-2000).join('\n')+'\n'+(j.status!=='running'?'RESULT: '+String(j.detail||j.status):'');
  section.append(heading,body);nodes.push(section);
 });
 log.replaceChildren(...nodes);
 if(nearEnd)log.scrollTop=log.scrollHeight;
};
})();
