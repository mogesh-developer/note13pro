/* AOSP Recovery ZIP Flash controls; no modifications to stock manufacturer BAT. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const stages=['gather','flash_images','await_sideload','sideload'];
let activeJob='';
function markStages(j){
 const p=j.phase||'',done=j.status==='verification_required'||j.status==='complete',at=stages.indexOf(p);
 document.querySelectorAll('[data-usb-stage]').forEach(el=>{
  const i=stages.indexOf(el.dataset.usbStage);
  el.classList.toggle('active',!done&&i===at);
  el.classList.toggle('passed',done ||(at>=0&&i<at));
 });
 const status=$('usbLiveStatus');if(status)status.textContent=j.detail||j.status||'Waiting';
 const cancel=$('usbCancelWait');if(cancel){cancel.hidden=!(j.phase==='await_sideload'&&j.status==='running');cancel.dataset.job=j.id||'';}
 const start=$('startSideload');if(start)start.disabled=j.status==='running';
}
window.__usbStatusUpdate=(j)=>{if(!j||!/Recovery ZIP Fastboot Sideload/i.test(j.kind||''))return;if(!activeJob)activeJob=j.id||'';if(activeJob!==j.id)return;markStages(j)};
window.__startUSBMultiFlash=async()=>{
 const input=$('sideloadPath'),path=input?.value.trim()||'';
 if(!/\.zip$/i.test(path)){toast('Select an AOSP ROM ZIP first.','error');return}
 const partitions=[...document.querySelectorAll('#usbPartitionChoices input:checked')].map(el=>el.value);
 // Start Auto Flash immediately on the user's click, with no additional confirmation gate.
 const btn=$('startSideload');btn.disabled=true;
 try{
  const job=await api('/api/sideload/usb/start',{path,partitions});activeJob=job.id||'';
  window.__v095SetRecoveryJob?.(activeJob);
  $('v095RecoveryOutput').textContent='Recovery ZIP Flash started • '+path+'\n'+(activeJob||'Job queued');
  $('v095RecoveryJobState').textContent='RUNNING';
  $('usbLiveStatus').textContent='Gathering Images…';
  toast('Recovery ZIP Flash started; watch Recovery progress.','success');
 }catch(e){btn.disabled=false;$('usbLiveStatus').textContent='START FAILED: '+e.message;toast(e.message,'error')}
};
async function rebootInRecoveryTab(target){
 const title={recovery:'Recovery',system:'System',fastboot:'Fastboot Mode'}[target];
 const confirmed=await modal('Reboot to '+title,warnBody(['This only changes phone boot mode; no firmware will be written.']),{accept:'Reboot',danger:false});
 if(!confirmed)return;
 try{const r=await api('/api/sideload/reboot',{target});toast(r.result||'Reboot command sent','success');$('v095RecoveryOutput').textContent+='\n'+new Date().toLocaleTimeString()+' · '+r.result;setTimeout(scanDevice,4000)}catch(e){toast(e.message,'error')}
}
function init(){
 $('adbSystem').onclick=()=>rebootInRecoveryTab('system');
 $('adbFastboot').onclick=()=>rebootInRecoveryTab('fastboot');
 $('adbRecovery').onclick=()=>rebootInRecoveryTab('recovery');
 $('usbCancelWait').onclick=async()=>{const id=$('usbCancelWait').dataset.job;if(!id)return;try{await api('/api/sideload/usb/cancel-wait',{id});$('usbLiveStatus').textContent='Recovery wait canceled';toast('Wait canceled; no sideload sent.','info')}catch(e){toast(e.message,'error')}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
