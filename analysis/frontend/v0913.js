/* Tech Office Xiaomi Service V0.9.13: Global job indicator on the EXISTING
 * header background, not a new bar; running device jobs are server-owned. */
'use strict';
(()=>{
 let activeJob=null,polling=false,lastCompletedID='',fadeTimer=0;
 const localRequests=new Map();
 window.techOfficeRunning=()=>!!activeJob||localRequests.size>0||!!window.techOfficeMiRunning?.();
 const top=()=>document.getElementById('universalProgressHeader');
 function paint(state,pct,title){
  const bar=top();if(!bar)return;
  bar.dataset.jobState=state;
  bar.style.setProperty('--top-progress-opacity',state==='idle'?'0':state==='running'?'0.78':state==='waiting'?'0.70':'0.88');
  bar.style.setProperty('--top-progress-color',state==='error'?'#c93653':state==='success'?'#15b875':state==='waiting'?'#d18d21':'#117eb9');
  bar.style.setProperty('--top-fill',(pct===null?'100%':Math.max(0,Math.min(100,pct))+'%'));
  bar.classList.toggle('universal-progress-unknown',pct===null&&state==='running');
  bar.title=title;
  const heading=document.getElementById('headerJobTitle');if(heading)heading.title=title;
 }
 function currentJob(jobs){
  return [...jobs].filter(j=>j.status==='running').sort((a,b)=>String(b.started).localeCompare(String(a.started)))[0]||null;
 }
 async function update(){
  if(polling)return;
  polling=true;
  try{
   const response=await api('/api/jobs');const jobs=response.jobs||[];
   activeJob=currentJob(jobs); // Keep the real job for close-window safety.
   const cancelButton=document.getElementById('cancelCurrentJob');
   if(cancelButton){cancelButton.hidden=!activeJob;cancelButton.title=activeJob?'Request cancellation of '+activeJob.kind+' (if safe)':'No running operation';} 
   window.dispatchEvent(new CustomEvent('tech-office-jobs-snapshot',{detail:{jobs}}));
   const headerJob=currentJob(jobs.filter(j=>j.kind!=='File download'&&j.kind!=='Xiaomi ROM download'));
   if(headerJob){
    clearTimeout(fadeTimer);
    const j=headerJob;
    const pct=j.total>0?Math.round(j.done/j.total*100):null;
    const wait=/waiting|verify|confirmation|device recheck/i.test(j.detail||'')&&j.total<=0;
    paint(wait?'waiting':'running',pct,j.kind+' • '+(j.detail||'Running')+(pct!==null?' • '+pct+'%':' • progress not measurable'));
    return;
   }
   if(localRequests.size){const current=[...localRequests.values()][0];clearTimeout(fadeTimer);paint('running',null,'Working: '+current+' • waiting for response');return}
   const last=[...jobs].filter(j=>j.finished&&j.kind!=='File download'&&j.kind!=='Xiaomi ROM download').sort((a,b)=>String(b.finished).localeCompare(String(a.finished)))[0];
   if(last&&last.id!==lastCompletedID){
    lastCompletedID=last.id;
    const recent=Date.now()-Date.parse(last.finished)<9000;
    if(recent&&['complete','failed','verification_required'].includes(last.status)){
     const ok=last.status!=='failed';
     paint(ok?'success':'error',100,last.kind+' • '+(ok?'Host operation completed; phone-side result may need verification':'Failed: '+(last.detail||'See log')));
     clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>paint('idle',0,'No job running'),4300);
     return;
    }
   }
   const header=top();if(header&&header.dataset.jobState!=='success'&&header.dataset.jobState!=='error')paint('idle',0,'No job running');
  }catch(_){/* Keep the last known state, never invent a completion. */}
  finally{polling=false}
 }
 window.addEventListener('beforeunload',event=>{
  if(!activeJob&&!localRequests.size)return;
  event.preventDefault();event.returnValue='';
 });
 window.addEventListener('tech-office-request-start',event=>{
  const {id,path}=event.detail||{};if(!id)return;localRequests.set(id,path);
  if(!activeJob)paint('running',null,'Working: '+path+' • no measurable percentage');
 });
 window.addEventListener('tech-office-request-end',event=>{
  const id=event.detail?.id;if(!id)return;localRequests.delete(id);
  if(!activeJob&&!localRequests.size){const ok=!!event.detail?.ok;paint(ok?'success':'error',100,ok?'Request completed • detailed result is shown in its tab':'Request failed • inspect its tab for error');clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>paint('idle',0,'No job running'),2800)}
 });
 document.addEventListener('DOMContentLoaded',()=>{
  update();setInterval(update,1500);
  const cancelButton=document.getElementById('cancelCurrentJob');
  if(cancelButton)cancelButton.onclick=async()=>{
   if(!activeJob)return;
   const id=activeJob.id,kind=activeJob.kind;
   const yes=await modal('Cancel running operation?',warnBody([
    'Operation: '+kind,
    'Only operations with a verified cancellation handler can be stopped. Flashing may be dangerous to interrupt.',
    'Cancellation is a request, not proof that the operation or phone is safe.'
   ]),{accept:'Request Cancel',danger:false});
   if(!yes)return;
   try{const result=await api('/api/jobs/cancel',{id});toast(result.detail||'Cancel requested. Awaiting backend confirmation.','info');update()}
   catch(e){toast('Cancel unavailable: '+e.message,'error')}
  };

 });
})();
