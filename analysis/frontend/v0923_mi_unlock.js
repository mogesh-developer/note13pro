/* V0.9.23: Xiaomi's ORIGINAL Mi Unlock authentication and token flow.
   These controls prepare/open the unmodified manufacturer's application.
   Tech Office never captures Mi credentials, server tokens or unlock output. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
let pendingJob='';
let lastSource='';
const show=(text)=>{byId('miuEvents').textContent=`${new Date().toLocaleTimeString()} · ${text}`};
const notify=(msg,kind='info')=>{show(msg);if(typeof toast==='function')toast(msg,kind)};
async function getStatus(){
 try{
  const s=await api('/api/mi-unlock/status');
  byId('miuArchivePath').value=s.archive_path||'';
  lastSource=s.archive_path||'';
  byId('miuStatusBadge').textContent=s.prepared?'PACKAGE READY':(s.available?'PACKAGE FOUND':'ZIP NEEDED');
  byId('miuStatusBadge').classList.toggle('warning',!s.prepared);
  byId('miuLaunch').disabled=!s.prepared;
  byId('miuInstallDriver').disabled=!s.prepared;
  byId('miuInstallDriver64').disabled=!s.prepared;
  byId('miuOpenFolder').disabled=!s.prepared;
  const nat=s.native||{};
  byId('miuNativeState').textContent=nat.running?'Official Xiaomi Mi Unlock is RUNNING in its own window. Sign in and see real unlock percentage there.':(nat.message||'Official Xiaomi window is not running. Credentials and tokens are never read by this tool.');
  if(s.prepared&&!pendingJob){byId('miuPrepFill').style.width='100%';byId('miuPrepText').textContent='100% · Original Mi Unlock package ready'}
  if(s.device){byId('miuDeviceState').textContent=s.device.toUpperCase();}
 }catch(e){show('Status: '+e.message)}
}
async function chooseZip(){
 try{
  const picked=await api('/api/browse',{kind:'zip'});if(!picked.path)return;
  const response=await api('/api/mi-unlock/select',{path:picked.path});
  byId('miuArchivePath').value=response.path;lastSource=response.path;
  notify('Original Mi Unlock archive selected. Press Prepare.','success');await getStatus();
 }catch(e){notify('Mi Unlock ZIP: '+e.message,'error')}
}
async function prepare(){
 try{
  if(!lastSource){notify('Choose the original Mi Unlock ZIP first.','error');return}
  const job=await api('/api/mi-unlock/prepare',{});
  pendingJob=job.id;
  byId('miuPrepare').disabled=true;
  byId('miuPrepFill').style.width='0%';
  show('Preparing the original Xiaomi Mi Unlock package. Account authentication is handled in the separate official window.');
 }catch(e){notify(e.message,'error')}
}
async function prepareJobStatus(){
 if(!pendingJob)return;
 try{
  const r=await api('/api/jobs',{});
  const job=(r.jobs||[]).find(j=>j.id===pendingJob);
  if(!job)return;
  const pct=job.total?Math.max(0,Math.min(100,Math.round(job.done*100/job.total))):0;
  byId('miuPrepFill').style.width=pct+'%';
  byId('miuPrepText').textContent=`${pct}% · ${job.detail||'Preparing...'}`;
  if(job.status!=='running'){
   pendingJob='';byId('miuPrepare').disabled=false;
   if(job.status==='complete')notify('Official Mi Unlock files ready. Open Mi Unlock to sign in.','success');
   else notify(job.detail||'Mi Unlock preparation failed','error');
   await getStatus();
  }
 }catch(e){show('Preparation status error: '+e.message)}
}
async function launch(){
 try{
  await api('/api/mi-unlock/launch',{});
  notify('Original Xiaomi Mi Unlock opened. Sign in there; Xiaomi handles authorization, wait time, unlock % and result.','success');await getStatus();
 }catch(e){notify(e.message,'error')}
}
async function driver(which){
 try{
  const label=which==='usb-driver'?'Xiaomi USB Driver Setup':'Alternate x64 Driver Setup';
  const ok=await modal(label,`Open the unmodified Xiaomi-provided driver installer in a separate window? Windows may request administrator permission. Driver installation is not automatic.`,{accept:'Open Driver Setup',danger:false});
  if(!ok)return;
  await api('/api/mi-unlock/driver',{kind:which});notify(label+' started. Complete the official installer window.','success');
 }catch(e){notify(e.message,'error')}
}
async function scan(){
 try{
  const r=await api('/api/scan',{});
  const d=r.device||{};
  byId('miuDeviceState').textContent=(d.mode||'unknown').toUpperCase();
  byId('miuDeviceInfo').textContent=`Connected device: ${d.model||d.codename||'Unknown'} · Fastboot mode: ${d.mode==='fastboot'?'YES':'not detected'}. Xiaomi's own tool will verify unlock eligibility.`;
  if(typeof setDevice==='function'&&r.device)setDevice(r.device);
  notify(d.mode==='fastboot'?'Fastboot detected. Xiaomi tool will verify account/device.':'Fastboot phone not detected. Connect with Power + Volume Down.');
 }catch(e){notify(e.message,'error')}
}
byId('miuBrowseArchive').addEventListener('click',chooseZip);
byId('miuPrepare').addEventListener('click',prepare);
byId('miuRefresh').addEventListener('click',getStatus);
byId('miuScan').addEventListener('click',scan);
byId('miuLaunch').addEventListener('click',launch);
byId('miuInstallDriver').addEventListener('click',()=>driver('usb-driver'));
byId('miuInstallDriver64').addEventListener('click',()=>driver('driver-x64'));
byId('miuOpenFolder').addEventListener('click',async()=>{try{await api('/api/mi-unlock/open-folder',{});notify('Opened original Xiaomi tool folder.')}catch(e){notify(e.message,'error')}});
byId('miuShowActivity').addEventListener('click',()=>{if(typeof navigate==='function')navigate('activity')});
setInterval(()=>{if(pendingJob){prepareJobStatus()}else if(document.getElementById('page-mi-unlock').classList.contains('shown')){getStatus()}},2200);
getStatus();
})();
