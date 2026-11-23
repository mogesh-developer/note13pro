/* V0.9.31 — compact downloader with checkbox selection, individual and bulk history removal. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const mb=n=>(Number(n||0)/1048576).toFixed(1)+' MB';
const safeURL=url=>{try{const u=new URL(url);return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password&&!u.hash?u.href:null}catch(_){return null}};
const generic=j=>j.kind==='File download';
let loading=false;
let selectedIds=new Set();
let lastJobs=[];
const isDownload=j=>j.kind==='Xiaomi ROM download'||generic(j);
const isStopped=j=>j.status!=='running';
function updateSelectionCount(){
 const out=el('v31SelectedCount');if(out)out.textContent=selectedIds.size+' selected · Remove clears history, not files';
 const selected=el('v31RemoveSelected');if(selected)selected.disabled=selectedIds.size===0;
 const all=el('v31RemoveAll');if(all)all.disabled=lastJobs.length===0;
}
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
async function clipboardCopy(value){
 if(navigator.clipboard&&navigator.clipboard.writeText){try{await navigator.clipboard.writeText(value);return true}catch(_){}}
 const field=element('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.append(field);
 field.select();let copied=false;try{copied=document.execCommand('copy')}catch(_){}field.remove();return copied;
}
function btn(label,handler,variant='',disabled=false){
 const b=element('button','btn tiny '+variant,label);b.type='button';b.disabled=disabled;
 b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await handler()}finally{b.disabled=false;}});return b;
}
async function control(j,action){
 try{await api(generic(j)?'/api/downloads/control':'/api/firmware/download-control',{id:j.id,action});toast('Download '+action+' requested.','info');await refresh();}
 catch(error){toast('Download '+action+' failed: '+error.message,'error');}
}
async function retry(j,action='retry'){
 const url=safeURL(j.download_url);
 if(!url||!j.download_name){toast('Original direct download URL is unavailable.','error');return;}
 try{if(generic(j))await api('/api/downloads/control',{id:j.id,action});else await api('/api/firmware/download-retry',{id:j.id});toast('Download '+action+' started.','success');await refresh();}
 catch(error){toast('Download '+action+' failed: '+error.message,'error');}
}
async function openDownloads(j){
 const configured=(typeof cfg==='object'&&cfg&&cfg.download_dir?cfg.download_dir.replace(/[\\/]+$/,''):'');
 const dir=j?.output_dir||(configured?configured+(/[\\/]Tech_Office_Yt_Xiaomi_Service$/i.test(configured)?'':'/Tech_Office_Yt_Xiaomi_Service'):'');
 if(!dir){toast('Configure the Download Folder in Settings first.','info');return;}
 try{await api('/api/images/view',{path:dir,folder:true});toast('Opened download folder.','success')}
 catch(error){toast(error.message,'error')}
}
function renderCard(j){
 const card=element('div','v28-download-card');card.dataset.jobId=j.id;card.dataset.type=generic(j)?'file':'rom';
 const tick=element('input','v31-select-job');tick.type='checkbox';tick.checked=selectedIds.has(j.id);tick.setAttribute('aria-label','Select download '+(j.download_name||j.id));
 tick.addEventListener('change',()=>{if(tick.checked)selectedIds.add(j.id);else selectedIds.delete(j.id);updateSelectionCount()});
 const head=element('div','v28-head'),name=element('strong','v28-file',j.download_name||(generic(j)?'File download':'Xiaomi ROM download')),flag=element('span','v28-status '+j.status,String(j.status||'unknown').toUpperCase());
 head.append(tick,name,flag);card.append(head);
 const note=element('div','v28-meta');
 const parts=[generic(j)?'FILE DOWNLOAD':'XIAOMI ROM'];
 if(j.total>0){parts.push(mb(j.done)+' / '+mb(j.total));parts.push(Math.min(100,j.done/j.total*100).toFixed(1)+'%')}
 else if(j.done>0){parts.push(mb(j.done)+' downloaded')}
 if(j.status==='running'&&j.speed_bytes_per_sec>0)parts.push(mb(j.speed_bytes_per_sec)+'/s');
 if(j.started)parts.push('Started '+new Date(j.started).toLocaleString());
 note.textContent=parts.join(' · ');card.append(note);
 if(j.status==='running'||j.status==='paused'||j.status==='complete'){
  const progress=element('div','v28-progress'+(j.total<=0?' unknown':'')),fill=element('div');
  if(j.total>0)fill.style.width=Math.max(0,Math.min(100,(j.done/j.total)*100))+'%';
  else if(j.status==='complete')fill.style.width='100%';
  progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Download progress');
  if(j.total>0){progress.setAttribute('aria-valuenow',String(Math.round(j.done/j.total*100)));progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100')}
  progress.append(fill);card.append(progress);
 }
 if(j.detail)card.append(element('div','v28-notice',j.detail));
 const commands=element('div','v28-controls');
 if(j.status==='running')commands.append(btn('⏸ Pause',()=>control(j,'pause')));
 if(j.status==='paused')commands.append(btn('▶ Resume',()=>control(j,'resume'),'primary'));
 if(j.status==='running'||j.status==='paused')commands.append(btn('✕ Cancel',()=>control(j,'cancel'),'danger'));
 if(j.status==='failed'||j.status==='canceled')commands.append(btn('↻ Retry',()=>retry(j),'primary'));
 if(generic(j)&&(j.status==='failed'||j.status==='canceled'))commands.append(btn('↺ Restart from 0',()=>retry(j,'restart')));
 if(['paused','failed','canceled'].includes(j.status))commands.append(btn('✎ Update Link',()=>showLinkEditor(card,j)));
 const url=safeURL(j.download_url);
 commands.append(btn('⧉ Copy Link',async()=>{
  if(!url){toast('No reusable file URL is available for this job.','error');return;}
  const copied=await clipboardCopy(url);toast(copied?'Actual download link copied.':'Clipboard unavailable. Check Windows permissions.',copied?'success':'error');
 },'',!url));
 if(j.status==='complete')commands.append(btn('📂 Open Folder',()=>openDownloads(j)));
 if(isStopped(j))commands.append(btn('✕ Remove',()=>removeDownloads([j.id],false),'danger'));
 card.append(commands);return card;
}
// Inline editor for stopped downloads. User must explicitly confirm that a
// different source URL will restart at zero; no unverified partial mixing.
function showLinkEditor(card,j){
 if(document.querySelector('.v30-link-editor')){toast('Finish editing the current download link first.','info');return;}
 const editor=element('form','v30-link-editor');editor.setAttribute('autocomplete','off');
 const label=element('label','', 'Replace direct download URL');label.htmlFor='v30LinkInput';
 const input=element('input');input.type='url';input.id='v30LinkInput';input.value=j.download_url||'';input.required=true;input.autocomplete='off';input.spellcheck=false;input.placeholder='https://files.example.com/archive.zip';
 const warning=element('div','v30-link-warning','A verified renewal of the same file can keep downloaded bytes (matching strong ETag/known checksum). Unverified or different files may reset to 0 MB or be rejected. Click Resume after updating.');
 const row=element('div','v28-controls');
 const save=element('button','btn tiny primary','✓ Save New Link');save.type='submit';
 row.append(save,btn('Cancel Edit',()=>{editor.remove();refresh();}));
 label.append(input);editor.append(label,warning,row);card.append(editor);input.focus();input.select();
 editor.addEventListener('submit',async ev=>{
  ev.preventDefault();
  const url=safeURL(input.value.trim());
  if(!url){toast('Enter a valid public HTTP or HTTPS direct URL.','error');return;}
  if(url!==j.download_url&&j.done>0&&!confirm('The current '+mb(j.done)+' partial file may be retained if the renewed URL passes file identity checks. Different/unverifiable files may reset to 0 MB or be rejected. Continue?'))return;
  const buttons=[...editor.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{
   await api(generic(j)?'/api/downloads/control':'/api/firmware/download-control',{id:j.id,action:'update-link',url});
   editor.remove();await refresh();
   const updated=lastJobs.find(x=>x.id===j.id);
   const retained=updated&&updated.done>0&&updated.download_url===url;
   toast(retained?'Link verified; '+mb(updated.done)+' saved. Click Resume to continue.':updated&&updated.download_url===url?'Link updated. Click Resume to download from 0 MB.':'Link update submitted. Review status before Resume.','success');
  }catch(error){toast('Cannot update link: '+error.message,'error');buttons.forEach(b=>b.disabled=false)}
 });
}
async function removeDownloads(ids,all){
 const requested=all?lastJobs:lastJobs.filter(j=>ids.includes(j.id));
 if(!requested.length){toast('No downloads selected.','info');return;}
 const running=requested.filter(j=>j.status==='running');
 const eligible=requested.filter(isStopped);
 if(!eligible.length){toast('Running downloads cannot be removed. Pause or Cancel them first.','info');return;}
 const message=(all?'Remove all stopped downloads from the list?':'Remove '+eligible.length+' selected download'+(eligible.length===1?'':'s')+' from the list?')+
  '\nDownloaded and partial files on disk will NOT be deleted.'+
  (running.length?'\n'+running.length+' running download(s) will remain.':'');
 if(!confirm(message))return;
 try{
  const result=await api('/api/downloads/remove',all?{all:true}:{ids:eligible.map(j=>j.id)});
  for(const id of result.removed||[])selectedIds.delete(id);
  toast((result.removed||[]).length+' download record(s) removed.'+((result.running||[]).length?' Running jobs were kept.':''),'success');
  await refresh();
 }catch(e){toast('Cannot remove download history: '+e.message,'error')}
}
async function refresh(){
 if(loading||document.querySelector('.v30-link-editor'))return;
 const active=el('v28DownloadActive'),failed=el('v28DownloadFailed'),stats=el('v28DownloadStats');
 if(!active||!failed||!stats)return;
 loading=true;
 try{
  const result=await api('/api/jobs');
  const jobs=(result.jobs||[]).filter(isDownload).sort((a,b)=>String(b.started).localeCompare(String(a.started)));
  lastJobs=jobs;
  const ids=new Set(jobs.map(j=>j.id));for(const id of selectedIds)if(!ids.has(id))selectedIds.delete(id);
  const current=jobs.filter(j=>j.status==='running'||j.status==='paused');
  const success=jobs.filter(j=>j.status==='complete');
  const errors=jobs.filter(j=>j.status!=='running'&&j.status!=='paused'&&j.status!=='complete');
  // Completed items stay accessible without a separate empty Completed panel.
  const mixed=[...current,...success];
  for(const [target,list,empty] of [[active,mixed,'No active, paused or completed downloads.'],[failed,errors,'No failed or cancelled downloads.']]){
   target.replaceChildren(...(list.length?list.map(renderCard):[element('div','empty-placeholder',empty)]));
  }
  stats.replaceChildren(...[
   'Active: '+current.filter(j=>j.status==='running').length,
   'Paused: '+current.filter(j=>j.status==='paused').length,
   'Completed: '+success.length,
   'Failed/Cancelled: '+errors.length
  ].map(s=>element('span','',s)));
  updateSelectionCount();
 }catch(error){stats.replaceChildren(element('span','', 'Download status unavailable: '+error.message))}
 finally{loading=false}
}
async function startFromURL(event){
 event.preventDefault();
 const field=el('v29DownloadURLs'),status=el('v29StartStatus'),button=el('v29StartDownload');
 const links=field.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!links.length){toast('Paste a direct file link first.','error');return}
 if(links.length>10){toast('Maximum 10 links at a time.','error');return}
 const name=el('v29Filename').value.trim(),sha=el('v29SHA256').value.trim();
 if(links.length>1&&(name||sha)){toast('For multiple URLs, leave custom filename and SHA-256 empty.','error');return}
 for(const link of links){if(!safeURL(link)){toast('Only public HTTP or HTTPS file URLs are supported.','error');return}}
 button.disabled=true;let ok=0,errors=[];
 try{
  for(const link of links){try{await api('/api/downloads/start',{url:link,filename:name,sha256:sha});ok++}catch(e){errors.push(e.message)}}
  if(ok){status.textContent=ok+' download'+(ok===1?'':'s')+' started. Open the cards below for controls.';toast(status.textContent,'success');field.value='';await refresh()}
  if(errors.length){status.textContent='Some links were rejected: '+errors.slice(0,3).join(' | ');toast(status.textContent,'error')}
 }finally{button.disabled=false}
}
async function pasteFromClipboard(){
 try{if(!navigator.clipboard?.readText)throw new Error('Use Ctrl+V to paste');
  const value=await navigator.clipboard.readText();if(!value.trim())throw new Error('Clipboard is empty');el('v29DownloadURLs').value=value.trim();el('v29DownloadURLs').focus();}
 catch(e){toast('Paste manually with Ctrl+V: '+e.message,'info');el('v29DownloadURLs').focus()}
}
function init(){
 el('v28DownloadRefresh')?.addEventListener('click',refresh);
 el('v31SelectAll')?.addEventListener('click',()=>{lastJobs.forEach(j=>selectedIds.add(j.id));refresh();updateSelectionCount()});
 el('v31UnselectAll')?.addEventListener('click',()=>{selectedIds.clear();refresh();updateSelectionCount()});
 el('v31RemoveSelected')?.addEventListener('click',()=>removeDownloads([...selectedIds],false));
 el('v31RemoveAll')?.addEventListener('click',()=>removeDownloads([],true));
 updateSelectionCount();
 el('v29DownloadForm')?.addEventListener('submit',startFromURL);
 el('v29PasteURL')?.addEventListener('click',pasteFromClipboard);
 el('v29OpenFolder')?.addEventListener('click',()=>openDownloads());
 const dest=(typeof cfg==='object'&&cfg&&cfg.download_dir)||'';
 if(dest)el('v29DownloadDestination').textContent='Save folder: '+dest;
 window.v28RefreshDownloads=refresh;
 setInterval(()=>{if(el('page-downloads')?.classList.contains('shown'))refresh()},1700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
