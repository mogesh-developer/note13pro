/* V0.9.59: Recovery IMG Auto/Manual; share the single existing v095.js job monitor. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function init(){
 const opts=[...document.querySelectorAll('input[name="v0958RecoveryMode"]')];
 const row=$('v0958ManualRecoveryRow'),input=$('v0958RecoveryCommand'),go=$('v0958RecoveryGo');
 const status=$('v0958RecoveryManualStatus');if(!opts.length||!row||!input||!go||!status)return;
 const sync=()=>{const manual=opts.some(o=>o.checked&&o.value==='manual');row.hidden=!manual;status.hidden=!manual;};
 opts.forEach(o=>o.addEventListener('change',sync));sync();
 let pending=false;
 go.addEventListener('click',async()=>{
  if(pending)return;
  if(!opts.some(o=>o.checked&&o.value==='manual'))return;
  const command=input.value.trim();if(!command){status.textContent='Enter an ADB or Fastboot command first.';input.focus();return;}
  if(!/^(?:adb(?:\.exe)?|fastboot(?:\.exe)?)\s/i.test(command)){status.textContent='Enter an adb or fastboot command.';return;}
  pending=true;go.disabled=true;status.textContent='Submitting manual recovery command…';
  try{const j=await api('/api/commands/manual',{command,confirm:true});const id=j.id||'';
    // The existing v095.js job monitor owns the ONLY progress and log renderer.
    // Do not install another timer that races with its output or revives stale jobs.
    if(window.__v095SetRecoveryJob)window.__v095SetRecoveryJob(id);
    status.textContent='Command submitted'+(id?' • Job '+id:'')+'. Follow the existing Recovery operation log below.';
    $('v095RecoveryJobState').textContent='QUEUED';$('v095RecoveryJobDetail').textContent='Manual recovery command submitted';
    $('v095RecoveryOutput').textContent='MANUAL RECOVERY COMMAND\n'+command+'\nWaiting for the existing job monitor…';
    toast('Manual command submitted; watch the existing Recovery operation log.','info');
  }catch(e){status.textContent='Command not started: '+e.message;toast(e.message,'error')}
  finally{pending=false;go.disabled=false}
 });
 // No second /api/jobs poller here: v095.js already monitors manual commands.

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
