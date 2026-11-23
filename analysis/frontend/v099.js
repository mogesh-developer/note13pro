/* V0.9.9 — compact dual extraction modes, one truthful progress/log surface. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
let archiveInspection=null;
function showMode(mode){
 const isArchive=mode==='archive';
 const isOnline=mode==='online';
 document.querySelectorAll('#page-images .v099-stock-panel').forEach(p=>p.hidden=isArchive||isOnline);
 el('page-images').querySelector('.v099-archive-panel').hidden=!isArchive;
 el('v0943OnlineImages').hidden=!isOnline;
 el('page-images').classList.toggle('v0950-online-active',isOnline);
 el('v0950ToggleOnlineLog').hidden=!isOnline;
 for(const [id,on] of [['v099ModeImages',!isArchive&&!isOnline],['v099ModeArchive',isArchive],['v0945ModeOnline',isOnline]]){
  const b=el(id);b.classList.toggle('primary',on);b.setAttribute('aria-selected',String(on));
 }
}
function failStatus(msg){el('v099ArchiveSummary').textContent=msg;el('v099ArchiveSummary').classList.add('danger-text')}
async function inspect(){
 const p=el('v099ArchivePath').value.trim();if(!p){failStatus('Select an archive file first.');return null}
 el('v099ArchiveSummary').classList.remove('danger-text');el('v099ArchiveSummary').textContent='Inspecting archive metadata and file safety…';
 el('v099JobStatus').textContent='INSPECTING';
 el('v09ImageProgressFill').parentElement.classList.add('indeterminate');
 el('v09ImageProgressFill').style.width='0%';el('v099ProgressPercent').textContent='—';
 el('v09ImageProgressText').textContent='Reading archive metadata; unknown duration…';
 el('v099ExtractLog').textContent='INSPECT ARCHIVE: '+p+'\nChecking file type, structure, encryption, sizes and safe paths...';
 try{
  const result=await api('/api/archive/inspect',{path:p});if(el('v099ArchivePath').value.trim()!==p)return null;archiveInspection={...result,source:p};
  const size=result.unpacked?(' • '+(result.unpacked/1048576).toFixed(1)+' MB unpacked'):'';
  el('v099ArchiveSummary').textContent=result.name+' • '+result.format+' • '+(result.entries||'streaming')+' entries'+size+(result.encrypted?' • ENCRYPTED':'')+' • '+result.message;
  const field=el('v099ArchivePassword');field.closest('label').classList.toggle('v101-password-needed',!!result.password_required);
  el('v101GetSevenZip').hidden=!(result.needs_7zip&&!result.seven_zip_available);
  field.placeholder=result.password_required?'Password required — enter to unlock':'Password (only if needed)';
  if(result.password_required&&!field.value){field.focus();toast('Encrypted archive detected. Enter its password to extract.','info');}
  if(result.needs_7zip&&!result.seven_zip_available){el('v099ExtractLog').textContent+='\nPORTABLE DECODER: Included official 7-Zip 26.06 helper will be prepared offline when extraction starts (no download required).';}
  el('v09ImageProgressFill').parentElement.classList.remove('indeterminate');
  el('v099JobStatus').textContent='INSPECTED';
  el('v09ImageProgressText').textContent='Archive metadata inspected: '+result.format+(result.encrypted?' • password required':'');
  el('v099ExtractLog').textContent+='\nINSPECTION COMPLETE: '+result.format+' • '+(result.entries||'streaming')+' entries'+(result.encrypted?' • ENCRYPTED':'')+'\n'+result.message;
  return result;
 }catch(e){archiveInspection=null;el('v09ImageProgressFill').parentElement.classList.remove('indeterminate');el('v099JobStatus').textContent='FAILED';el('v099ExtractLog').textContent+='\nFAILED: '+e.message;failStatus('Archive check failed: '+e.message);return null}
}
async function browse(){const p=await chooseWindowsPath('archive');if(!p)return;el('v099ArchivePath').value=p;archiveInspection=null;el('v099ArchiveSummary').textContent='Archive selected. Inspect its contents or click Extract Full Archive.'}
async function extract(){
 const p=el('v099ArchivePath').value.trim();let info=archiveInspection?.source===p?archiveInspection:await inspect();if(!info)return;
 // Portable decoder is prepared inside the extraction job when needed.
 const pwd=el('v099ArchivePassword').value;
 if(info.password_required&&!pwd){failStatus('Password required — enter archive password and click Extract Full Archive again.');el('v099ArchivePassword').closest('label').classList.add('v101-password-needed');el('v099ArchivePassword').focus();return}
 let destination='';const manual=document.querySelector('input[name="v099ArchiveDestination"]:checked')?.value==='manual';
 if(manual){destination=await chooseWindowsPath('directory');if(!destination)return}
 const output=destination||'Downloads/Tech_Office_Yt_Xiaomi_Service (auto)';
 if(!await modal('Extract Full Archive',warnBody(['Source: '+info.name,'Format: '+info.format+' • Files: '+info.entries,'Destination parent: '+output,'All unpacked files retain their original relative names and subfolders. No device data will be changed.']),{accept:'Start Unzip',danger:false}))return;
 el('v099ArchivePassword').value=''; // Never keep the password in the page after accepting a job.
 try{
  const job=await api('/api/archive/extract',{path:p,destination,password:pwd});
  v09ImageJob=job.id;
  el('viewExtractedFiles').disabled=true;delete el('viewExtractedFiles').dataset.v095Output;
  el('v099ExtractLog').textContent='Full archive unzip started • '+info.name+'\n'+(manual?'Manual output folder':'Auto output folder')+'\nWaiting for file progress…';
  el('v09ImageProgressText').textContent='Unzipping…';el('v099JobStatus').textContent='RUNNING';el('v099ProgressPercent').textContent='—';
  el('v09ImageProgressFill').style.width='0%';el('v09ImageProgressFill').parentElement.classList.add('indeterminate');toast('Full archive unzip started. Watch the shared progress and log.','info');
 }catch(e){if(/password|encrypt/i.test(e.message)){el('v099ArchivePassword').closest('label').classList.add('v101-password-needed');el('v099ArchivePassword').focus();}failStatus('Unzip failed to start: '+e.message)}
}
function copyLog(){const output=el('v099ExtractLog').textContent||'';navigator.clipboard.writeText(output).then(()=>toast('Extraction log copied.','success')).catch(()=>toast('Clipboard unavailable.','error'))}
function init(){
 if(!el('page-images'))return;
 el('v099ModeImages').addEventListener('click',()=>showMode('images'));
 el('v099ModeArchive').addEventListener('click',()=>showMode('archive'));
 el('v0945ModeOnline').addEventListener('click',()=>showMode('online'));
 el('v099BrowseArchive').addEventListener('click',browse);
 el('v099InspectArchive').addEventListener('click',inspect);
 el('v099StartArchive').addEventListener('click',extract);
 el('v099CopyLog').addEventListener('click',copyLog);
 el('v099ArchivePath').addEventListener('input',()=>{archiveInspection=null;el('v099ArchiveSummary').textContent='Source changed — inspect before extracting.';el('v101GetSevenZip').hidden=true;el('v099ArchivePassword').closest('label').classList.remove('v101-password-needed')});
 showMode('images');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
