/* V0.9.37: read-only, independent status indicator for existing sidebar icons.
 * No job creation/cancellation and no modifications to verified device handlers. */
(()=>{'use strict';
 const states=new Map(), requests=new Map(), notices=new Map();
 let browserRunning=false;
 const buttons=new Map([...document.querySelectorAll('button.nav[data-page]')].map(b=>[b.dataset.page,b]));
 const downloadKind=k=>k==='File download'||k==='Xiaomi ROM download';
 function pageFor(kind){
  const k=String(kind||'').toLowerCase();
  if(downloadKind(kind))return 'downloads';
  if(/sideload|recovery zip|recovery image|recovery img|temporary boot/.test(k))return 'recovery';
  if(/stage fastboot/.test(k))return 'fastboot';
  if(/adb push stock image|adb pull magisk/.test(k))return 'root';
  if(/rom archive|full archive|extract|scan.*image|stock image|stock img|payload/.test(k))return 'images';
  if(/unlock|mi account|mi usb/.test(k))return 'mi-unlock';
  if(/hyperos dialer/.test(k))return 'dialer';
  if(/adb package/.test(k))return 'bloatware';
  if(/official google platform tools/.test(k))return 'settings';
  if(/bloatware|uninstall.*app/.test(k))return 'bloatware';
  if(/root|patched|adb push|adb pull/.test(k))return 'root';
  if(/fastboot.*flash|official.*flash|flash all|selected img|flash|wipe|erase|stage fastboot/.test(k))return 'fastboot';
  if(/reboot/.test(k))return 'reboot';
  if(/command/.test(k))return 'commands';
  if(/firmware|rom search/.test(k))return 'firmware';
  return 'activity';
 }
 function pageForRequest(path){
  path=String(path||'');
  if(/^\/api\/telegram\/posts$/.test(path))return null; // silent feed polling is not a user task
  if(/^\/api\/firmware\/(find|search|live)/.test(path))return 'firmware';
  if(/^\/api\/stock\//.test(path))return /flash|stage/.test(path)?'fastboot':'images';
  if(/^\/api\/archive\//.test(path))return 'images';
  if(/^\/api\/scan$/.test(path))return 'dashboard';
  if(/^\/api\/inspect$/.test(path))return 'images';
  if(/^\/api\/updates$/.test(path))return 'settings';
  if(/^\/api\/commands\//.test(path))return 'commands';
  if(/^\/api\/reboot/.test(path))return 'reboot';
  return null;
 }
 function render(){
  const current=new Map(states);
  for(const p of requests.values())if(p)current.set(p,'running');
  if(browserRunning)current.set('downloads','running');
  const now=Date.now();
  for(const [p,v] of notices){if(v.until>now&&!current.has(p))current.set(p,v.status);else if(v.until<=now)notices.delete(p);}
  for(const [p,b] of buttons){
   const state=current.get(p)||'idle';
   if(state==='idle')b.removeAttribute('data-activity');else b.dataset.activity=state;
   b.setAttribute('aria-label',b.textContent.trim()+(state==='idle'?'':' — '+state));
   b.title=state==='running'?'Operation in progress in this tab':state==='paused'?'Download paused in this tab':state==='success'?'Recent operation completed':state==='failed'?'Recent operation failed':'';
  }
 }
 function fromJobs(jobs){
  states.clear();
  const downloads=jobs.filter(j=>downloadKind(j.kind)&&(j.status==='running'||j.status==='paused'));
  const running=downloads.filter(j=>j.status==='running');
  const known=running.length>0&&running.every(j=>Number(j.total)>0);
  const nav=buttons.get('downloads');
  if(nav){
   if(known){const done=running.reduce((n,j)=>n+Number(j.done||0),0),total=running.reduce((n,j)=>n+Number(j.total||0),0);nav.style.setProperty('--v37-nav-progress',Math.max(0,Math.min(100,100*done/total))+'%');nav.dataset.progressKnown='true';}
   else{nav.style.removeProperty('--v37-nav-progress');nav.dataset.progressKnown='false';}
  }
  for(const j of jobs){
   const p=pageFor(j.kind),status=j.status;
   if(status==='running')states.set(p,'running');
   else if(status==='paused'&&!states.has(p))states.set(p,'paused');
   if(['complete','failed','canceled','verification_required'].includes(status)&&j.finished){
    const since=Date.now()-Date.parse(j.finished);
    if(since>=0&&since<7000&&!notices.has(p))notices.set(p,{status:status==='complete'?'success':'failed',until:Date.now()+Math.max(1500,5000-since)});
   }
  }
  render();
 }
 window.addEventListener('tech-office-jobs-snapshot',e=>fromJobs(e.detail?.jobs||[]));
 window.addEventListener('tech-office-request-start',e=>{const id=e.detail?.id, p=pageForRequest(e.detail?.path);if(id&&p){requests.set(id,p);render();}});
 window.addEventListener('tech-office-request-end',e=>{const id=e.detail?.id;if(!id)return;const p=requests.get(id);requests.delete(id);if(p)notices.set(p,{status:e.detail?.ok?'success':'failed',until:Date.now()+2000});render();});
 // Browser-managed protected/session downloads do not appear in /api/jobs.
 let browserPoll=false;
 async function pollBrowser(){
  if(browserPoll)return;browserPoll=true;
  try{const result=await rawAPI('/api/download-browser/state',{});
   const captures=result?.state?.captures||result?.captures||[];
   browserRunning=captures.some(c=>c.status==='browser-running');
   render();
  }catch(_){}finally{browserPoll=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{render();setInterval(render,1000);setInterval(pollBrowser,3500);});
})();
