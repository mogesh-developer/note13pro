/* V0.4 in-app operations monitor & safe flash preflight. No simulated log lines. */
'use strict';
let activeLogLines=[];let lastJobList=[];let stageAlreadySelected="";let selectedStockMode='clean';
function pageLogMatches(page,line){
 const t=line.toUpperCase();if(/LOCAL UI:|STARTED \(LOCAL|127[.]0[.]0[.]1|HTTP:\/\//.test(t))return false;
 const keys={fastboot:/STOCK PLAN|FLASH PLAN|FLASH STEP|FLASH VERIFIED|FASTBOOT|ROM STAGE|STAGE FASTBOOT|FLASH ALL|SLOT|ROLLBACK|DOWNGRADE|ROM INSPECT|EXTRACT TGZ/,
 recovery:/RECOVERY|SIDELOAD|BOOT ONCE|TEMPORARY BOOT|OTA INSPECT/,
 dialer:/DIALER|HYPEROS|CALLING|PHONE PACKAGE/,
 root:/ROOT |PATCHED IMG|ADB PUSH|ADB PULL|MAGISK|KERNELSU|APATCH/,
 wipe:/WIPE|FACTORY RESET|USER DATA ERASE/,
 images:/EXTRACT|PAYLOAD|IMAGE CATALOG|IMG FILE|STOCK IMAGE/,
 firmware:/FIRMWARE|DOWNLOAD|ROM FIND|ROM SOURCE/,
 bloatware:/PACKAGE|BLOATWARE|RESTORE APP|DISABLE APP/};return !!keys[page]?.test(t)
}
function pageLogLines(page){return activeLogLines.filter(l=>pageLogMatches(page,l))}
function logJobMatches(page,j){return pageLogMatches(page,j.kind||'')}

async function refreshEmbeddedLogs(){
 if(!['fastboot','recovery','dialer','root','wipe','images','firmware','bloatware'].includes(activePage))return;
 try{
  const [raw,jobs]=await Promise.all([api('/api/logs'),api('/api/jobs')]);
  activeLogLines=raw.lines||[];lastJobList=jobs.jobs||[];
  // TGZ staging belongs to the scoped, source-bound V0.9.10 Fastboot flow.
  // Never silently switch ROM inputs or call a flash-plan handler from old jobs.
  for(const panel of document.querySelectorAll('[data-live-panel]')){
   const page=panel.closest('.page')?.id?.replace('page-','')||'';
   const recent=pageLogLines(page).slice(-55);
   const pre=panel.querySelector('[data-live-console]');const nearBottom=(pre.scrollHeight-pre.scrollTop-pre.clientHeight)<70;
   pre.textContent=recent.length?recent.join('\n'):'No '+page+' activity yet.';
   const stat=panel.querySelector('[data-live-state]');const latest=[...lastJobList].filter(j=>logJobMatches(page,j)).sort((a,b)=>b.started.localeCompare(a.started))[0];
   stat.textContent=latest?(latest.status==='complete'?'SUCCESS':latest.status==='failed'?'FAILED':latest.status.toUpperCase()):'WAITING';
   stat.className='pill '+(latest&&latest.status==='failed'?'warning':latest&&latest.status==='complete'?'':'info');
   if(nearBottom)pre.scrollTop=pre.scrollHeight;
  }
 }catch(_){/* Do not invent log entries on failed request */}
}
async function exportLiveLog(page=activePage){const lines=pageLogLines(page);if(!lines.length){toast('No relevant activity to export.','info');return}
 const blob=new Blob([lines.join('\n')+'\n'],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='TechOffice_'+page+'_Log.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000)
}
async function copyLiveLog(page=activePage){const lines=pageLogLines(page);if(!lines.length){toast('No relevant activity to copy.','info');return}
 try{await navigator.clipboard.writeText(lines.join('\n'));toast('Copied '+page+' activity.','success')}catch(_){toast('Clipboard unavailable; use Save Log.','error')}}
let verifiedFlashPlan=null;
async function makeFlashPlan(mode=selectedStockMode){
 const path=$('romPath').value.trim(),script=$('scriptPath').value.trim();
 if(!path&&!script){toast('Select a Fastboot TGZ, firmware folder, images folder or flash script first.','error');return null}
 if(/\.(?:tgz|tar\.gz)$/i.test(path)){
  const agreed=await modal('Prepare Fastboot ROM Archive',warnBody(['The selected Fastboot ROM archive must first be securely extracted and inspected.', 'Archive: '+path,'No flashing will start during extraction. After staging, the full plan will be shown for your review.']),{accept:'Extract & Inspect',danger:false});
  if(!agreed)return null;
  try{await api('/api/stock/stage',{path});toast('ROM staging started. The selected folder will update when extraction finishes; review the verified flash plan afterwards.','info');}catch(e){toast(e.message,'error')}
  return null;
 }
 try{
  const result=await api('/api/stock/plan',{rom_path:path,script_path:script,mode});verifiedFlashPlan=result;
  $('selectedFlashMode').textContent='Mode: '+({clean:'Flash All (Clean)',preserve:'Save User Data',lock:'Flash All & Lock — PREVIEW ONLY'}[mode]||mode);
  const el=$('flashPlanReport');el.replaceChildren();
  const title=document.createElement('p');title.style.color=result.executable?'#74e0b7':'#ff8c98';
  title.textContent=(result.executable?'Verified eligibility pending live hardware test':'Flashing blocked — inspect prerequisites')+' • '+result.mode+' • '+(result.steps||[]).length+' steps';el.append(title);
  for(const note of result.notes||[]){const line=document.createElement('div');line.className='script-step';line.textContent='ℹ '+note;el.append(line)}
  for(const warning of result.warnings||[]){const line=document.createElement('div');line.className='script-step danger-text';line.textContent='⚠ '+warning;el.append(line)}
  for(const step of result.steps||[]){const line=document.createElement('div');line.className='script-step';line.textContent=(step.command||step.action)+'  [line '+step.line+']'+(step.required_mode?'  ['+step.required_mode+']':'');el.append(line)}
  return result;
 }catch(e){verifiedFlashPlan=null;toast(e.message,'error');return null}
}
async function beginFlashAll(mode='clean'){
 selectedStockMode=mode;const plan=await makeFlashPlan(mode);if(!plan)return;
 if(!plan.executable){toast('Safety verification incomplete. Flash is blocked; see plan details.','error');return}
 const ok=await modal('⚠ FASTBOOT FLASH — ALL USER DATA WILL BE LOST',warnBody([
 'Device: '+(device.model||'Unknown')+' / '+(device.codename||'Unknown'),
 'Package: '+plan.rom_path+' — '+plan.steps.length+' steps',
 (mode==='preserve'?'Save User Data is not a backup. Any firmware update can still erase your data.':'This operation flashes multiple partitions and can erase ALL personal data or permanently damage the phone.'),
 'Continue only after checking the exact package, original region and bootloader, with a verified full backup.'
 ]),{accept:'Continue to Final Confirmation',danger:true});if(!ok)return;
 const confirmed=prompt('Type exactly FLASH VERIFIED ROM to confirm');if(confirmed!=='FLASH VERIFIED ROM'){toast('Flashing canceled.','info');return}
 try{const x=await api('/api/stock/flash',{rom_path:plan.rom_path,script_path:plan.script_path,mode,confirm:confirmed,plan_hash:plan.plan_hash});toast('Flash operation accepted. Watch the live process log.','info');refreshEmbeddedLogs()}catch(e){toast(e.message,'error')}
}
async function checkSaveData(){await beginFlashAll('preserve')}
async function reviewLockMode(){
 selectedStockMode='lock';await makeFlashPlan('lock');await lockWarning();
}
document.addEventListener('DOMContentLoaded',()=>{
 for(const panel of document.querySelectorAll('[data-live-panel]')){
  panel.querySelector('[data-live-copy]').onclick=()=>copyLiveLog(panel.closest('.page')?.id?.replace('page-',''));
  panel.querySelector('[data-live-export]').onclick=()=>exportLiveLog(panel.closest('.page')?.id?.replace('page-',''));
 }
 document.querySelectorAll('[data-root-project]').forEach(el=>el.addEventListener('click',async ev=>{
  ev.preventDefault();try{const x=await api('/api/root/official-download',{project:el.dataset.rootProject});toast('Official release APK: '+x.filename+' — download opened in browser.','success')}
  catch(e){toast('Official API unavailable: '+e.message+'. Opening official release page.','info');window.open(el.href,'_blank','noopener,noreferrer')}
 }));
 $('stageTGZ').onclick=async()=>{
  const path=$('romPath').value.trim();if(!/\.(?:tgz|tar\.gz)$/i.test(path)){toast('Select a Xiaomi Fastboot TGZ/TAR.GZ archive first.','error');return}
  if(!await modal('Stage Xiaomi Fastboot ROM',warnBody(['Extract this TGZ to a local staging folder?','Source: '+path,'Files and scripts are extracted for inspection only. No script is executed and no device is flashed.','Large Fastboot ROMs require adequate disk space.']),{accept:'Stage Archive'}))return;
  try{await api('/api/stock/stage',{path});toast('TGZ extraction started. Watch Operations & Logs and open its output folder when complete.','info');refreshEmbeddedLogs()}catch(e){toast(e.message,'error')}
 };
 $('prepareFlashPlan').onclick=()=>makeFlashPlan();
 $('browseImagesFlash').onclick=async()=>{await selectFile('directory','romPath');$('scriptPath').value='';toast('Images folder selected. A matching official flash script in the parent ROM folder is required.','info')};
 $('flashAllClean').onclick=()=>beginFlashAll('clean');
 $('flashSaveData').onclick=checkSaveData;
 $('showLockWarning').onclick=reviewLockMode;
 setInterval(refreshEmbeddedLogs,1600);
});
