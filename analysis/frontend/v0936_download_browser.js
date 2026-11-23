/* V0.9.36: native Microsoft Edge browser + CDP download-event handoff.
   Existing v0928_download_manager.js remains byte-for-byte unchanged. */
(()=>{'use strict';
const by=id=>document.getElementById(id);
const valid=url=>{try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password}catch(_){return false}};
let inspecting=false,passDirect=false,browserSave=false,opened=false,lastCaptureKey='',lastUnknown='';
const autoAttempted=new Set();
function status(message){const e=by('v36BrowserStatus');if(e)e.textContent=message;}
function safeTextHost(raw){try{const u=new URL(raw);return u.hostname+decodeURI(u.pathname).slice(0,110)}catch(_){return 'Unavailable link'}}
function unknown(message,url){lastUnknown=url;by('v36UnknownText').textContent=message;by('v36UnknownLink').hidden=false;}
function clearUnknown(){by('v36UnknownLink').hidden=true;lastUnknown='';}
function pastedLink(){return (by('v29DownloadURLs')?.value||'').trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean)[0]||'';}
async function openBrowser(url){
 if(!valid(url)){toast('Paste a website HTTP(S) URL first.','error');return;}
 const b=by('v36BrowseLink'),open=by('v36OpenBrowser');b.disabled=true;open.disabled=true;status('Opening isolated Microsoft Edge browser and connecting download detector…');
 try{
  const data=await api('/api/download-browser/open',{url});opened=true;clearUnknown();
  status('Browser connected. Browse the website, complete login/CAPTCHA if needed, and click its download link. Detected files will appear here.');
  toast('Browser launched. Return here when a download is detected.','success');
  const state=data?.state;if(state)render(state);
 }catch(e){status('Browser launch failed: '+e.message);toast('Browser launch failed: '+e.message,'error');}
 finally{b.disabled=false;open.disabled=false;}
}
async function decide(id,action){
 try{
  const data=await api('/api/download-browser/choose',{id,action});
  if(data.status==='downloading'){toast('Download started in the existing manager.','success');by('v28DownloadRefresh')?.click()}
  else if(data.status==='queued'){toast('Added Only — click Resume when ready.','success');by('v28DownloadRefresh')?.click()}
  else if(data.status==='cancelled'){toast('Download dismissed.','info')}
  await refresh();
 }catch(e){status('Could not use direct URL: '+e.message+' — for session-only downloads choose Use Browser Save, then click the link again in Edge.');toast(e.message,'error')}
}
function control(label,fn,cls=''){
 const b=document.createElement('button');b.type='button';b.className='btn tiny '+cls;b.textContent=label;
 b.addEventListener('click',async()=>{b.disabled=true;try{await fn()}finally{b.disabled=false}});return b;
}
function captureCard(c){
 const el=document.createElement('div');el.className='v36-browser-capture';el.dataset.captureId=c.id;
 const file=document.createElement('div');file.className='v36-capture-file';
 const name=document.createElement('strong');name.textContent=c.filename||'Detected download';
 const site=document.createElement('small');site.textContent=safeTextHost(c.url||'')+' · '+(c.detail||c.status);
 file.append(name,site);el.append(file);
 const buttons=document.createElement('div');buttons.className='v36-capture-actions';
 if(c.status==='pending'){
  buttons.append(control('▶ Start Download',()=>decide(c.id,'start'),'primary'));
  buttons.append(control('＋ Add Only',()=>decide(c.id,'add')));
  buttons.append(control('Cancel',()=>decide(c.id,'cancel')));
 }else{
  const stat=document.createElement('span');stat.className='pill'+((c.status==='browser-complete')?' success':'');stat.textContent=String(c.status||'').toUpperCase().replaceAll('-',' ');buttons.append(stat);
  if(c.status==='browser-running'&&c.total>0){const progress=document.createElement('small');progress.textContent=Math.round(c.received/c.total*100)+'%';buttons.append(progress)}
 }
 el.append(buttons);return el;
}
function render(state){
 const badge=by('v36BrowserBadge');if(!badge)return;
 badge.textContent=state.connected?'BROWSER CONNECTED':state.opening?'OPENING':'NOT CONNECTED';
 badge.className='pill '+(state.connected?'success':'info');
 browserSave=!!state.save_in_browser;
 const save=by('v36BrowserSave');save.textContent=browserSave?'Disable Browser Save (capturing instead)':'Use Browser Save for protected files';
 const captures=Array.isArray(state.captures)?state.captures:[];
 const list=by('v36BrowserCaptures');
 const key=JSON.stringify(captures.map(c=>[c.id,c.status,c.received,c.total,c.detail]));
 if(lastCaptureKey!==key){list.replaceChildren(...(captures.length?captures.map(captureCard):[Object.assign(document.createElement('div'),{className:'empty-placeholder',textContent:'No website download link detected yet.'})]));lastCaptureKey=key;}
 if(state.message&& !state.connected && opened)status(state.message);
 const auto=by('v36DetectMode').value==='auto';
 if(auto){const candidate=captures.find(c=>c.status==='pending'&&!autoAttempted.has(c.id));if(candidate){autoAttempted.add(candidate.id);void decide(candidate.id,'start')}}
}
async function refresh(){
 if(!by('page-downloads')?.classList.contains('shown'))return;
 try{render(await api('/api/download-browser/state',{}))}catch(_){ /* Do not show a successful connection when status is unavailable. */ }
}
function callDirectForm(){passDirect=true;by('v29DownloadForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
async function interceptPaste(ev){
 if(passDirect){passDirect=false;return}
 const values=(by('v29DownloadURLs')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 // Existing bulk direct-link workflow remains unchanged.
 if(values.length!==1||!valid(values[0])||inspecting)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 inspecting=true;const b=by('v29StartDownload');b.disabled=true;status('Checking whether the link is a direct file or a website…');clearUnknown();
 try{
  const res=await api('/api/download-browser/inspect',{url:values[0]});
  if(res.kind==='download'){status('Direct file detected. Starting with the existing Download Manager…');callDirectForm()}
  else if(res.kind==='webpage'){status('This link is a webpage. Opening native Edge to find the actual file link…');await openBrowser(values[0])}
  else{const text=res.detail||'The server did not identify a direct file.';unknown(text,values[0]);status('Link type uncertain — select Browse Page or Try Direct Download. No file was started.')}
 }catch(e){unknown('Could not verify link: '+e.message,values[0]);status('Link verification unavailable. Choose Browse Page or Try Direct Download.');}
 finally{inspecting=false;b.disabled=false}
}
async function toggleSave(){
 const next=!browserSave;
 if(next && !confirm('Browser Save mode: downloaded files will be saved by Microsoft Edge directly to your Tech Office folder, not the normal controlled queue. Use for login-only or blob/POST links. Enable?'))return;
 try{await api('/api/download-browser/mode',{browser_save:next});browserSave=next;
  status(next?'Browser Save enabled: return to Edge and click the protected site download link again. Files will save via Edge to your Tech Office folder.':'Download capture enabled: the next website download will ask Start / Add Only / Cancel.');
  await refresh();
 }catch(e){toast('Browser mode change failed: '+e.message,'error')}
}
function init(){
 if(!by('v29DownloadForm')||!by('v36BrowserPanel'))return;
 const form=by('v29DownloadForm');form.addEventListener('submit',interceptPaste,true);
 by('v36BrowseLink').addEventListener('click',()=>openBrowser(pastedLink()));
 by('v36OpenBrowser').addEventListener('click',()=>openBrowser(pastedLink()||'https://www.google.com/'));
 by('v36BrowserSave').addEventListener('click',toggleSave);
 by('v36UnknownBrowse').addEventListener('click',()=>openBrowser(lastUnknown));
 by('v36UnknownDownload').addEventListener('click',()=>{clearUnknown();callDirectForm()});
 try{const choice=localStorage.getItem('techOfficeDownloadBrowserAsk')||'ask';if(['ask','auto'].includes(choice))by('v36DetectMode').value=choice}catch(_){}
 by('v36DetectMode').addEventListener('change',()=>{try{localStorage.setItem('techOfficeDownloadBrowserAsk',by('v36DetectMode').value)}catch(_){};void refresh()});
 setInterval(refresh,1800);void refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
