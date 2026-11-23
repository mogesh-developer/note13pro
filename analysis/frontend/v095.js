/* V0.9.5 Recovery tab: compact method switch and real job state. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let latestRecoveryJob='',polling=false;
window.__v095SetRecoveryJob=(id)=>{latestRecoveryJob=String(id||'');};
function setRecoveryMode(which){
 document.querySelectorAll('[data-v095-recovery]').forEach(b=>b.classList.toggle('primary',b.dataset.v095Recovery===which));
 $('v095RecoveryImagePanel').hidden=which!=='image';$('v095SideloadPanel').hidden=which!=='sideload';if($('v40HybridPanel'))$('v40HybridPanel').hidden=which!=='hybrid'; const details=$('v15RecoveryDetails');if(details)details.hidden=which==='sideload'||which==='hybrid';
}
function deviceLine(){const d=typeof device!=='undefined'?device:{};$('v095RecoveryDevice').textContent='Device: '+(d.model||'Unknown')+' • '+(d.codename||'Unknown')+' • Mode: '+(d.mode||'disconnected')+' • Bootloader: '+(d.bootloader||'Unknown')+' • Select the mode supported by this device.';}
async function status(){if(polling||!(typeof activePage!=='undefined'&&activePage==='recovery'))return;polling=true;
 try{const r=await api('/api/jobs');const jobs=(r.jobs||[]).filter(j=>/sideload|recovery|boot image|temporary boot|Manual ADB\/Fastboot Command/i.test(j.kind||''));
 jobs.sort((a,b)=>String(b.started).localeCompare(String(a.started)));const j=jobs.find(j=>j.id===latestRecoveryJob)||jobs[0];
 if(j){const t=j.total>0?Math.min(100,Math.round(100*j.done/j.total)):null;let state=$('v095RecoveryJobState');state.textContent=String(j.status||'unknown').toUpperCase();
 const p=$('v095RecoveryProgress'),f=$('v095RecoveryProgressFill');p.classList.toggle('indeterminate',t===null&&j.status==='running');f.style.width=(/sideload/i.test(j.kind||'') && ['verification_required','complete'].includes(j.status))?'100%':t===null?'0%':t+'%';
 const elapsed=Math.max(0, Math.floor((Date.now()-Date.parse(j.started||new Date().toISOString()))/1000));
 const elapsedText=j.status==='running'?' • Elapsed '+Math.floor(elapsed/60)+'m '+(elapsed%60)+'s (no fixed time limit)':'';
 const adbPct=j.phase==='sideload' && t!==null?' • ADB transfer '+t+'% (not installation %)':t!==null?' • '+t+'%':'';
 const summary=(j.kind||'Recovery operation')+' • '+(j.detail||'')+adbPct+elapsedText;window.__usbStatusUpdate?.(j);$('v095RecoveryJobDetail').textContent=summary;
 const logs=await api('/api/logs');const allLogs=logs.lines||[];
 const since=allLogs.findLastIndex(x=>x.includes('START '+j.kind));
 const output=(j.kind==='Manual ADB/Fastboot Command'?(j.lines||[]):j.kind==='Recovery ZIP Fastboot Sideload'?[...(j.lines||[]),...allLogs.slice(Math.max(0,since)).filter(x=>/FASTBOOT OUTPUT:|ADB SIDELOAD OUTPUT:|FASTBOOT STREAM ERROR|ADB SIDELOAD OUTPUT ERROR|RECOVERY ZIP/i.test(x))]:allLogs.filter(line=>/LOCAL ADB SIDELOAD|ADB SIDELOAD OUTPUT:|ADB SIDELOAD OUTPUT ERROR:|START ADB sideload|FAIL ADB sideload|TRANSFER FINISHED ADB sideload|FASTBOOT OUTPUT:|FASTBOOT STREAM ERROR:|FLASH STEP SUCCESS/i.test(line)));
 $('v095RecoveryOutput').textContent='ROM / Operation: '+j.kind+'\nJob: '+j.id+'\nStatus: '+j.status+'\n'+summary+'\n\nLIVE OPERATION LOG\n'+(output.slice(-180).join('\n')||'Waiting for device output...')+'\n\nCheck installation result on phone Recovery before declaring success.';
 }}catch(e){$('v095RecoveryJobDetail').textContent='Unable to read operation status: '+e.message;}finally{polling=false;}}
function init(){const tabBtns=[...document.querySelectorAll('[data-v095-recovery]')];if(!tabBtns.length)return;
 tabBtns.forEach(b=>b.addEventListener('click',()=>setRecoveryMode(b.dataset.v095Recovery)));
 $('v095RecoveryRefresh')?.addEventListener('click',async()=>{await scanDevice();deviceLine();});
 $('v095RecoveryCopy')?.addEventListener('click',()=>{navigator.clipboard?.writeText($('v095RecoveryOutput').textContent).catch(()=>{});});
 $('viewExtractedFiles')?.addEventListener('click',async e=>{const path=e.currentTarget.dataset.v095Output;if(!path)return; e.stopImmediatePropagation();try{await api('/api/images/view',{path,folder:true});toast('Requested Windows Explorer to show the extracted folder. Check the taskbar if hidden.','info')}catch(err){toast('Cannot open output folder: '+err.message,'error');}} ,true);
 setRecoveryMode('image');deviceLine();
 setInterval(()=>{if(typeof activePage!=='undefined'&&activePage==='recovery'){deviceLine();status()}},2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
