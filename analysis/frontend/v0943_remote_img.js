// V0.9.43 - online remote IMG access inside the EXISTING IMG Extractor tab.
// No browser-side archive downloads: the local Go service makes bounded HTTPS
// Range reads and writes only user-selected verified images to the PC.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const get=id=>$(id);
if(!get('v0943RemoteURL'))return;
let catalog=null,selectedJob='',lastOutput='',polling=false,inspectController=null,inspectRun=0;
const ui=(id,text)=>{get(id).textContent=text;};
const mb=n=>(n/1048576).toFixed(n>=1073741824?0:2)+' MiB';
const checked=()=>[...get('v0943ImageList').querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);
// Layout only: keep loaded IMG entries, ticked selections and extraction job intact.
const onlinePage=get('page-images');
const imageToggle=get('v0950ToggleOnlineImages');
const logToggle=get('v0950ToggleOnlineLog');
function setExpanded(kind,value){
 const key=kind==='images'?'v0950-images-expanded':'v0950-logs-collapsed';
 onlinePage.classList.toggle(key,value);
 const btn=kind==='images'?imageToggle:logToggle;
 btn.setAttribute('aria-expanded',String(kind==='images'?value:!value));
 btn.textContent=kind==='images'?(value?'Collapse Images':'Expand Images'):(value?'Expand Logs':'Collapse Logs');
}
imageToggle.onclick=()=>setExpanded('images',!onlinePage.classList.contains('v0950-images-expanded'));
logToggle.onclick=()=>setExpanded('log',!onlinePage.classList.contains('v0950-logs-collapsed'));

function status(text,kind='info'){ui('v0943RemoteStatus',text);get('v0943RemoteStatus').dataset.state=kind;}
function selected(){let n=checked().length;ui('v0943SelectedCount',n+' IMG selected');get('v0943Download').disabled=!catalog||n===0||!!selectedJob;}
function reset(){catalog=null;lastOutput='';selectedJob='';get('v0943OpenFolder').disabled=true;get('v0943Download').disabled=true;get('v0943SelectAll').disabled=true;get('v0943Clear').disabled=true;get('v0943JobFill').style.width='0%';get('v0943ImageList').replaceChildren();ui('v0943SelectedCount','No ROM inspected');ui('v0943JobState','Idle • No download started');}
get('v0943RemoteURL').addEventListener('input',()=>{if(inspectController)inspectController.abort();inspectRun++;reset();status('URL changed — click Get IMG to inspect this source again.')});
function inspectProgress(active,text){
 const bar=get('v09ImageProgressFill'),track=bar?.parentElement;if(!track)return;
 track.classList.toggle('indeterminate',active);track.setAttribute('role','progressbar');track.setAttribute('aria-label','Online ROM inspection');track.removeAttribute('aria-valuenow');
 bar.style.width='0%';get('v099ProgressPercent').textContent=active?'Working…':'—';
 get('v099JobStatus').textContent=active?'INSPECTING':text;get('v09ImageProgressText').textContent=active?'Reading remote ROM ZIP metadata…':'Online IMG inspection '+text.toLowerCase();
}
get('v0945CancelInspect').onclick=()=>{if(inspectController){inspectController.abort();inspectController=null;inspectRun++;inspectProgress(false,'CANCELLED');status('Inspection cancelled. Enter a new URL or click Get IMG again.','warning');get('v0943GetIMG').disabled=false;ui('v0943GetIMG','Get IMG');get('v0945CancelInspect').disabled=true;}};
get('v0943GetIMG').onclick=async()=>{
 const url=get('v0943RemoteURL').value.trim();if(!url){status('Paste a direct HTTPS ROM download URL first.','error');return}
 reset();const current=++inspectRun;inspectController=new AbortController();const signal=inspectController.signal;get('v0943GetIMG').disabled=true;get('v0945CancelInspect').disabled=false;ui('v0943GetIMG','Inspecting…');status('Reading remote ZIP index and payload metadata; no full ROM download…');inspectProgress(true,'');
 try{
  const response=await fetch('/api/images/remote/inspect',{method:'POST',headers:{'Content-Type':'application/json','X-TechOffice-Token':TOKEN},body:JSON.stringify({url}),signal,cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'HTTP '+response.status);if(current!==inspectRun)return;
  if(get('v0943RemoteURL').value.trim()!==url)return;
  catalog=data;const list=get('v0943ImageList');list.replaceChildren();
  for(const file of data.entries||[]){
   const row=document.createElement('label');row.className='image-row';
   const cb=document.createElement('input');cb.type='checkbox';cb.value=file.id;cb.disabled=!file.available;cb.addEventListener('change',selected);
   const desc=document.createElement('div');const strong=document.createElement('strong');strong.textContent=file.name;
   const sub=document.createElement('div');sub.className='pkg-detail';sub.textContent=(file.type==='payload-partition'?'OTA payload partition':file.type==='img'?'Direct ZIP image':'Non-extractable payload')+' • '+mb(file.size)+(file.available?'':' • '+(file.reason||'Unsupported'));
   desc.append(strong,sub);row.append(cb,desc);list.append(row);
  }
  if(!(data.entries||[]).length)list.textContent='No IMG or payload.bin entries found in this ROM ZIP.';
  get('v0943SelectAll').disabled=false;get('v0943Clear').disabled=false;
  const enabled=(data.entries||[]).filter(x=>x.available).length;
  inspectProgress(false,'COMPLETE');status('Inspected '+data.host+' • '+enabled+' downloadable IMG(s) • '+(data.warnings||[]).join(' '),enabled?'success':'warning');selected();
 }catch(e){if(e.name==='AbortError'||current!==inspectRun)return;inspectProgress(false,'FAILED');if(get('v0943RemoteURL').value.trim()===url)status('Get IMG failed: '+e.message+'. Use a direct public HTTPS ZIP link with Range support, or use the existing local extractor.','error')}
 finally{if(current===inspectRun){inspectController=null;get('v0945CancelInspect').disabled=true;get('v0943GetIMG').disabled=false;ui('v0943GetIMG','Get IMG')}}
};
get('v0943SelectAll').onclick=()=>{get('v0943ImageList').querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(e=>e.checked=true);selected()};
get('v0943Clear').onclick=()=>{get('v0943ImageList').querySelectorAll('input[type="checkbox"]').forEach(e=>e.checked=false);selected()};
get('v0943Download').onclick=async()=>{
 if(!catalog?.token){status('Click Get IMG again.','error');return}
 const ids=checked();if(!ids.length){status('Tick one or more IMG files first.','error');return}
 let destination='';if(get('v0943ManualFolder').checked){destination=await chooseWindowsPath('directory');if(!destination)return}
 get('v0943Download').disabled=true;
 try{
  const job=await api('/api/images/remote/extract',{token:catalog.token,ids,destination});
  if(!job.id)throw Error('No extraction job returned');selectedJob=job.id;
  ui('v0943JobState','RUNNING • Extracting '+ids.length+' selected IMG(s) from remote ZIP. Waiting for real progress…');
  get('v0943JobFill').style.width='0%';get('v0943OpenFolder').disabled=true;
 }catch(e){selectedJob='';status('Download not started: '+e.message,'error');selected()}
};
get('v0943OpenFolder').onclick=async()=>{
 if(!lastOutput)return;
 try{await api('/api/images/view',{path:lastOutput,folder:true})}catch(e){status('Cannot open folder: '+e.message,'error')}
};
async function updateJob(){if(!selectedJob||polling)return;polling=true;
 try{const data=await api('/api/jobs');const j=(data.jobs||[]).find(x=>x.id===selectedJob);if(!j)return;
  const done=Number(j.done)||0,total=Number(j.total)||0;const pct=total>0?Math.min(100,Math.round(done/total*100)):null;
  get('v0943JobFill').style.width=(pct===null?0:pct)+'%';
  const meter=get('v09ImageProgressFill');if(meter){const running=['running','queued'].includes(j.status);meter.parentElement.classList.toggle('indeterminate',running&&pct===null);meter.style.width=pct===null?'0%':pct+'%';get('v099ProgressPercent').textContent=pct===null?(running?'Working…':'—'):pct+'%';get('v099JobStatus').textContent=String(j.status||'RUNNING').toUpperCase();get('v09ImageProgressText').textContent=j.detail||'Downloading selected IMG files…';}
  ui('v0943JobState',String(j.status||'RUNNING').toUpperCase()+' • '+(j.detail||'Reading remote ROM…')+(pct===null?' • Progress unknown':' • '+pct+'% ('+mb(done)+' / '+mb(total)+')'));
  if(['complete','failed','canceled'].includes(j.status)){
   if(j.status==='complete'&&j.output_dir){lastOutput=j.output_dir;get('v0943OpenFolder').disabled=false;status('Selected IMG files saved successfully. Open Folder to view your files and SHA-256 manifest.','success')}
   else{status('Online extraction '+j.status+': '+(j.detail||'Unknown failure'),'error')}
   selectedJob='';selected();
  }
 }catch(e){ui('v0943JobState','Cannot read current job status: '+e.message+' • Retrying automatically')}
 finally{polling=false}
}
setInterval(updateJob,1300);
})();
