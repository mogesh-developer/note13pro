/* Root/Unroot v0.9.38 — separate additive page, no changes to OEM flash handlers. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const releaseURL={magisk:'https://github.com/topjohnwu/Magisk/releases',kernelsu:'https://github.com/tiann/KernelSU/releases',ksunext:'https://github.com/KernelSU-Next/KernelSU-Next/releases',apatch:'https://github.com/bmax121/APatch/releases'};
 let mode='auto',flashID='',busy=false,flashTimer=null;
 const clean=v=>String(v||'').trim();
 function effectiveCommand(){
  const img=clean($('r38ImgPath').value)||'selected.img';
  if(mode==='auto')return `fastboot flash ${clean($('r38Partition').value)||'boot'} "${img}"`;
  return clean($('r38ManualCommand').value).replaceAll('{IMG}',img);
 }
 function preview(){$('r38CommandPreview').textContent=effectiveCommand();}
 function setMode(next){mode=next;$('r38AutoPanel').hidden=mode!=='auto';$('r38ManualPanel').hidden=mode!=='manual';$('r38AutoTab').classList.toggle('primary',mode==='auto');$('r38ManualTab').classList.toggle('primary',mode==='manual');$('r38AutoTab').setAttribute('aria-pressed',String(mode==='auto'));$('r38ManualTab').setAttribute('aria-pressed',String(mode==='manual'));preview();}
 function showDevice(d){$('r38Model').textContent=d.model||'Unknown';$('r38Codename').textContent=d.codename||'Unknown';$('r38Firmware').textContent=d.firmware||'Unknown';$('r38Android').textContent=(d.android||'Unknown')+' / '+(d.mode||'Unknown');}
 function renderSources(_rows){$('r38ResearchSources').replaceChildren();}
 async function research(){const b=$('r38DetectResearch');b.disabled=true;$('r38ResearchStatus').textContent='Scanning connected phone…';$('r38Confidence').textContent='Checking…';$('r38ResearchSources').replaceChildren();try{
  const scan=await api('/api/scan');const d=scan.device||{};showDevice(d);
  if(!d.codename||['Unknown','disconnected'].includes(d.codename)||d.demo){$('r38ResearchStatus').textContent='No verified connected codename. Connect phone and retry.';$('r38Confidence').textContent='No device';$('r38Method').textContent='Not checked';$('r38Image').textContent='—';$('r38ResearchPartition').textContent='—';return;}
  $('r38ResearchStatus').textContent='Searching root installation guides for '+d.codename+'…';
  const result=await api('/api/root/method-research',{codename:d.codename,model:d.model||'',firmware:d.firmware||'',android:d.android||'',manager:$('r38RootManager').value});
  $('r38Method').textContent=result.method||'Not verified';$('r38Image').textContent=result.image||'Not verified';$('r38ResearchPartition').textContent=result.partition||'Not verified';$('r38Confidence').textContent=result.confidence||'Unknown';$('r38ResearchStatus').textContent=result.message||'Research finished';renderSources(result.sources);
 }catch(e){$('r38ResearchStatus').textContent='Research failed: '+e.message;$('r38Confidence').textContent='Unavailable';}finally{b.disabled=false;}}
 async function downloadAPK(project,button){button.disabled=true;const old=button.textContent;button.textContent='Finding APK…';try{
  const r=await api('/api/root/download-apk',{project});toast((r.filename||'Official APK')+' added to Download Manager.','success');
  // The Download Manager owns the actual transfer, cancel/resume and save path.
 }catch(e){toast('APK download unavailable: '+e.message+'. Open official Releases.','error');window.open(releaseURL[project],'_blank','noopener,noreferrer');}finally{button.disabled=false;button.textContent=old;}}
 function setLog(text,status){$('r38FlashLog').textContent=text;$('r38LogStatus').textContent=status||'IDLE';$('r38FlashLog').scrollTop=$('r38FlashLog').scrollHeight;}
 async function pollFlash(){if(!flashID)return;try{const x=await api('/api/jobs');const j=(x.jobs||[]).find(x=>x.id===flashID);if(!j)return;
  const output=(j.lines||[]).join('\n');setLog((output||'['+j.status.toUpperCase()+'] '+(j.detail||''))+(j.detail?'\n[STATUS] '+j.detail:''),j.status.toUpperCase());$('r38FlashResult').textContent=j.detail||j.status;
  if(j.status!=='running'){flashID='';busy=false;$('r38GoFlash').disabled=false;clearInterval(flashTimer);flashTimer=null;}
 }catch(e){$('r38FlashResult').textContent='Log refresh: '+e.message;}}
 async function go(){if(busy)return;const path=clean($('r38ImgPath').value);if(!path){toast('Select IMG file first.','error');return;}const command=effectiveCommand();if(!command){toast('Enter your Fastboot command.','error');return;}
  busy=true;$('r38GoFlash').disabled=true;$('r38FlashResult').textContent='Starting Fastboot command…';setLog('[COMMAND] '+command+'\n[STATUS] Requesting execution…','STARTING');
  try{const j=await api('/api/root/flash-patched',{path,command});flashID=j.id;$('r38FlashResult').textContent='Fastboot job running';await pollFlash();if(flashID)flashTimer=setInterval(pollFlash,700);}
  catch(e){busy=false;$('r38GoFlash').disabled=false;$('r38FlashResult').textContent=e.message;setLog('[ERROR] '+e.message,'FAILED');}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('button.nav[data-page="root"]')?.addEventListener('click',()=>{const c=document.querySelector('.content');if(c)c.scrollTop=0;});
  for(const b of document.querySelectorAll('[data-r38-download]'))b.addEventListener('click',()=>downloadAPK(b.dataset.r38Download,b));
  $('r38AutoTab').onclick=()=>setMode('auto');$('r38ManualTab').onclick=()=>setMode('manual');
  $('r38ImgPath').oninput=preview;$('r38Partition').oninput=preview;$('r38ManualCommand').oninput=preview;
  $('r38BrowseImg').onclick=()=>selectFile('img','r38ImgPath').then(preview);
  $('r38ClearFlash').onclick=()=>{$('r38ImgPath').value='';preview()};
  $('r38DetectResearch').onclick=research;$('r38GoFlash').onclick=go;
  $('r38CopyLogs').onclick=()=>navigator.clipboard.writeText($('r38FlashLog').textContent).then(()=>toast('Flash log copied.','success')).catch(()=>toast('Clipboard unavailable.','error'));
  setMode('auto');
 });
})();
