/* V0.9.32: asynchronous source-bound scan with immediately visible stage/progress beside Scan Images, feeding the single extraction monitor.
   No device writes. Never invent percentages for indeterminate phases. */
(()=>{'use strict';
const el=id=>document.getElementById(id);
let scanJob='',scanSource='',scanFinished=false,scanBusy=false,scanStartedAt=0;
// Keep the scan monitor authoritative while the older generic jobs refresh
// also writes to the shared progress strip. Never pretend an idle scan is active.
let scanPhase='Opening source ROM and reading image metadata…', scanPercent=null;
let scanPollPending=false;
let extractObservedId='',extractStartedAt=0,inspectStartedAt=0,monitorLastStatus='',archiveInspectPending=false;
function elapsed(start){const seconds=Math.max(0,Math.floor((Date.now()-start)/1000));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
function clock(start,caption){const elTime=el('v33ElapsedTime');if(elTime)elTime.textContent=start?caption+' '+elapsed(start):'';}
function liveTrack(working,realPercent){
 const track=el('v09ImageProgressFill')?.parentElement;if(!track)return;
 track.classList.toggle('working',working);
 const noTotal=realPercent===null;
 track.classList.toggle('indeterminate',working&&noTotal);
 const fill=el('v09ImageProgressFill');fill.style.width=noTotal?'0%':Math.min(100,Math.max(0,realPercent))+'%';
 const progress=el('v099ProgressPercent');if(progress)progress.textContent=noTotal?(working?'Working…':'—'):Math.round(realPercent)+'%';
 track.setAttribute('role','progressbar');track.setAttribute('aria-label','Extraction operation progress');
 if(noTotal){track.removeAttribute('aria-valuenow')}else{track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(Math.round(realPercent)))}
}
function inspectHeartbeat(){
 if(el('v0945ModeOnline')?.getAttribute('aria-selected')==='true')return false;
 const summary=el('v099ArchiveSummary')?.textContent?.trim()||'';
 if(archiveInspectPending && !summary.startsWith('Inspecting archive')){
  archiveInspectPending=false;liveTrack(false,null);clock(inspectStartedAt,'Inspected in');
 }
 const s=el('v099JobStatus')?.textContent?.trim().toUpperCase()||'';
 if(archiveInspectPending || s==='INSPECTING'){
  if(!inspectStartedAt)inspectStartedAt=Date.now();
  monitorLastStatus='INSPECTING';
  el('v099JobStatus').textContent='INSPECTING';
  liveTrack(true,null);
  clock(inspectStartedAt,'Inspecting');
  el('v09ImageProgressText').textContent='Inspecting archive metadata and encryption • active '+elapsed(inspectStartedAt)+' • duration unknown';
  return true;
 }
 monitorLastStatus=s;return false;
}
async function watchExtraction(){
 if(el('v0945ModeOnline')?.getAttribute('aria-selected')==='true')return;
 if(inspectHeartbeat())return;
 const jobId=typeof v09ImageJob==='string'?v09ImageJob:'';
 if(!jobId||el('v099JobStatus')?.textContent==='INSPECTING')return;
 try{
  const r=await api('/api/jobs');const j=(r.jobs||[]).find(x=>x.id===jobId);
  if(!j||!['Extract selected stock images','Full archive unzip'].includes(j.kind))return;
  const archiveMode=el('v099ModeArchive')?.getAttribute('aria-selected')==='true';
  if(archiveMode!==(j.kind==='Full archive unzip'))return;
  if(extractObservedId!==j.id){extractObservedId=j.id;extractStartedAt=Date.now();}
  const running=j.status==='running'||j.status==='queued';
  const complete=j.status==='complete',failed=j.status==='failed',finished=complete||failed;
  const real=Number.isFinite(j.done)&&Number.isFinite(j.total)&&j.total>0?Math.round(j.done/j.total*100):complete?100:null;
  liveTrack(running,real);
  clock(extractStartedAt,finished?'Finished in':'Elapsed');
  if(running){
   const label=j.kind==='Full archive unzip'?'Unzipping archive':'Reconstructing selected IMG files';
   el('v099JobStatus').textContent='RUNNING';
   el('v09ImageProgressText').textContent=label+' • '+(j.detail||'Processing files / payload blocks…')+' • elapsed '+elapsed(extractStartedAt)+(real===null?' • Working…':' • '+real+'%');
  }else if(finished){
   el('v099JobStatus').textContent=complete?'COMPLETE':'FAILED';
   el('v09ImageProgressText').textContent=(complete?'Extraction complete':'Extraction failed')+' • '+(j.detail||'See live log')+' • elapsed '+elapsed(extractStartedAt);
  }
 }catch(_){if(extractStartedAt && el('v099JobStatus')?.textContent==='RUNNING')clock(extractStartedAt,'Elapsed • waiting for status');}
}
function scanDisplay(state,detail,percent){
 const panel=el('v32ScanActivity');if(!panel)return;panel.hidden=false;panel.dataset.state=state;
 const active=state==='scanning',completed=state==='complete',failed=state==='failed';
 panel.setAttribute('aria-busy',String(active));
 const track=el('v32ScanTrack'),fill=el('v32ScanFill');
 const real=Number.isFinite(percent)?Math.max(0,Math.min(100,percent)):null;
 track.classList.toggle('indeterminate',active&&real===null);
 if(real===null){track.removeAttribute('aria-valuenow');fill.style.width='0%';}
 else{track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(real));fill.style.width=real+'%';}
 el('v32ScanTitle').textContent=completed?'Scan Complete':failed?'Scan Failed':'Scanning ROM — please wait';
 el('v32ScanPercent').textContent=completed?'100%':real!==null?real+'%':failed?'Failed':'Working…';
 el('v32ScanPhase').textContent=detail|| (completed?'Image catalog ready.':failed?'Scan failed.':'Reading archive / payload manifest…');
}
function countCatalogText(c){const entries=c.entries||[];return entries.filter(e=>e.type==='img'||e.type==='payload-partition').length+' extractable images found in '+entries.length+' entries.';}
function scanButton(busy){const b=el('scanImages');b.disabled=busy;b.textContent=busy?'Scanning…':'Scan Images';}
// Shared visual heartbeat. Jobs may take minutes without total byte count; the
// stripe must stay animated until the real server job finishes, independent
// of older /api/jobs refresh handlers and without displaying invented %.
function scanHeartbeat(){
 if(!scanBusy || !scanStartedAt || activePage!=='images' || el('v099ModeArchive')?.getAttribute('aria-selected')==='true')return;
 const phase=scanPhase||'Reading ROM / payload metadata…';
 scanDisplay('scanning',phase,scanPercent);
 clock(scanStartedAt,'Scanning');
 liveTrack(true,scanPercent);
 el('v099JobStatus').textContent='SCANNING';
 el('v09ImageProgressText').textContent='Scanning • '+phase+' • elapsed '+elapsed(scanStartedAt)+(scanPercent===null?' • Working…':' • '+scanPercent+'%');
 const log=el('v099ExtractLog');
 if(!log.textContent.trim() || log.textContent==='No extraction started.'){
  log.textContent='SCAN STARTED: '+scanSource+'\n'+phase;
 }
}


function renderCatalog(c){
 imgCatalog=c;
 const entries=c.entries||[];
 const supported=entries.filter(e=>e.type==='img'||e.type==='payload-partition');
 const payloadCount=entries.filter(e=>e.type==='payload-partition').length;
 el('imageCount').textContent=supported.length+' extractable IMG(s)'+(payloadCount?' • '+payloadCount+' in payload.bin':'')+' / '+entries.length+' entries';
 el('imageDetails').textContent='Device: '+(c.codename||'Unknown')+' • OS: '+(c.version||'Unknown')+' • Region: '+(c.region_name||'Unknown')+'\n'+(c.warnings||[]).join('\n');
 const list=el('imageList');list.replaceChildren();
 const frag=document.createDocumentFragment();
 for(const e of entries){const row=document.createElement('label');row.className='image-row';
  const check=document.createElement('input');check.type='checkbox';check.dataset.image=e.name;check.disabled=!['img','payload-partition'].includes(e.type) && !(e.type==='payload'&&payloadCount>0);
  const detail=document.createElement('div');const title=document.createElement('strong');title.textContent=e.name;
  const sub=document.createElement('div');sub.className='pkg-detail';sub.textContent=(e.type==='payload'?'Click to extract all '+payloadCount+' available IMG(s) from payload.bin':e.type==='payload-partition'?'Payload IMG • '+e.path:e.type+' • '+e.path)+' • '+(e.size/1048576).toFixed(2)+' MB';
  if(e.type==='payload-unsupported')row.title='Not a complete reconstructable image with available decoder (incremental or missing compression support).';
  detail.append(title,sub);row.append(check,detail);frag.append(row);
 }
 list.append(frag);if(!entries.length)list.textContent='No images found in this source.';
 el('v09ImageSource').textContent='Scanned: '+c.source;
 const lines=['SCAN COMPLETE — '+supported.length+' extractable images from '+entries.length+' entries',
   payloadCount+' complete IMG(s) can be extracted from payload.bin using the same reconstruction engine as Recovery ZIP extraction.',
   'Source: '+c.source,...(c.warnings||[]),...entries.slice(0,120).map(e=>e.type+' • '+e.name+' ('+(e.size/1048576).toFixed(1)+' MB)')];
 el('v099ExtractLog').textContent=lines.join('\n');
}
async function scan(){
 const src=el('imageSourcePath').value.trim();if(!src){toast('Select ZIP/TGZ/payload.bin or ROM folder first.','error');return}
 if(scanBusy)return;
 scanBusy=true;scanFinished=false;scanSource=src;scanJob='';scanStartedAt=Date.now();scanPhase='Opening ROM and reading metadata…';scanPercent=null;v09ImageJob='';v09ResetImages();
 el('v09ImageSource').textContent='Scanning: '+src;
 scanButton(true);
 scanDisplay('scanning','Opening ROM and reading metadata…',null);clock(scanStartedAt,'Scanning');liveTrack(true,null);
 const folder=el('viewExtractedFiles');folder.disabled=true;delete folder.dataset.v095Output;
 el('v099JobStatus').textContent='SCANNING';
 el('v09ImageProgressFill').style.width='0%';el('v09ImageProgressFill').parentElement.classList.add('indeterminate');
 el('v09ImageProgressText').textContent='SCANNING ROM — PLEASE WAIT • Reading archive entries, IMG files and payload manifest';
 el('v099ProgressPercent').textContent='Working…';
 el('v099ExtractLog').textContent='SCAN STARTED: '+src+'\nArchive metadata reading in progress. Do not change the source until complete.';
 // Let Chromium draw SCANNING and the moving bar before requesting a potentially
 // slow source scan. Keep this render separate from the protected decoder.
 try{await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
 const j=await api('/api/images/scan',{path:src});
 if(scanSource!==src || !scanBusy)return;
 if(!j?.id)throw Error('The scan service did not return a job ID');
 scanJob=j.id;v09ImageJob=j.id;scanPhase='Scan started; reading ZIP/payload metadata…';}

 catch(e){if(scanSource!==src)return;scanBusy=false;scanButton(false);scanDisplay('failed',e.message,null);liveTrack(false,null);clock(scanStartedAt,'Scan finished in');el('v099JobStatus').textContent='FAILED';el('v099ExtractLog').textContent+='\nERROR: '+e.message;el('v09ImageProgressFill').parentElement.classList.remove('indeterminate');toast('Scan could not start: '+e.message,'error')}
}
async function poll(){if(activePage!=='images')return;
 if(scanBusy){scanHeartbeat();if(!scanJob || scanPollPending)return;}
 if(!scanBusy){await watchExtraction();return;}
 scanPollPending=true;
 try{
 const requestedId=scanJob;
 const info=await api('/api/jobs');if(!scanBusy||scanJob!==requestedId)return;
 const j=(info.jobs||[]).find(x=>x.id===scanJob);if(!j)return;
 if(el('imageSourcePath').value.trim()!==scanSource){scanFinished=true;scanBusy=false;scanButton(false);scanDisplay('failed','Source changed during scanning; select the intended ROM and scan again.',null);return}
 const complete=j.status==='complete';const failed=j.status==='failed';
 const percent=j.total>0?Math.max(0,Math.min(100,Math.round(j.done/j.total*100))):null;
 scanPhase=j.detail||(complete?'Scan complete.':failed?'Unknown scan error':'Scanning ROM / payload partitions…');
 scanPercent=percent;
 scanDisplay(complete?'complete':failed?'failed':'scanning',scanPhase,complete?100:percent);
 el('v099JobStatus').textContent=String(j.status).toUpperCase();liveTrack(!complete&&!failed,complete?100:percent);
 el('v09ImageProgressText').textContent=(j.detail||'Scanning ROM...')+(percent!==null?' • '+percent+'%':' • Working…')+' • elapsed '+elapsed(scanStartedAt);
 el('v099ExtractLog').textContent=['Scan job: '+j.started,...(j.lines||[]),j.detail||''].join('\n');
 if(!complete&&!failed)return;
 if(scanFinished)return;scanFinished=true;scanBusy=false;scanButton(false);
 if(complete&&j.catalog){renderCatalog(j.catalog);scanDisplay('complete',countCatalogText(j.catalog),100);liveTrack(false,100);clock(scanStartedAt,'Scan finished in');toast('Scan finished — '+(j.catalog.entries||[]).length+' entries detected.','success')}
 else{liveTrack(false,null);clock(scanStartedAt,'Scan finished in');el('v099ExtractLog').textContent+='\nSCAN FAILED: '+(j.detail||'Unknown error');toast('Scan failed: '+(j.detail||'Unknown error'),'error')}
 }catch(err){scanPhase='Waiting for scan status — checking again: '+err.message;scanPercent=null;scanHeartbeat();}
 finally{scanPollPending=false;}
}
function init(){if(!el('page-images'))return;
 // The interactive partition list and the single live log share the large
 // bottom monitor. There is no duplicated progress bar or secondary log.
 const monitor=el('v099ExtractLog').parentElement;
 const bottom=document.createElement('div');bottom.className='v101-monitor-content';
 const selection=document.createElement('section');selection.className='v101-monitor-images';
 // Move the complete existing IMG selection toolbar into the lower left pane.
 // IDs/event bindings are retained; only presentation nodes are moved.
 const original=el('imageList').closest('.v36-images-detail-source');
 if(!original)throw new Error('Stock IMG selection panel not found');
 while(original.firstChild)selection.appendChild(original.firstChild);
 original.remove();
 selection.querySelector('.panel-heading')?.classList.add('v36-images-title');
 selection.querySelector('#v09ImageSource')?.classList.add('v36-info-compact');
 selection.querySelector('#imageDetails')?.classList.add('v36-info-compact');
 selection.querySelector('#imageOutputNote')?.classList.add('v36-info-compact');
 const logPane=document.createElement('section');logPane.className='v101-monitor-log';
 const title=document.createElement('strong');title.textContent='Scan / Extraction Live Log';
 const log=el('v099ExtractLog');logPane.append(title,log);bottom.append(selection,logPane);
 monitor.insertBefore(bottom,monitor.querySelector('.action-row'));
 function setLayout(){const active=el('v099ModeArchive').getAttribute('aria-selected')==='true', online=el('v0945ModeOnline')?.getAttribute('aria-selected')==='true';bottom.classList.toggle('v101-unzip-only',active||online);selection.hidden=active||online;}
 el('v099ModeImages').addEventListener('click',setLayout);
 el('v099ModeArchive').addEventListener('click',setLayout);el('v0945ModeOnline').addEventListener('click',setLayout);setLayout();
 // Capture-phase listener prevents older generic scan handlers from taking
 // over this action if initialization order differs on an actual Windows PC.
 el('scanImages').onclick=null;
 el('scanImages').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();void scan();},true);
 el('v099InspectArchive')?.addEventListener('click',()=>{archiveInspectPending=true;inspectStartedAt=Date.now();liveTrack(true,null);clock(inspectStartedAt,'Inspecting');},true);
 const inspectOTA=el('inspectImageOTA');if(inspectOTA){inspectOTA.addEventListener('click',()=>{
  el('v099ExtractLog').textContent='OTA inspection started — reading ZIP / payload manifest...';
  el('v099JobStatus').textContent='INSPECTING';el('v09ImageProgressText').textContent='Reading OTA metadata (indeterminate duration)…';
 },true)}
 setInterval(scanHeartbeat,220);
 setInterval(poll,650);
 let lastPwdError='';setInterval(async()=>{if(activePage!=='images'||!v09ImageJob||scanBusy)return;
   try{const o=await api('/api/jobs');const j=(o.jobs||[]).find(x=>x.id===v09ImageJob);
     if(j?.status==='failed' && /password|encrypted|7-zip/i.test(j.detail||'') && j.id!==lastPwdError){
       lastPwdError=j.id;const field=el('v099ArchivePassword');field.closest('label').classList.add('v101-password-needed');
       if(el('v099ModeArchive').getAttribute('aria-selected')==='true')field.focus();
       toast('Archive extraction failed: '+j.detail+' — check password or internet and retry.','error');
     }
   }catch(_){ /* report through the existing monitor, never invent success */}
 },2400);
 el('imageSourcePath').addEventListener('input',()=>{
   if(scanBusy){scanBusy=false;scanFinished=true;scanButton(false);}
   scanSource='';scanJob='';scanPhase='';scanPercent=null;
   el('v32ScanActivity').hidden=true;clock(0,'');liveTrack(false,null);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
